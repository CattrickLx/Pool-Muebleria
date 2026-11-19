-- Pool Mueblería (Dara) · lógica de negocio
-- Cada función es una operación completa: o se hace toda o no se hace nada.
-- El backend solo las llama; no necesita repetir estas reglas.

-- ¿El usuario es administrador activo?
CREATE FUNCTION es_admin(p_usuario_id bigint) RETURNS boolean
LANGUAGE sql STABLE AS $$
    SELECT EXISTS (SELECT 1 FROM usuario WHERE id = p_usuario_id AND rol = 'admin' AND activo);
$$;

-- Suma días hábiles (lunes a viernes). No considera días festivos.
CREATE FUNCTION sumar_dias_habiles(p_desde date, p_dias integer) RETURNS date
LANGUAGE sql STABLE AS $$
    SELECT d::date
    FROM generate_series(p_desde::timestamp + interval '1 day',
                         p_desde::timestamp + make_interval(days => p_dias * 2 + 7),
                         interval '1 day') AS d
    WHERE extract(isodow FROM d) < 6
    ORDER BY d
    OFFSET p_dias - 1 LIMIT 1;
$$;

-- Total pagado de un pedido: pagos confirmados menos reembolsos confirmados.
CREATE FUNCTION pagado_neto(p_pedido_id bigint) RETURNS numeric
LANGUAGE sql STABLE AS $$
    SELECT coalesce(sum(CASE WHEN tipo = 'reembolso' THEN -monto ELSE monto END), 0)
    FROM pago
    WHERE pedido_id = p_pedido_id AND estado = 'confirmado';
$$;

-- ---------------------------------------------------------------------------
-- Convierte el carrito del usuario en un pedido.
--   · Valida que cada mueble tenga una opción elegida en todos sus grupos.
--   · Copia nombres y precios al pedido (ya no dependen del catálogo).
--   · Si existe una unidad terminada con esa misma configuración, la aparta
--     de la existencia; si no, el mueble entra a la cola de producción.
--   · Vacía el carrito (no toca "Tus selecciones").
-- Devuelve el id del pedido.
-- ---------------------------------------------------------------------------
CREATE FUNCTION crear_pedido(
    p_usuario_id    bigint,
    p_plan          plan_pago,
    p_direccion_id  bigint,
    p_costo_envio   numeric DEFAULT 0
) RETURNS bigint
LANGUAGE plpgsql AS $$
DECLARE
    v_usuario      usuario%ROWTYPE;
    v_dir          direccion%ROWTYPE;
    v_pedido_id    bigint;
    v_item         record;
    v_item_id      bigint;
    v_variante_id  bigint;
    v_precio       numeric(10,2);
    v_subtotal     numeric(10,2) := 0;
    v_items        integer := 0;
    v_grupos       integer;
    v_elegidas     integer;
BEGIN
    SELECT * INTO v_usuario FROM usuario WHERE id = p_usuario_id AND activo;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El usuario % no existe o está inactivo', p_usuario_id;
    END IF;

    SELECT * INTO v_dir FROM direccion WHERE id = p_direccion_id AND usuario_id = p_usuario_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La dirección % no pertenece al usuario', p_direccion_id;
    END IF;

    INSERT INTO pedido (usuario_id, plan, porcentaje_anticipo, subtotal, costo_envio,
                        entrega_destinatario, entrega_telefono, entrega_direccion, entrega_codigo_postal)
    VALUES (p_usuario_id, p_plan,
            CASE WHEN p_plan = 'pago_completo' THEN 100 ELSE 80 END,
            0, p_costo_envio,
            v_usuario.nombre, v_usuario.telefono,
            concat_ws(', ',
                      v_dir.calle || ' ' || v_dir.numero_ext || coalesce(' int. ' || v_dir.numero_int, ''),
                      v_dir.colonia, v_dir.municipio, v_dir.estado),
            v_dir.codigo_postal)
    RETURNING id INTO v_pedido_id;

    FOR v_item IN
        SELECT ci.id, ci.producto_id, ci.cantidad, pr.nombre, pr.precio_base, pr.activo
        FROM carrito_item ci
        JOIN producto pr ON pr.id = ci.producto_id
        WHERE ci.usuario_id = p_usuario_id AND NOT ci.guardado
        ORDER BY ci.id
        FOR UPDATE OF ci
    LOOP
        v_items := v_items + 1;

        IF NOT v_item.activo THEN
            RAISE EXCEPTION 'El producto "%" ya no está disponible', v_item.nombre;
        END IF;

        -- Una opción vigente por cada grupo que ofrece el producto
        SELECT count(DISTINCT grupo_id) INTO v_grupos
        FROM producto_opcion
        WHERE producto_id = v_item.producto_id AND activo;

        SELECT count(*) INTO v_elegidas
        FROM carrito_item_opcion co
        JOIN producto_opcion po ON po.producto_id = co.producto_id AND po.opcion_id = co.opcion_id
        WHERE co.carrito_item_id = v_item.id AND po.activo;

        IF v_elegidas <> v_grupos
           OR v_elegidas <> (SELECT count(*) FROM carrito_item_opcion WHERE carrito_item_id = v_item.id) THEN
            RAISE EXCEPTION 'La configuración de "%" está incompleta o tiene opciones que ya no se ofrecen', v_item.nombre;
        END IF;

        SELECT v_item.precio_base + coalesce(sum(po.precio_extra), 0) INTO v_precio
        FROM carrito_item_opcion co
        JOIN producto_opcion po ON po.producto_id = co.producto_id AND po.opcion_id = co.opcion_id
        WHERE co.carrito_item_id = v_item.id;

        -- ¿Hay unidades terminadas con exactamente esta configuración?
        SELECT v.id INTO v_variante_id
        FROM variante v
        WHERE v.producto_id = v_item.producto_id
          AND v.existencia >= v_item.cantidad
          AND (SELECT count(*) FROM variante_opcion vo WHERE vo.variante_id = v.id) = v_elegidas
          AND NOT EXISTS (
                SELECT 1 FROM carrito_item_opcion co
                WHERE co.carrito_item_id = v_item.id
                  AND NOT EXISTS (SELECT 1 FROM variante_opcion vo
                                  WHERE vo.variante_id = v.id AND vo.opcion_id = co.opcion_id))
        ORDER BY v.id
        LIMIT 1
        FOR UPDATE OF v;

        IF FOUND THEN
            UPDATE variante SET existencia = existencia - v_item.cantidad WHERE id = v_variante_id;
        ELSE
            v_variante_id := NULL;
        END IF;

        INSERT INTO pedido_item (pedido_id, producto_id, variante_id, nombre_producto,
                                 precio_base, precio_unitario, cantidad, estado_produccion)
        VALUES (v_pedido_id, v_item.producto_id, v_variante_id, v_item.nombre,
                v_item.precio_base, v_precio, v_item.cantidad,
                CASE WHEN v_variante_id IS NULL THEN 'en_cola' ELSE 'terminado' END::estado_produccion)
        RETURNING id INTO v_item_id;

        INSERT INTO pedido_item_opcion (pedido_item_id, grupo_id, opcion_id, nombre_grupo, nombre_opcion, precio_extra)
        SELECT v_item_id, co.grupo_id, co.opcion_id, g.nombre, o.nombre, po.precio_extra
        FROM carrito_item_opcion co
        JOIN producto_opcion po ON po.producto_id = co.producto_id AND po.opcion_id = co.opcion_id
        JOIN opcion o ON o.id = co.opcion_id
        JOIN grupo_opcion g ON g.id = co.grupo_id
        WHERE co.carrito_item_id = v_item.id;

        v_subtotal := v_subtotal + v_precio * v_item.cantidad;
    END LOOP;

    IF v_items = 0 THEN
        RAISE EXCEPTION 'El carrito está vacío';
    END IF;

    UPDATE pedido SET subtotal = v_subtotal WHERE id = v_pedido_id;

    INSERT INTO pedido_historial (pedido_id, estado, nota, usuario_id)
    VALUES (v_pedido_id, 'pendiente_anticipo', 'Pedido creado', p_usuario_id);

    DELETE FROM carrito_item WHERE usuario_id = p_usuario_id AND NOT guardado;

    RETURN v_pedido_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- El cliente avisa que hizo un pago (por ejemplo, sube su comprobante de
-- transferencia). Queda "pendiente" hasta que un administrador lo confirme.
-- Devuelve el id del pago.
-- ---------------------------------------------------------------------------
CREATE FUNCTION registrar_pago(
    p_pedido_id        bigint,
    p_tipo             tipo_pago,
    p_monto            numeric,
    p_metodo_clave     text DEFAULT 'transferencia',
    p_referencia       text DEFAULT NULL,
    p_comprobante_url  text DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql AS $$
DECLARE
    v_pedido     pedido%ROWTYPE;
    v_metodo_id  smallint;
    v_saldo      numeric(10,2);
    v_pago_id    bigint;
BEGIN
    IF p_tipo = 'reembolso' THEN
        RAISE EXCEPTION 'Los reembolsos se generan al cancelar el pedido, no aquí';
    END IF;

    SELECT * INTO v_pedido FROM pedido WHERE id = p_pedido_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El pedido % no existe', p_pedido_id;
    END IF;
    IF v_pedido.estado IN ('cancelado', 'entregado') THEN
        RAISE EXCEPTION 'El pedido % está %, ya no admite pagos', v_pedido.folio, v_pedido.estado;
    END IF;

    SELECT id INTO v_metodo_id FROM metodo_pago WHERE clave = p_metodo_clave AND activo;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El método de pago "%" no existe o está desactivado', p_metodo_clave;
    END IF;

    v_saldo := v_pedido.total - pagado_neto(p_pedido_id);
    IF p_monto IS NULL OR p_monto <= 0 OR p_monto > v_saldo THEN
        RAISE EXCEPTION 'Monto inválido: % (saldo pendiente del pedido: %)', p_monto, v_saldo;
    END IF;

    INSERT INTO pago (pedido_id, tipo, monto, metodo_pago_id, referencia, comprobante_url)
    VALUES (p_pedido_id, p_tipo, p_monto, v_metodo_id, p_referencia, p_comprobante_url)
    RETURNING id INTO v_pago_id;

    RETURN v_pago_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Un administrador confirma que el dinero sí llegó (o que el reembolso ya se
-- envió). Si con este pago se cubre el anticipo, el pedido arranca:
-- pasa a producción y se calcula la fecha estimada de entrega.
-- Devuelve el estado en que quedó el pedido.
-- ---------------------------------------------------------------------------
CREATE FUNCTION confirmar_pago(p_pago_id bigint, p_admin_id bigint) RETURNS estado_pedido
LANGUAGE plpgsql AS $$
DECLARE
    v_pedido_id  bigint;
    v_pedido     pedido%ROWTYPE;
    v_pago       pago%ROWTYPE;
    v_dias       integer;
    v_nuevo      estado_pedido;
BEGIN
    IF NOT es_admin(p_admin_id) THEN
        RAISE EXCEPTION 'Solo un administrador puede confirmar pagos';
    END IF;

    SELECT pedido_id INTO v_pedido_id FROM pago WHERE id = p_pago_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El pago % no existe', p_pago_id;
    END IF;

    -- Siempre se bloquea primero el pedido y después el pago (evita interbloqueos)
    SELECT * INTO v_pedido FROM pedido WHERE id = v_pedido_id FOR UPDATE;
    SELECT * INTO v_pago   FROM pago   WHERE id = p_pago_id   FOR UPDATE;

    IF v_pago.estado <> 'pendiente' THEN
        RAISE EXCEPTION 'El pago % ya fue %', p_pago_id, v_pago.estado;
    END IF;

    UPDATE pago
    SET estado = 'confirmado', confirmado_en = now(), confirmado_por = p_admin_id
    WHERE id = p_pago_id;

    v_nuevo := v_pedido.estado;

    IF v_pedido.estado = 'pendiente_anticipo'
       AND pagado_neto(v_pedido_id) >= round(v_pedido.total * v_pedido.porcentaje_anticipo / 100, 2) THEN

        SELECT max(pr.dias_produccion_max) INTO v_dias
        FROM pedido_item i
        JOIN producto pr ON pr.id = i.producto_id
        WHERE i.pedido_id = v_pedido_id AND i.estado_produccion <> 'terminado';

        IF v_dias IS NULL THEN
            v_nuevo := 'listo_para_entrega';      -- todo salió de existencia
            UPDATE pedido SET estado = v_nuevo WHERE id = v_pedido_id;
        ELSE
            v_nuevo := 'en_produccion';
            UPDATE pedido
            SET estado = v_nuevo,
                fecha_entrega_estimada = sumar_dias_habiles(current_date, v_dias)
            WHERE id = v_pedido_id;
        END IF;

        INSERT INTO pedido_historial (pedido_id, estado, nota, usuario_id)
        VALUES (v_pedido_id, v_nuevo, 'Anticipo confirmado', p_admin_id);
    END IF;

    RETURN v_nuevo;
END;
$$;

-- Un administrador rechaza un pago que no pudo comprobar.
CREATE FUNCTION rechazar_pago(p_pago_id bigint, p_admin_id bigint) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    IF NOT es_admin(p_admin_id) THEN
        RAISE EXCEPTION 'Solo un administrador puede rechazar pagos';
    END IF;

    UPDATE pago SET estado = 'rechazado' WHERE id = p_pago_id AND estado = 'pendiente';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El pago % no existe o ya no está pendiente', p_pago_id;
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Avanza un mueble un paso en el taller: en_cola -> en_fabricacion -> terminado.
-- Cuando todos los muebles del pedido están terminados, el pedido pasa a
-- "listo_para_entrega". Devuelve el estado en que quedó el mueble.
-- ---------------------------------------------------------------------------
CREATE FUNCTION avanzar_produccion(p_pedido_item_id bigint, p_admin_id bigint) RETURNS estado_produccion
LANGUAGE plpgsql AS $$
DECLARE
    v_pedido_id  bigint;
    v_pedido     pedido%ROWTYPE;
    v_item       pedido_item%ROWTYPE;
    v_nuevo      estado_produccion;
BEGIN
    IF NOT es_admin(p_admin_id) THEN
        RAISE EXCEPTION 'Solo un administrador puede mover la cola de producción';
    END IF;

    SELECT pedido_id INTO v_pedido_id FROM pedido_item WHERE id = p_pedido_item_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El artículo % no existe', p_pedido_item_id;
    END IF;

    SELECT * INTO v_pedido FROM pedido      WHERE id = v_pedido_id      FOR UPDATE;
    SELECT * INTO v_item   FROM pedido_item WHERE id = p_pedido_item_id FOR UPDATE;

    IF v_pedido.estado <> 'en_produccion' THEN
        RAISE EXCEPTION 'El pedido % está "%": no se puede fabricar', v_pedido.folio, v_pedido.estado;
    END IF;

    IF v_item.estado_produccion = 'en_cola' THEN
        v_nuevo := 'en_fabricacion';
        UPDATE pedido_item SET estado_produccion = v_nuevo, produccion_inicio = now() WHERE id = p_pedido_item_id;
    ELSIF v_item.estado_produccion = 'en_fabricacion' THEN
        v_nuevo := 'terminado';
        UPDATE pedido_item SET estado_produccion = v_nuevo, produccion_fin = now() WHERE id = p_pedido_item_id;
    ELSE
        RAISE EXCEPTION 'El artículo % ya está terminado', p_pedido_item_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pedido_item WHERE pedido_id = v_pedido_id AND estado_produccion <> 'terminado') THEN
        UPDATE pedido SET estado = 'listo_para_entrega' WHERE id = v_pedido_id;
        INSERT INTO pedido_historial (pedido_id, estado, nota, usuario_id)
        VALUES (v_pedido_id, 'listo_para_entrega', 'Producción terminada', p_admin_id);
    END IF;

    RETURN v_nuevo;
END;
$$;

-- Marca el pedido como entregado. Exige que ya esté liquidado al 100 %.
CREATE FUNCTION entregar_pedido(p_pedido_id bigint, p_admin_id bigint) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
    v_pedido  pedido%ROWTYPE;
    v_saldo   numeric(10,2);
BEGIN
    IF NOT es_admin(p_admin_id) THEN
        RAISE EXCEPTION 'Solo un administrador puede registrar entregas';
    END IF;

    SELECT * INTO v_pedido FROM pedido WHERE id = p_pedido_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El pedido % no existe', p_pedido_id;
    END IF;
    IF v_pedido.estado <> 'listo_para_entrega' THEN
        RAISE EXCEPTION 'El pedido % está "%": aún no se puede entregar', v_pedido.folio, v_pedido.estado;
    END IF;

    v_saldo := v_pedido.total - pagado_neto(p_pedido_id);
    IF v_saldo > 0 THEN
        RAISE EXCEPTION 'El pedido % tiene un saldo pendiente de %', v_pedido.folio, v_saldo;
    END IF;

    UPDATE pedido SET estado = 'entregado', entregado_en = now() WHERE id = p_pedido_id;
    INSERT INTO pedido_historial (pedido_id, estado, nota, usuario_id)
    VALUES (p_pedido_id, 'entregado', 'Entregado al cliente', p_admin_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Cancela un pedido aplicando la política vigente (politica_cancelacion).
--   · Puede cancelarlo su dueño o un administrador.
--   · Congela los montos en "cancelacion".
--   · Si hay algo que devolver, crea un reembolso PENDIENTE: el administrador
--     lo confirma con confirmar_pago() cuando ya hizo la transferencia.
--   · Regresa a la existencia los muebles que habían salido de ahí.
-- Devuelve el monto a reembolsar.
-- ---------------------------------------------------------------------------
CREATE FUNCTION cancelar_pedido(p_pedido_id bigint, p_solicitante_id bigint, p_motivo text DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql AS $$
DECLARE
    v_pedido  pedido%ROWTYPE;
    v_est     record;
BEGIN
    SELECT * INTO v_pedido FROM pedido WHERE id = p_pedido_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El pedido % no existe', p_pedido_id;
    END IF;
    IF v_pedido.usuario_id <> p_solicitante_id AND NOT es_admin(p_solicitante_id) THEN
        RAISE EXCEPTION 'Solo el cliente del pedido o un administrador pueden cancelarlo';
    END IF;
    IF v_pedido.estado IN ('cancelado', 'entregado') THEN
        RAISE EXCEPTION 'El pedido % ya está %', v_pedido.folio, v_pedido.estado;
    END IF;

    SELECT * INTO v_est FROM v_cancelacion_estimada WHERE pedido_id = p_pedido_id;

    INSERT INTO cancelacion (pedido_id, etapa, porcentaje_retencion, monto_pagado, monto_retenido, motivo, solicitada_por)
    VALUES (p_pedido_id, v_est.etapa, v_est.porcentaje_retencion, v_est.pagado, v_est.monto_retenido, p_motivo, p_solicitante_id);

    IF v_est.monto_reembolso > 0 THEN
        INSERT INTO pago (pedido_id, tipo, monto, metodo_pago_id)
        SELECT p_pedido_id, 'reembolso', v_est.monto_reembolso, id
        FROM metodo_pago WHERE clave = 'transferencia';
    END IF;

    UPDATE variante v
    SET existencia = v.existencia + s.unidades
    FROM (SELECT variante_id, sum(cantidad) AS unidades
          FROM pedido_item
          WHERE pedido_id = p_pedido_id AND variante_id IS NOT NULL
          GROUP BY variante_id) s
    WHERE v.id = s.variante_id;

    UPDATE pedido SET estado = 'cancelado' WHERE id = p_pedido_id;
    INSERT INTO pedido_historial (pedido_id, estado, nota, usuario_id)
    VALUES (p_pedido_id, 'cancelado', coalesce(p_motivo, 'Cancelado'), p_solicitante_id);

    RETURN v_est.monto_reembolso;
END;
$$;
