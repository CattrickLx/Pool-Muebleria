-- Pool Mueblería (Dara) · catálogo inicial
-- Productos, precios, opciones e imágenes tomados del prototipo (index.html,
-- producto.html y Guardado.txt). VALIDAR CON EL CLIENTE antes de publicar:
--   · Solo el Sofá Modular Oslo y el Sofá Premium tienen opciones con sobreprecio
--     en el prototipo; los demás quedan con su configuración base.
--   · Las imágenes son las de muestra (Unsplash), no fotos reales del taller.

INSERT INTO categoria (nombre, slug) VALUES
    ('Sofás',            'sofas'),
    ('Sillones',         'sillones'),
    ('Salas modulares',  'salas-modulares'),
    ('Mesas de centro',  'mesas-de-centro');

INSERT INTO material (nombre) VALUES
    ('Lino'), ('Terciopelo'), ('Piel sintética'), ('Cuero natural'),
    ('Tela antiderrames'), ('Madera de roble');

INSERT INTO color (nombre, hex) VALUES
    ('Blanco',    '#F5F5F7'),
    ('Gris',      '#9CA3AF'),
    ('Esmeralda', '#065F46'),
    ('Café',      '#3E2723'),
    ('Negro',     '#1C1C1E');

INSERT INTO grupo_opcion (nombre) VALUES ('Tamaño'), ('Acabado');

-- Opciones de tamaño
INSERT INTO opcion (grupo_id, nombre, descripcion)
SELECT g.id, x.nombre, x.descripcion
FROM (VALUES
    ('1 Plaza',                 NULL),
    ('2 Plazas',                NULL),
    ('3 Plazas (Estándar)',     '2.10m de largo. Ideal para salas medianas.'),
    ('Modular en L (4 Plazas)', '2.80m x 1.60m. Máximo confort familiar.')
) AS x(nombre, descripcion)
JOIN grupo_opcion g ON g.nombre = 'Tamaño';

-- Opciones de acabado, con el material y color que alimentan los filtros
INSERT INTO opcion (grupo_id, nombre, descripcion, material_id, color_id)
SELECT g.id, x.nombre, x.descripcion, m.id, k.id
FROM (VALUES
    ('Lino Blanco',             'Fresco, transpirable y elegante.',        'Lino',              'Blanco'),
    ('Terciopelo Esmeralda',    'Toque suave y aspecto lujoso.',           'Terciopelo',        'Esmeralda'),
    ('Terciopelo Café',         NULL,                                      'Terciopelo',        'Café'),
    ('Piel Sintética Premium',  'Fácil limpieza y máxima durabilidad.',    'Piel sintética',    NULL),
    ('Tela Antiderrames Gris',  NULL,                                      'Tela antiderrames', 'Gris'),
    ('Cuero Natural',           NULL,                                      'Cuero natural',     NULL),
    ('Roble Natural',           NULL,                                      'Madera de roble',   NULL)
) AS x(nombre, descripcion, material, color)
JOIN grupo_opcion g ON g.nombre = 'Acabado'
JOIN material m     ON m.nombre = x.material
LEFT JOIN color k   ON k.nombre = x.color;

INSERT INTO producto (categoria_id, nombre, slug, descripcion, precio_base)
SELECT c.id, x.nombre, x.slug, x.descripcion, x.precio
FROM (VALUES
    ('sofas',           'Sofá Modular Oslo',   'sofa-modular-oslo',   'Lino blanco • 3 Plazas',          12500),
    ('sofas',           'Sofá Premium Cuero',  'sofa-premium-cuero',  'Cuero Natural • 3 Plazas',        22000),
    ('sofas',           'Sofá Cama Piel',      'sofa-cama-piel',      'Piel Sintética • 2 Plazas',        8700),
    ('salas-modulares', 'Sofá Seccional Gris', 'sofa-seccional-gris', 'Tela Antiderrames • 4 Plazas',    15800),
    ('sillones',        'Sillón Nórdico',      'sillon-nordico',      'Terciopelo Café • 1 Plaza',        4200),
    ('sillones',        'Sillón Velvet',       'sillon-velvet',       'Terciopelo Esmeralda • 1 Plaza',   5200),
    ('mesas-de-centro', 'Mesita Café Pool',    'mesita-cafe-pool',    'Madera de Roble',                  2500)
) AS x(categoria, nombre, slug, descripcion, precio)
JOIN categoria c ON c.slug = x.categoria;

INSERT INTO producto_imagen (producto_id, url)
SELECT p.id, x.url
FROM (VALUES
    ('sofa-modular-oslo',   'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=600'),
    ('sofa-premium-cuero',  'https://images.unsplash.com/photo-1550254478-ead40cc54513?auto=format&fit=crop&q=80&w=600'),
    ('sofa-cama-piel',      'https://images.unsplash.com/photo-1540574163026-643ea20ade25?auto=format&fit=crop&q=80&w=600'),
    ('sofa-seccional-gris', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=600'),
    ('sillon-nordico',      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&q=80&w=600'),
    ('sillon-velvet',       'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&q=80&w=600'),
    ('mesita-cafe-pool',    'https://images.unsplash.com/photo-1533090368676-1fd25485d282?auto=format&fit=crop&q=80&w=600')
) AS x(slug, url)
JOIN producto p ON p.slug = x.slug;

-- Qué opciones ofrece cada producto, cuánto suma cada una y cuál va incluida
INSERT INTO producto_opcion (producto_id, opcion_id, grupo_id, precio_extra, es_predeterminada)
SELECT p.id, o.id, o.grupo_id, x.extra, x.incluida
FROM (VALUES
    ('sofa-modular-oslo',   '3 Plazas (Estándar)',        0, true),
    ('sofa-modular-oslo',   'Modular en L (4 Plazas)', 4000, false),
    ('sofa-modular-oslo',   'Lino Blanco',                0, true),
    ('sofa-modular-oslo',   'Terciopelo Esmeralda',     800, false),
    ('sofa-modular-oslo',   'Piel Sintética Premium',  1200, false),
    ('sofa-premium-cuero',  '3 Plazas (Estándar)',        0, true),
    ('sofa-premium-cuero',  'Modular en L (4 Plazas)', 4500, false),
    ('sofa-premium-cuero',  'Cuero Natural',              0, true),
    ('sofa-cama-piel',      '2 Plazas',                   0, true),
    ('sofa-cama-piel',      'Piel Sintética Premium',     0, true),
    ('sofa-seccional-gris', 'Modular en L (4 Plazas)',    0, true),
    ('sofa-seccional-gris', 'Tela Antiderrames Gris',     0, true),
    ('sillon-nordico',      '1 Plaza',                    0, true),
    ('sillon-nordico',      'Terciopelo Café',            0, true),
    ('sillon-velvet',       '1 Plaza',                    0, true),
    ('sillon-velvet',       'Terciopelo Esmeralda',       0, true),
    ('mesita-cafe-pool',    'Roble Natural',              0, true)
) AS x(slug, opcion, extra, incluida)
JOIN producto p ON p.slug = x.slug
JOIN opcion o   ON o.nombre = x.opcion;

-- Si un nombre quedó mal escrito arriba, el JOIN lo descarta en silencio.
-- Esta comprobación detiene la carga en ese caso.
DO $$
BEGIN
    IF (SELECT count(*) FROM opcion) <> 11
       OR (SELECT count(*) FROM producto) <> 7
       OR (SELECT count(*) FROM producto_imagen) <> 7
       OR (SELECT count(*) FROM producto_opcion) <> 17 THEN
        RAISE EXCEPTION 'El catálogo no se cargó completo: revisa los nombres en 05_catalogo.sql';
    END IF;
END $$;
