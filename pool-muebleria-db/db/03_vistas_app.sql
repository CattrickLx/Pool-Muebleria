-- Pool Mueblería (Dara) · consultas listas para las pantallas del sitio

-- Catálogo (producto.html). Ejemplos de filtros:
--   WHERE categoria_slug = 'sofas'
--   WHERE 'Terciopelo' = ANY (materiales)
--   WHERE 'Esmeralda'  = ANY (colores)
--   WHERE entrega_inmediata
--   WHERE precio_base <= 15000
CREATE VIEW v_catalogo AS
SELECT p.id AS producto_id, p.slug, p.nombre, p.descripcion,
       c.nombre AS categoria, c.slug AS categoria_slug,
       p.precio_base,
       (SELECT i.url FROM producto_imagen i WHERE i.producto_id = p.id ORDER BY i.orden LIMIT 1) AS imagen,
       EXISTS (SELECT 1 FROM variante v WHERE v.producto_id = p.id AND v.existencia > 0) AS entrega_inmediata,
       coalesce((SELECT array_agg(DISTINCT m.nombre ORDER BY m.nombre)
                 FROM producto_opcion po
                 JOIN opcion o   ON o.id = po.opcion_id
                 JOIN material m ON m.id = o.material_id
                 WHERE po.producto_id = p.id AND po.activo), '{}') AS materiales,
       coalesce((SELECT array_agg(DISTINCT k.nombre ORDER BY k.nombre)
                 FROM producto_opcion po
                 JOIN opcion o ON o.id = po.opcion_id
                 JOIN color k  ON k.id = o.color_id
                 WHERE po.producto_id = p.id AND po.activo), '{}') AS colores,
       p.dias_produccion_min, p.dias_produccion_max
FROM producto p
JOIN categoria c ON c.id = p.categoria_id
WHERE p.activo;

-- Opciones del configurador (ventana de compra):  WHERE producto_id = ?
CREATE VIEW v_producto_opciones AS
SELECT po.producto_id, g.id AS grupo_id, g.nombre AS grupo,
       o.id AS opcion_id, o.nombre AS opcion, o.descripcion,
       po.precio_extra, po.es_predeterminada,
       m.nombre AS material, k.nombre AS color, k.hex AS color_hex
FROM producto_opcion po
JOIN opcion o       ON o.id = po.opcion_id
JOIN grupo_opcion g ON g.id = po.grupo_id
LEFT JOIN material m ON m.id = o.material_id
LEFT JOIN color k    ON k.id = o.color_id
WHERE po.activo
ORDER BY po.producto_id, g.id, po.es_predeterminada DESC, po.precio_extra, o.nombre;

-- Carrito y "Tus selecciones" con el precio ya calculado:  WHERE usuario_id = ? AND NOT guardado
CREATE VIEW v_carrito AS
SELECT ci.id AS carrito_item_id, ci.usuario_id, ci.guardado,
       pr.id AS producto_id, pr.nombre, ci.cantidad,
       pr.precio_base + coalesce(sum(po.precio_extra), 0) AS precio_unitario,
       (pr.precio_base + coalesce(sum(po.precio_extra), 0)) * ci.cantidad AS importe,
       string_agg(g.nombre || ': ' || o.nombre, ' · ' ORDER BY g.id) AS configuracion
FROM carrito_item ci
JOIN producto pr ON pr.id = ci.producto_id
LEFT JOIN carrito_item_opcion co ON co.carrito_item_id = ci.id
LEFT JOIN producto_opcion po     ON po.producto_id = co.producto_id AND po.opcion_id = co.opcion_id
LEFT JOIN opcion o               ON o.id = co.opcion_id
LEFT JOIN grupo_opcion g         ON g.id = co.grupo_id
GROUP BY ci.id, pr.id;

-- "Pedidos" del cliente:  WHERE usuario_id = ?
CREATE VIEW v_mis_pedidos AS
SELECT p.id AS pedido_id, p.usuario_id, p.folio, p.estado, p.plan,
       p.total, a.anticipo_requerido, a.pagado, a.saldo,
       p.fecha_entrega_estimada, p.creado_en
FROM pedido p
JOIN v_control_anticipos a ON a.pedido_id = p.id;

-- Detalle de un pedido:  WHERE pedido_id = ?
CREATE VIEW v_pedido_detalle AS
SELECT i.pedido_id, i.id AS pedido_item_id, i.nombre_producto, i.cantidad,
       i.precio_unitario, i.precio_unitario * i.cantidad AS importe,
       i.estado_produccion, i.variante_id IS NOT NULL AS de_existencia,
       (SELECT string_agg(io.nombre_grupo || ': ' || io.nombre_opcion, ' · ' ORDER BY io.grupo_id)
        FROM pedido_item_opcion io WHERE io.pedido_item_id = i.id) AS configuracion
FROM pedido_item i;
