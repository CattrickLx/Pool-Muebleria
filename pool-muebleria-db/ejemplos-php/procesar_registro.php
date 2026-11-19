<?php
// Recibe el formulario "Registro Cliente" de registro.html (action="procesar_registro.php").
// Vuelve a validar TODO en el servidor: la validación en JavaScript se puede saltar.
require __DIR__ . '/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder_json(405, ['error' => 'Método no permitido']);
}

$nombre   = trim($_POST['nombre'] ?? '');
$correo   = trim($_POST['correo'] ?? '');
$password = $_POST['password'] ?? '';
$confirma = $_POST['confirm_password'] ?? '';
$telefono = trim($_POST['telefono'] ?? '');
$fecha    = trim($_POST['fecha_nacimiento'] ?? '');   // dd/mm/aaaa
$terminos = isset($_POST['terminos']);

$errores = [];

if ($nombre === '')                                   $errores[] = 'Escribe tu nombre completo.';
if (!filter_var($correo, FILTER_VALIDATE_EMAIL))      $errores[] = 'El correo no es válido.';
if (strlen($password) < 8)                            $errores[] = 'La contraseña debe tener al menos 8 caracteres.';
if ($password !== $confirma)                          $errores[] = 'Las contraseñas no coinciden.';
if (!preg_match('/^[0-9]{10}$/', $telefono))          $errores[] = 'El teléfono debe tener 10 dígitos.';
if (!$terminos)                                       $errores[] = 'Debes aceptar los términos y la política de anticipo.';

$nacimiento = DateTimeImmutable::createFromFormat('!d/m/Y', $fecha);
if (!$nacimiento || $nacimiento->format('d/m/Y') !== $fecha) {
    $errores[] = 'La fecha de nacimiento no es válida (dd/mm/aaaa).';
} elseif ($nacimiento->diff(new DateTimeImmutable('today'))->y < 18 || $nacimiento > new DateTimeImmutable('today')) {
    $errores[] = 'Debes ser mayor de 18 años.';     // contra la fecha real de hoy, no una fija
}

if ($errores) {
    responder_json(422, ['errores' => $errores]);
}

try {
    $consulta = conexion()->prepare(
        'INSERT INTO usuario (nombre, correo, password_hash, telefono, fecha_nacimiento, acepto_terminos_en)
         VALUES (:nombre, :correo, :hash, :telefono, :nacimiento, now())
         RETURNING id'
    );
    $consulta->execute([
        'nombre'     => $nombre,
        'correo'     => $correo,
        'hash'       => password_hash($password, PASSWORD_DEFAULT),   // nunca se guarda la contraseña tal cual
        'telefono'   => $telefono,
        'nacimiento' => $nacimiento->format('Y-m-d'),
    ]);
    responder_json(201, ['usuario_id' => (int) $consulta->fetchColumn()]);
} catch (PDOException $e) {
    if ($e->getCode() === '23505') {                  // violación de único: el correo ya existe
        responder_json(409, ['errores' => ['Ya existe una cuenta con ese correo.']]);
    }
    error_log($e->getMessage());                      // el detalle va al log, no al usuario
    responder_json(500, ['errores' => ['No se pudo crear la cuenta. Intenta más tarde.']]);
}
