-- Pool Mueblería (Dara) · prueba de principio a fin
-- Recorre el ciclo completo de un pedido con las funciones de 02_funciones.sql,
-- usando los permisos del usuario de la aplicación (pool_app).
-- Todo ocurre dentro de una transacción que al final se deshace: no deja datos.
--
-- Requiere los datos de 05_catalogo.sql y 06_datos_prueba.sql.
\set ON_ERROR_STOP on
\set QUIET on
\pset tuples_only on

BEGIN;
SET LOCAL ROLE pool_app;

CREATE FUNCTION pg_temp.afirmar(p_ok boolean, p_que text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
    IF p_ok IS NOT TRUE THEN RAISE EXCEPTION 'FALLÓ: %', p_que; END IF;
    RETURN '  ok  ' || p_que;
END $$;

-- Ejecuta una sentencia que DEBE fallar; si no falla, la prueba truena.
CREATE FUNCTION pg_temp.debe_fallar(p_sql text, p_que text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
    BEGIN
        EXECUTE p_sql;
    EXCEPTION WHEN OTHERS THEN
        RETURN '  ok  ' || p_que || '  →  ' || SQLERRM;
    END;
    RAISE EXCEPTION 'FALLÓ: se esperaba un error en: %', p_que;
END $$;

SELECT id AS cliente FROM usuario WHERE correo = 'cliente@poolmuebleria.test' \gset
SELECT id AS admin   FROM usuario WHERE correo = 'admin@poolmuebleria.test' \gset
SELECT id AS dir     FROM direccion WHERE usuario_id = :cliente LIMIT 1 \gset
SELECT id AS oslo    FROM producto WHERE slug = 'sofa-modular-oslo' \gset
SELECT id AS nordico FROM producto WHERE slug = 'sillon-nordico' \gset

\echo
\echo '1. Carrito: Sofá Oslo en L con terciopelo'
INSERT INTO carrito_item (usuario_id, producto_id) VALUES (:cliente, :oslo) RETURNING id AS item \gset
INSERT INTO carrito_item_opcion (carrito_item_id, producto_id, opcion_id, grupo_id)
SELECT :item, :oslo, o.id, o.grupo_id FROM opcion o WHERE o.nombre = 'Modular en L (4 Plazas)';

SELECT pg_temp.debe_fallar(format('SELECT crear_pedido(%s, ''anticipo'', %s)', :cliente, :dir),
                           'no deja comprar si falta elegir el acabado');

INSERT INTO carrito_item_opcion (carrito_item_id, producto_id, opcion_id, grupo_id)
SELECT :item, :oslo, o.id, o.grupo_id FROM opcion o WHERE o.nombre = 'Terciopelo Esmeralda';

SELECT pg_temp.afirmar(precio_unitario = 17300, 'precio configurado = 12,500 + 4,000 + 800 = 17,300')
FROM v_carrito WHERE carrito_item_id = :item;

\echo
\echo '2. Pedido con plan 80/20'
SELECT crear_pedido(:cliente, 'anticipo', :dir) AS pedido \gset
SELECT pg_temp.afirmar(total = 17300 AND anticipo_requerido = 13840 AND saldo = 17300 AND estado = 'pendiente_anticipo',
                       'total 17,300 · anticipo requerido 13,840 · nada pagado')
FROM v_mis_pedidos WHERE pedido_id = :pedido;
SELECT pg_temp.afirmar(count(*) = 0, 'el carrito quedó vacío') FROM v_carrito WHERE usuario_id = :cliente AND NOT guardado;
SELECT pg_temp.afirmar(configuracion = 'Tamaño: Modular en L (4 Plazas) · Acabado: Terciopelo Esmeralda' AND NOT de_existencia,
                       'el pedido guarda la configuración elegida')
FROM v_pedido_detalle WHERE pedido_id = :pedido;

\echo
\echo '3. Anticipo por transferencia'
SELECT pg_temp.debe_fallar(format('SELECT registrar_pago(%s, ''anticipo'', 99999)', :pedido), 'no acepta pagar más que el saldo');
SELECT registrar_pago(:pedido, 'anticipo', 13840, 'transferencia', 'SPEI-0001', '/comprobantes/0001.jpg') AS pago \gset
SELECT pg_temp.afirmar(pagado = 0 AND estado = 'pendiente_anticipo', 'un pago sin confirmar no cuenta')
FROM v_mis_pedidos WHERE pedido_id = :pedido;
SELECT pg_temp.debe_fallar(format('SELECT confirmar_pago(%s, %s)', :pago, :cliente), 'un cliente no puede confirmar pagos');
SELECT pg_temp.afirmar(confirmar_pago(:pago, :admin) = 'en_produccion', 'al confirmar el anticipo el pedido pasa a producción');
SELECT pg_temp.afirmar(pagado = 13840 AND saldo = 3460 AND fecha_entrega_estimada > current_date,
                       'saldo 3,460 y fecha estimada de entrega calculada')
FROM v_mis_pedidos WHERE pedido_id = :pedido;
SELECT pg_temp.debe_fallar(format('SELECT confirmar_pago(%s, %s)', :pago, :admin), 'un pago no se confirma dos veces');

\echo
\echo '4. Producción y estimación de cancelación'
SELECT pedido_item_id AS pitem FROM v_cola_produccion WHERE folio = (SELECT folio FROM pedido WHERE id = :pedido) \gset
SELECT pg_temp.afirmar(monto_reembolso = 13840, 'en cola: se devolvería todo') FROM v_cancelacion_estimada WHERE pedido_id = :pedido;
SELECT pg_temp.afirmar(avanzar_produccion(:pitem, :admin) = 'en_fabricacion', 'el mueble entra a fabricación');
SELECT pg_temp.afirmar(monto_retenido = 5190 AND monto_reembolso = 8650, 'en fabricación: retiene 30 % (5,190), devuelve 8,650')
FROM v_cancelacion_estimada WHERE pedido_id = :pedido;
SELECT pg_temp.afirmar(avanzar_produccion(:pitem, :admin) = 'terminado', 'el mueble queda terminado');
SELECT pg_temp.afirmar(estado = 'listo_para_entrega', 'el pedido queda listo para entrega') FROM pedido WHERE id = :pedido;

\echo
\echo '5. Liquidación y entrega'
SELECT pg_temp.debe_fallar(format('SELECT entregar_pedido(%s, %s)', :pedido, :admin), 'no se entrega con saldo pendiente');
SELECT registrar_pago(:pedido, 'liquidacion', 3460) AS pago2 \gset
SELECT pg_temp.afirmar(confirmar_pago(:pago2, :admin) = 'listo_para_entrega', 'liquidación confirmada');
SELECT entregar_pedido(:pedido, :admin);
SELECT pg_temp.afirmar(estado = 'entregado' AND saldo = 0, 'pedido entregado y liquidado') FROM v_mis_pedidos WHERE pedido_id = :pedido;
SELECT pg_temp.debe_fallar(format('SELECT cancelar_pedido(%s, %s)', :pedido, :cliente), 'un pedido entregado ya no se cancela');
SELECT pg_temp.afirmar(count(*) = 4, 'el historial registró los 4 cambios de estado') FROM pedido_historial WHERE pedido_id = :pedido;

\echo
\echo '6. Mueble de existencia (entrega inmediata) con pago completo'
INSERT INTO carrito_item (usuario_id, producto_id) VALUES (:cliente, :nordico) RETURNING id AS item2 \gset
INSERT INTO carrito_item_opcion (carrito_item_id, producto_id, opcion_id, grupo_id)
SELECT :item2, :nordico, opcion_id, grupo_id FROM producto_opcion WHERE producto_id = :nordico AND es_predeterminada;
SELECT crear_pedido(:cliente, 'pago_completo', :dir) AS pedido2 \gset
SELECT pg_temp.afirmar(de_existencia AND estado_produccion = 'terminado', 'el sillón salió de la existencia') FROM v_pedido_detalle WHERE pedido_id = :pedido2;
SELECT pg_temp.afirmar(existencia = 1, 'la existencia bajó de 2 a 1') FROM variante WHERE sku = 'SIL-NOR-1P-TCAFE';
SELECT pg_temp.afirmar(anticipo_requerido = total, 'pago completo: se exige el 100 %') FROM v_mis_pedidos WHERE pedido_id = :pedido2;
SELECT registrar_pago(:pedido2, 'pago_completo', 4200) AS pago3 \gset
SELECT pg_temp.afirmar(confirmar_pago(:pago3, :admin) = 'listo_para_entrega', 'pagado y sin fabricación: listo para entrega');
SELECT pg_temp.afirmar(cancelar_pedido(:pedido2, :cliente, 'Ya no lo necesito') = 4200, 'al cancelar se devuelve todo (no hubo fabricación)');
SELECT pg_temp.afirmar(existencia = 2, 'el sillón regresó a la existencia') FROM variante WHERE sku = 'SIL-NOR-1P-TCAFE';
SELECT pg_temp.afirmar(count(*) = 1, 'quedó un reembolso pendiente por 4,200')
FROM pago WHERE pedido_id = :pedido2 AND tipo = 'reembolso' AND estado = 'pendiente' AND monto = 4200;

\echo
\echo '7. Cancelación a media fabricación'
INSERT INTO carrito_item (usuario_id, producto_id) VALUES (:cliente, :oslo) RETURNING id AS item3 \gset
INSERT INTO carrito_item_opcion (carrito_item_id, producto_id, opcion_id, grupo_id)
SELECT :item3, :oslo, opcion_id, grupo_id FROM producto_opcion WHERE producto_id = :oslo AND es_predeterminada;
SELECT crear_pedido(:cliente, 'anticipo', :dir) AS pedido3 \gset
SELECT registrar_pago(:pedido3, 'anticipo', 10000) AS pago4 \gset
SELECT confirmar_pago(:pago4, :admin) \g /dev/null
SELECT id AS pitem3 FROM pedido_item WHERE pedido_id = :pedido3 \gset
SELECT avanzar_produccion(:pitem3, :admin) \g /dev/null
SELECT pg_temp.afirmar(cancelar_pedido(:pedido3, :admin, 'El cliente canceló por teléfono') = 6250,
                       'de 10,000 pagados se retienen 3,750 y se devuelven 6,250');
SELECT pg_temp.afirmar(etapa = 'en_fabricacion' AND monto_retenido = 3750, 'la cancelación quedó registrada con sus montos')
FROM cancelacion WHERE pedido_id = :pedido3;
SELECT pg_temp.afirmar(count(*) = 0, 'el pedido cancelado salió de la cola de producción')
FROM v_cola_produccion WHERE folio = (SELECT folio FROM pedido WHERE id = :pedido3);

\echo
\echo '8. Permisos del usuario de la aplicación'
SELECT pg_temp.debe_fallar('DELETE FROM pago',        'la aplicación no puede borrar pagos');
SELECT pg_temp.debe_fallar('DELETE FROM pedido',      'la aplicación no puede borrar pedidos');
SELECT pg_temp.debe_fallar('DROP TABLE carrito_item', 'la aplicación no puede cambiar el esquema');

ROLLBACK;
\echo
\echo 'TODAS LAS PRUEBAS PASARON (y no se guardó nada)'
