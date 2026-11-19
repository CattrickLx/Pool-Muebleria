-- Pool Mueblería (Dara) · esquema v2 · PostgreSQL 15+
-- Cambios sobre v1: catálogo de métodos de pago, comprobante de transferencia,
-- política de cancelación por etapa de producción y registro de cancelaciones.

CREATE TYPE rol_usuario       AS ENUM ('cliente', 'admin');
CREATE TYPE plan_pago         AS ENUM ('anticipo', 'pago_completo');
CREATE TYPE estado_pedido     AS ENUM ('pendiente_anticipo', 'en_produccion', 'listo_para_entrega', 'entregado', 'cancelado');
CREATE TYPE estado_produccion AS ENUM ('en_cola', 'en_fabricacion', 'terminado');
CREATE TYPE tipo_pago         AS ENUM ('anticipo', 'liquidacion', 'pago_completo', 'reembolso');
CREATE TYPE estado_pago       AS ENUM ('pendiente', 'confirmado', 'rechazado');

-- ---------- Catálogo ----------
CREATE TABLE categoria (
    id      smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre  text NOT NULL UNIQUE,
    slug    text NOT NULL UNIQUE
);

CREATE TABLE material (
    id      smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre  text NOT NULL UNIQUE
);

CREATE TABLE color (
    id      smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre  text NOT NULL UNIQUE,
    hex     text NOT NULL CHECK (hex ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE TABLE producto (
    id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    categoria_id         smallint NOT NULL REFERENCES categoria,
    nombre               text NOT NULL,
    slug                 text NOT NULL UNIQUE,
    descripcion          text,
    precio_base          numeric(10,2) NOT NULL CHECK (precio_base > 0),
    dias_produccion_min  smallint NOT NULL DEFAULT 15,
    dias_produccion_max  smallint NOT NULL DEFAULT 20,
    activo               boolean NOT NULL DEFAULT true,
    creado_en            timestamptz NOT NULL DEFAULT now(),
    CHECK (dias_produccion_min > 0 AND dias_produccion_max >= dias_produccion_min)
);

CREATE TABLE producto_imagen (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    producto_id  bigint NOT NULL REFERENCES producto ON DELETE CASCADE,
    url          text NOT NULL,
    orden        smallint NOT NULL DEFAULT 0,
    UNIQUE (producto_id, orden)
);

-- Configurador: grupos ("Tamaño", "Acabado") y sus opciones
CREATE TABLE grupo_opcion (
    id      smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre  text NOT NULL UNIQUE
);

CREATE TABLE opcion (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    grupo_id     smallint NOT NULL REFERENCES grupo_opcion,
    nombre       text NOT NULL,
    descripcion  text,
    material_id  smallint REFERENCES material,   -- alimentan los filtros del catálogo
    color_id     smallint REFERENCES color,
    UNIQUE (grupo_id, nombre),
    UNIQUE (id, grupo_id)
);

-- Qué opciones ofrece cada producto y cuánto suma cada una
CREATE TABLE producto_opcion (
    producto_id        bigint NOT NULL REFERENCES producto ON DELETE CASCADE,
    opcion_id          bigint NOT NULL,
    grupo_id           smallint NOT NULL,
    precio_extra       numeric(10,2) NOT NULL DEFAULT 0 CHECK (precio_extra >= 0),
    es_predeterminada  boolean NOT NULL DEFAULT false,
    activo             boolean NOT NULL DEFAULT true,
    PRIMARY KEY (producto_id, opcion_id),
    UNIQUE (producto_id, opcion_id, grupo_id),
    FOREIGN KEY (opcion_id, grupo_id) REFERENCES opcion (id, grupo_id)
);
-- Una sola opción "Incluido" por producto y grupo
CREATE UNIQUE INDEX producto_opcion_predeterminada_uq
    ON producto_opcion (producto_id, grupo_id) WHERE es_predeterminada;

-- Unidades terminadas en existencia ("Entrega inmediata")
CREATE TABLE variante (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    producto_id  bigint NOT NULL REFERENCES producto,
    sku          text NOT NULL UNIQUE,
    existencia   integer NOT NULL DEFAULT 0 CHECK (existencia >= 0),
    UNIQUE (id, producto_id)
);

CREATE TABLE variante_opcion (
    variante_id  bigint NOT NULL,
    producto_id  bigint NOT NULL,
    opcion_id    bigint NOT NULL,
    grupo_id     smallint NOT NULL,
    PRIMARY KEY (variante_id, grupo_id),
    FOREIGN KEY (variante_id, producto_id) REFERENCES variante (id, producto_id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id, opcion_id, grupo_id) REFERENCES producto_opcion (producto_id, opcion_id, grupo_id)
);

-- ---------- Usuarios ----------
CREATE TABLE usuario (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre              text NOT NULL,
    correo              text NOT NULL,
    password_hash       text NOT NULL,
    telefono            text CHECK (telefono ~ '^[0-9]{10}$'),
    fecha_nacimiento    date,
    rol                 rol_usuario NOT NULL DEFAULT 'cliente',
    acepto_terminos_en  timestamptz,
    activo              boolean NOT NULL DEFAULT true,
    creado_en           timestamptz NOT NULL DEFAULT now(),
    CHECK (rol <> 'cliente' OR (telefono IS NOT NULL AND fecha_nacimiento IS NOT NULL AND acepto_terminos_en IS NOT NULL))
);
CREATE UNIQUE INDEX usuario_correo_uq ON usuario (lower(correo));

CREATE TABLE direccion (
    id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id     bigint NOT NULL REFERENCES usuario ON DELETE CASCADE,
    calle          text NOT NULL,
    numero_ext     text NOT NULL,
    numero_int     text,
    colonia        text NOT NULL,
    codigo_postal  text NOT NULL CHECK (codigo_postal ~ '^[0-9]{5}$'),
    municipio      text NOT NULL,
    estado         text NOT NULL DEFAULT 'Querétaro',
    referencias    text
);
CREATE INDEX direccion_usuario_idx ON direccion (usuario_id);

-- ---------- Carrito y "Tus selecciones" ----------
CREATE TABLE carrito_item (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id   bigint NOT NULL REFERENCES usuario ON DELETE CASCADE,
    producto_id  bigint NOT NULL REFERENCES producto,
    cantidad     smallint NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    guardado     boolean NOT NULL DEFAULT false,   -- true = "Tus selecciones"
    creado_en    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (id, producto_id)
);
CREATE INDEX carrito_item_usuario_idx ON carrito_item (usuario_id);

CREATE TABLE carrito_item_opcion (
    carrito_item_id  bigint NOT NULL,
    producto_id      bigint NOT NULL,
    opcion_id        bigint NOT NULL,
    grupo_id         smallint NOT NULL,
    PRIMARY KEY (carrito_item_id, grupo_id),
    FOREIGN KEY (carrito_item_id, producto_id) REFERENCES carrito_item (id, producto_id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id, opcion_id, grupo_id) REFERENCES producto_opcion (producto_id, opcion_id, grupo_id)
);

-- ---------- Pedidos ----------
CREATE SEQUENCE pedido_folio_seq;

CREATE TABLE pedido (
    id                      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    folio                   text NOT NULL UNIQUE DEFAULT 'PM-' || lpad(nextval('pedido_folio_seq')::text, 6, '0'),
    usuario_id              bigint NOT NULL REFERENCES usuario,
    estado                  estado_pedido NOT NULL DEFAULT 'pendiente_anticipo',
    plan                    plan_pago NOT NULL,
    porcentaje_anticipo     numeric(5,2) NOT NULL DEFAULT 80 CHECK (porcentaje_anticipo > 0 AND porcentaje_anticipo <= 100),
    subtotal                numeric(10,2) NOT NULL CHECK (subtotal >= 0),
    costo_envio             numeric(10,2) NOT NULL DEFAULT 0 CHECK (costo_envio >= 0),
    total                   numeric(10,2) GENERATED ALWAYS AS (subtotal + costo_envio) STORED,
    entrega_destinatario    text NOT NULL,     -- copia de la dirección al momento de comprar
    entrega_telefono        text NOT NULL,
    entrega_direccion       text NOT NULL,
    entrega_codigo_postal   text NOT NULL,
    fecha_entrega_estimada  date,
    entregado_en            timestamptz,
    creado_en               timestamptz NOT NULL DEFAULT now(),
    CHECK (plan <> 'pago_completo' OR porcentaje_anticipo = 100)
);
CREATE INDEX pedido_usuario_idx ON pedido (usuario_id);
CREATE INDEX pedido_estado_idx  ON pedido (estado);

CREATE TABLE pedido_item (
    id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id          bigint NOT NULL REFERENCES pedido,
    producto_id        bigint NOT NULL REFERENCES producto,
    variante_id        bigint REFERENCES variante,   -- no nulo = salió de existencia
    nombre_producto    text NOT NULL,                -- copias: el pedido no cambia si cambia el catálogo
    precio_base        numeric(10,2) NOT NULL CHECK (precio_base >= 0),
    precio_unitario    numeric(10,2) NOT NULL CHECK (precio_unitario >= 0),
    cantidad           smallint NOT NULL CHECK (cantidad > 0),
    estado_produccion  estado_produccion NOT NULL DEFAULT 'en_cola',
    produccion_inicio  timestamptz,
    produccion_fin     timestamptz
);
CREATE INDEX pedido_item_pedido_idx ON pedido_item (pedido_id);

CREATE TABLE pedido_item_opcion (
    pedido_item_id  bigint NOT NULL REFERENCES pedido_item,
    grupo_id        smallint NOT NULL,
    opcion_id       bigint NOT NULL,
    nombre_grupo    text NOT NULL,
    nombre_opcion   text NOT NULL,
    precio_extra    numeric(10,2) NOT NULL CHECK (precio_extra >= 0),
    PRIMARY KEY (pedido_item_id, grupo_id),
    FOREIGN KEY (opcion_id, grupo_id) REFERENCES opcion (id, grupo_id)
);

-- Agregar un método de pago = insertar una fila aquí (no se toca el esquema)
CREATE TABLE metodo_pago (
    id      smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    clave   text NOT NULL UNIQUE,
    nombre  text NOT NULL,
    activo  boolean NOT NULL DEFAULT true
);
INSERT INTO metodo_pago (clave, nombre) VALUES ('transferencia', 'Transferencia bancaria');

CREATE TABLE pago (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id        bigint NOT NULL REFERENCES pedido,
    tipo             tipo_pago NOT NULL,
    monto            numeric(10,2) NOT NULL CHECK (monto > 0),
    metodo_pago_id   smallint NOT NULL REFERENCES metodo_pago,
    estado           estado_pago NOT NULL DEFAULT 'pendiente',
    referencia       text,          -- clave de rastreo de la transferencia
    comprobante_url  text,          -- captura que sube el cliente
    confirmado_por   bigint REFERENCES usuario,   -- admin que validó el depósito
    creado_en        timestamptz NOT NULL DEFAULT now(),
    confirmado_en    timestamptz,
    CHECK ((estado = 'confirmado') = (confirmado_en IS NOT NULL))
);
CREATE INDEX pago_pedido_idx ON pago (pedido_id);

CREATE TABLE pedido_historial (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id   bigint NOT NULL REFERENCES pedido,
    estado      estado_pedido NOT NULL,
    nota        text,
    usuario_id  bigint REFERENCES usuario,
    creado_en   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pedido_historial_pedido_idx ON pedido_historial (pedido_id);

-- ---------- Cancelaciones ----------
-- Cuánto se retiene según qué tan avanzado va el mueble.
-- LOS PORCENTAJES SON DE EJEMPLO: los define el cliente.
CREATE TABLE politica_cancelacion (
    etapa                 estado_produccion PRIMARY KEY,
    porcentaje_retencion  numeric(5,2) NOT NULL CHECK (porcentaje_retencion BETWEEN 0 AND 100),
    descripcion           text NOT NULL
);
INSERT INTO politica_cancelacion (etapa, porcentaje_retencion, descripcion) VALUES
    ('en_cola',          0, 'Aún no inicia la fabricación: devolución completa'),
    ('en_fabricacion',  30, 'Ya en fabricación: se cobra un cargo por cancelar'),
    ('terminado',      100, 'Mueble terminado: sin devolución');

-- Una fila por pedido cancelado, con los montos congelados al momento de cancelar.
-- La devolución en sí se registra en "pago" con tipo 'reembolso'.
CREATE TABLE cancelacion (
    pedido_id             bigint PRIMARY KEY REFERENCES pedido,
    etapa                 estado_produccion NOT NULL,
    porcentaje_retencion  numeric(5,2) NOT NULL CHECK (porcentaje_retencion BETWEEN 0 AND 100),
    monto_pagado          numeric(10,2) NOT NULL CHECK (monto_pagado >= 0),
    monto_retenido        numeric(10,2) NOT NULL CHECK (monto_retenido >= 0 AND monto_retenido <= monto_pagado),
    monto_reembolso       numeric(10,2) GENERATED ALWAYS AS (monto_pagado - monto_retenido) STORED,
    motivo                text,
    solicitada_por        bigint NOT NULL REFERENCES usuario,
    creado_en             timestamptz NOT NULL DEFAULT now()
);

-- ---------- Vistas del panel de administración ----------
CREATE VIEW v_control_anticipos AS
SELECT p.id AS pedido_id, p.folio, p.estado, p.total,
       round(p.total * p.porcentaje_anticipo / 100, 2) AS anticipo_requerido,
       coalesce(sum(CASE WHEN g.tipo = 'reembolso' THEN -g.monto ELSE g.monto END), 0) AS pagado,
       p.total - coalesce(sum(CASE WHEN g.tipo = 'reembolso' THEN -g.monto ELSE g.monto END), 0) AS saldo
FROM pedido p
LEFT JOIN pago g ON g.pedido_id = p.id AND g.estado = 'confirmado'
GROUP BY p.id;

CREATE VIEW v_cola_produccion AS
SELECT i.id AS pedido_item_id, p.folio, i.nombre_producto, i.cantidad,
       i.estado_produccion, p.fecha_entrega_estimada, p.creado_en
FROM pedido_item i
JOIN pedido p ON p.id = i.pedido_id
WHERE p.estado = 'en_produccion'
  AND i.variante_id IS NULL
  AND i.estado_produccion <> 'terminado'
ORDER BY p.fecha_entrega_estimada NULLS LAST, p.creado_en;

-- Lo que se le muestra al cliente ANTES de confirmar que cancela.
-- La etapa del pedido es la del mueble más avanzado; los de existencia no cuentan.
-- La retención es un porcentaje del total, sin pasar de lo que ya pagó.
CREATE VIEW v_cancelacion_estimada AS
SELECT a.pedido_id, a.folio,
       coalesce(e.etapa, 'en_cola') AS etapa,
       pc.porcentaje_retencion,
       a.pagado,
       least(a.pagado, round(a.total * pc.porcentaje_retencion / 100, 2)) AS monto_retenido,
       a.pagado - least(a.pagado, round(a.total * pc.porcentaje_retencion / 100, 2)) AS monto_reembolso
FROM v_control_anticipos a
LEFT JOIN (
    SELECT pedido_id, max(estado_produccion) AS etapa
    FROM pedido_item
    WHERE variante_id IS NULL
    GROUP BY pedido_id
) e ON e.pedido_id = a.pedido_id
JOIN politica_cancelacion pc ON pc.etapa = coalesce(e.etapa, 'en_cola')
WHERE a.estado NOT IN ('entregado', 'cancelado');
