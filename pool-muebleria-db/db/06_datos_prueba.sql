-- Pool Mueblería (Dara) · datos SOLO PARA DESARROLLO
-- Borra este archivo (o no lo cargues) en la instalación real del cliente.
--
--   Administrador:  admin@poolmuebleria.test    contraseña: admin1234
--   Cliente:        cliente@poolmuebleria.test  contraseña: cliente1234
--
-- Las contraseñas se guardan con bcrypt, compatible con password_verify() de PHP.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO usuario (nombre, correo, password_hash, rol)
VALUES ('Administrador', 'admin@poolmuebleria.test', crypt('admin1234', gen_salt('bf', 10)), 'admin');

INSERT INTO usuario (nombre, correo, password_hash, telefono, fecha_nacimiento, acepto_terminos_en)
VALUES ('Cliente de Prueba', 'cliente@poolmuebleria.test', crypt('cliente1234', gen_salt('bf', 10)),
        '4421234567', '1995-05-20', now());

INSERT INTO direccion (usuario_id, calle, numero_ext, colonia, codigo_postal, municipio)
SELECT id, 'Av. Tecnológico', '100', 'Centro', '76000', 'Santiago de Querétaro'
FROM usuario WHERE correo = 'cliente@poolmuebleria.test';

-- Existencias de ejemplo para probar "Entrega inmediata"
INSERT INTO variante (producto_id, sku, existencia)
SELECT id, 'SIL-NOR-1P-TCAFE', 2 FROM producto WHERE slug = 'sillon-nordico';

INSERT INTO variante (producto_id, sku, existencia)
SELECT id, 'MES-CAFE-ROBLE', 3 FROM producto WHERE slug = 'mesita-cafe-pool';

-- Cada variante lleva la configuración base (opciones incluidas) de su producto
INSERT INTO variante_opcion (variante_id, producto_id, opcion_id, grupo_id)
SELECT v.id, v.producto_id, po.opcion_id, po.grupo_id
FROM variante v
JOIN producto_opcion po ON po.producto_id = v.producto_id AND po.es_predeterminada;
