<?php
// Conexión a la base con el usuario limitado de la aplicación (pool_app).
// Los datos salen de variables de entorno; los valores por defecto son los de desarrollo.

function conexion(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf(
            'pgsql:host=%s;port=%s;dbname=%s',
            getenv('DB_HOST') ?: '127.0.0.1',
            getenv('DB_PORT') ?: '5432',
            getenv('DB_NAME') ?: 'pool_muebleria'
        );
        $pdo = new PDO($dsn, getenv('DB_USER') ?: 'pool_app', getenv('DB_PASSWORD') ?: '', [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,   // los errores de SQL lanzan excepción
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,                    // consultas preparadas de verdad
        ]);
    }
    return $pdo;
}

function responder_json(int $codigo, array $datos): never
{
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}
