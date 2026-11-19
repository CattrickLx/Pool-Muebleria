<?php
// GET catalogo.php?categoria=sofas&material=Terciopelo&color=Esmeralda&inmediata=1&precio_max=15000
// Devuelve el catálogo en JSON. Sustituye al arreglo "baseProducts" de producto.html.
require __DIR__ . '/conexion.php';

$sql = 'SELECT producto_id, slug, nombre, descripcion, categoria, precio_base, imagen,
               entrega_inmediata, array_to_json(materiales) AS materiales, array_to_json(colores) AS colores
        FROM v_catalogo WHERE true';
$parametros = [];

// Cada filtro agrega una condición con un parámetro: nunca se pega texto del usuario en el SQL.
if (!empty($_GET['categoria'])) {
    $sql .= ' AND categoria_slug = :categoria';
    $parametros['categoria'] = $_GET['categoria'];
}
if (!empty($_GET['material'])) {
    $sql .= ' AND :material = ANY (materiales)';
    $parametros['material'] = $_GET['material'];
}
if (!empty($_GET['color'])) {
    $sql .= ' AND :color = ANY (colores)';
    $parametros['color'] = $_GET['color'];
}
if (!empty($_GET['inmediata'])) {
    $sql .= ' AND entrega_inmediata';
}
if (isset($_GET['precio_max']) && is_numeric($_GET['precio_max'])) {
    $sql .= ' AND precio_base <= :precio_max';
    $parametros['precio_max'] = $_GET['precio_max'];
}
$sql .= ' ORDER BY nombre';

$consulta = conexion()->prepare($sql);
$consulta->execute($parametros);

$productos = array_map(function (array $p): array {
    $p['precio_base'] = (float) $p['precio_base'];
    $p['materiales']  = json_decode($p['materiales']);
    $p['colores']     = json_decode($p['colores']);
    return $p;
}, $consulta->fetchAll());

responder_json(200, ['productos' => $productos]);
