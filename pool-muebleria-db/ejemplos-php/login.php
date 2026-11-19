<?php
// POST login.php  (correo, password)
// Sustituye a handleNavLogin(), que hoy compara contra "1234" y "admin" en el navegador.
require __DIR__ . '/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder_json(405, ['error' => 'Método no permitido']);
}

$correo   = trim($_POST['correo'] ?? '');
$password = $_POST['password'] ?? '';

$consulta = conexion()->prepare(
    'SELECT id, nombre, rol, password_hash FROM usuario WHERE lower(correo) = lower(:correo) AND activo'
);
$consulta->execute(['correo' => $correo]);
$usuario = $consulta->fetch();

// Mismo mensaje si falla el correo o la contraseña: no se revela cuál de los dos
if (!$usuario || !password_verify($password, $usuario['password_hash'])) {
    responder_json(401, ['error' => 'Usuario o contraseña incorrectos']);
}

session_start();
session_regenerate_id(true);                // evita que se reutilice una sesión anterior
$_SESSION['usuario_id'] = $usuario['id'];
$_SESSION['rol']        = $usuario['rol'];  // el menú de administración se decide aquí, no en el navegador

responder_json(200, ['nombre' => $usuario['nombre'], 'rol' => $usuario['rol']]);
