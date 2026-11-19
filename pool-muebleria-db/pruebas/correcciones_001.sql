-- Pool Mueblería (Dara) · prueba de la migración 001 (pagos, cancelaciones y permisos)
-- Igual que flujo_completo.sql: corre como pool_app y al final se deshace todo.
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

-- Dos pedidos del Sofá Oslo base (12,500 c/u)
INSERT INTO carrito_item (usuario_id, producto_id) VALUES (:cliente, :oslo) RETURNING id AS it1 \gset
INSERT INTO carrito_item_opcion SELECT :it1, :oslo, opcion_id, grupo_id FROM producto_opcion WHERE producto_id = :oslo AND es_predeterminada;
SELECT crear_pedido(:cliente, 'anticipo', :dir) AS p1 \gset
INSERT INTO carrito_item (usuario_id, producto_id) VALUES (:cliente, :oslo) RETURNING id AS it2 \gset
INSERT INTO carrito_item_opcion SELECT :it2, :oslo, opcion_id, grupo_id FROM producto_opcion WHERE producto_id = :oslo AND es_predeterminada;
SELECT crear_pedido(:cliente, 'anticipo', :dir) AS p2 \gset

\echo
\echo 'A. No se cobra más que el total'
SELECT registrar_pago(:p1, 'anticipo', 10000) AS a1 \gset
SELECT pg_temp.debe_fallar(format('SELECT registrar_pago(%s, ''anticipo'', 10000)', :p1),
                           'un segundo comprobante no puede rebasar el saldo junto con el que está en revisión');
SELECT confirmar_pago(:a1, :admin) \g /dev/null
SELECT pg_temp.afirmar(saldo = 2500, 'saldo correcto tras confirmar 10,000') FROM v_control_anticipos WHERE pedido_id = :p1;

\echo
\echo 'B. Cancelación con comprobante en revisión'
SELECT registrar_pago(:p2, 'anticipo', 10000) AS b1 \gset
SELECT pg_temp.debe_fallar(format('SELECT cancelar_pedido(%s, %s)', :p2, :cliente),
                           'no se cancela mientras hay un pago en revisión');
SELECT rechazar_pago(:b1, :admin) \g /dev/null
SELECT pg_temp.afirmar(cancelar_pedido(:p2, :cliente, 'prueba') = 0, 'tras rechazar el pago, sí se cancela');
SELECT pg_temp.debe_fallar(format('SELECT registrar_pago(%s, ''anticipo'', 100)', :p2),
                           'un pedido cancelado no admite pagos nuevos');

\echo
\echo 'C. La aplicación no puede saltarse las funciones'
SELECT pg_temp.debe_fallar(format('UPDATE usuario SET rol = ''admin'' WHERE id = %s', :cliente), 'no puede volverse admin');
SELECT pg_temp.debe_fallar(format('UPDATE pedido SET estado = ''entregado'' WHERE id = %s', :p1), 'no puede cambiar el estado de un pedido');
SELECT pg_temp.debe_fallar(format('UPDATE pago SET monto = 1 WHERE pedido_id = %s', :p1), 'no puede modificar pagos');
SELECT pg_temp.debe_fallar(format('INSERT INTO pago (pedido_id, tipo, monto, metodo_pago_id, estado, confirmado_en) VALUES (%s, ''anticipo'', 1, 1, ''confirmado'', now())', :p1),
                           'no puede insertar pagos ya confirmados');
SELECT pg_temp.debe_fallar('INSERT INTO usuario (nombre, correo, password_hash, rol) VALUES (''x'', ''x@x.mx'', ''x'', ''admin'')',
                           'el registro no puede crear administradores');
SELECT pg_temp.afirmar(
    (SELECT count(*) FROM (SELECT 1 FROM usuario WHERE id = :cliente) s) = 1, 'sí puede leer usuarios');
UPDATE usuario SET telefono = '4429999999' WHERE id = :cliente;
SELECT pg_temp.afirmar(telefono = '4429999999', 'sí puede editar datos del cliente') FROM usuario WHERE id = :cliente;

ROLLBACK;
\echo
\echo 'CORRECCIONES 001: TODAS LAS PRUEBAS PASARON (y no se guardó nada)'
