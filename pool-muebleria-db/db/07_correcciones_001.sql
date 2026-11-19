-- Migración 001 · 2026-11-19 · Corrige pagos, cancelaciones y permisos
--   A. No se puede cobrar más que el total del pedido.
--   B. No se cancela un pedido con un comprobante en revisión, ni se confirman
--      pagos de pedidos cancelados o entregados.
--   C. La aplicación (pool_app) ya no puede escribir directo en pedidos, pagos
--      ni roles: solo a través de las funciones.
BEGIN;

-- ---------- A. registrar_pago: el saldo también descuenta lo que está en revisión ----------
CREATE OR REPLACE FUNCTION registrar_pago(
    p_pedido_id        bigint,
    p_tipo             tipo_pago,
    p_monto            numeric,
    p_metodo_clave     text DEFAULT 'transferencia',
    p_referencia       text DEFAULT NULL,
    p_comprobante_url  text DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

    -- Saldo = total − confirmado − comprobantes que siguen en revisión
    v_saldo := v_pedido.total - pagado_neto(p_pedido_id)
             - coalesce((SELECT sum(monto) FROM pago
                         WHERE pedido_id = p_pedido_id AND estado = 'pendiente' AND tipo <> 'reembolso'), 0);
    IF p_monto IS NULL OR p_monto <= 0 OR p_monto > v_saldo THEN
        RAISE EXCEPTION 'Monto inválido: % (saldo pendiente del pedido, sin contar pagos en revisión: %)', p_monto, v_saldo;
    END IF;

    INSERT INTO pago (pedido_id, tipo, monto, metodo_pago_id, referencia, comprobante_url)
    VALUES (p_pedido_id, p_tipo, p_monto, v_metodo_id, p_referencia, p_comprobante_url)
    RETURNING id INTO v_pago_id;

    RETURN v_pago_id;
END;
$$;

-- ---------- A y B. confirmar_pago: revisa saldo y estado antes de confirmar ----------
CREATE OR REPLACE FUNCTION confirmar_pago(p_pago_id bigint, p_admin_id bigint) RETURNS estado_pedido
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

    IF v_pago.tipo <> 'reembolso' THEN
        -- B. Un pedido cancelado o entregado ya no recibe pagos
        IF v_pedido.estado IN ('cancelado', 'entregado') THEN
            RAISE EXCEPTION 'El pedido % está %: rechaza este pago y, si el dinero llegó, devuélvelo', v_pedido.folio, v_pedido.estado;
        END IF;
        -- A. Nunca se confirma más que el total
        IF pagado_neto(v_pedido_id) + v_pago.monto > v_pedido.total THEN
            RAISE EXCEPTION 'Confirmar este pago dejaría el pedido % pagado de más (total %, ya pagado %)',
                            v_pedido.folio, v_pedido.total, pagado_neto(v_pedido_id);
        END IF;
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

-- ---------- B. cancelar_pedido: no cancela con comprobantes en revisión ----------
CREATE OR REPLACE FUNCTION cancelar_pedido(p_pedido_id bigint, p_solicitante_id bigint, p_motivo text DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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
    IF EXISTS (SELECT 1 FROM pago WHERE pedido_id = p_pedido_id AND estado = 'pendiente' AND tipo <> 'reembolso') THEN
        RAISE EXCEPTION 'El pedido % tiene un pago en revisión: primero debe confirmarse o rechazarse', v_pedido.folio;
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

-- ---------- C. Las demás funciones de pedidos corren con permisos de su dueño ----------
ALTER FUNCTION crear_pedido(bigint, plan_pago, bigint, numeric)  SECURITY DEFINER SET search_path = public, pg_temp;
ALTER FUNCTION rechazar_pago(bigint, bigint)                     SECURITY DEFINER SET search_path = public, pg_temp;
ALTER FUNCTION avanzar_produccion(bigint, bigint)                SECURITY DEFINER SET search_path = public, pg_temp;
ALTER FUNCTION entregar_pedido(bigint, bigint)                   SECURITY DEFINER SET search_path = public, pg_temp;

-- Solo pool_app puede llamarlas (por defecto cualquier usuario podía)
REVOKE EXECUTE ON FUNCTION
    crear_pedido(bigint, plan_pago, bigint, numeric),
    registrar_pago(bigint, tipo_pago, numeric, text, text, text),
    confirmar_pago(bigint, bigint), rechazar_pago(bigint, bigint),
    avanzar_produccion(bigint, bigint), entregar_pedido(bigint, bigint),
    cancelar_pedido(bigint, bigint, text)
    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
    crear_pedido(bigint, plan_pago, bigint, numeric),
    registrar_pago(bigint, tipo_pago, numeric, text, text, text),
    confirmar_pago(bigint, bigint), rechazar_pago(bigint, bigint),
    avanzar_produccion(bigint, bigint), entregar_pedido(bigint, bigint),
    cancelar_pedido(bigint, bigint, text)
    TO pool_app;

-- La historia del negocio solo se escribe a través de las funciones
REVOKE INSERT, UPDATE ON pedido, pedido_item, pedido_item_opcion, pago, pedido_historial, cancelacion
    FROM pool_app;

-- Usuarios: la aplicación registra y edita datos, pero nunca el rol
REVOKE INSERT, UPDATE ON usuario FROM pool_app;
GRANT INSERT (nombre, correo, password_hash, telefono, fecha_nacimiento, acepto_terminos_en) ON usuario TO pool_app;
GRANT UPDATE (nombre, correo, password_hash, telefono, fecha_nacimiento, activo)              ON usuario TO pool_app;

COMMIT;
