# Pool Mueblería (Dara) · base de datos

Base de datos PostgreSQL 16 del proyecto: esquema, lógica de pedidos, catálogo del
prototipo, datos de prueba y ejemplos de conexión en PHP.

## Qué hay aquí

| Ruta | Para qué sirve |
|---|---|
| `docker-compose.yml`, `.env.example` | Levantar PostgreSQL en tu máquina |
| `db/01_esquema.sql` | Tablas, restricciones y vistas del panel de administración |
| `db/02_funciones.sql` | Operaciones completas: crear pedido, pagos, producción, entrega, cancelación |
| `db/03_vistas_app.sql` | Consultas listas para las pantallas del sitio |
| `db/04_roles.sh` | Usuario limitado `pool_app` con el que se conecta la página |
| `db/05_catalogo.sql` | Los 7 productos del prototipo con sus opciones y precios |
| `db/06_datos_prueba.sql` | Usuarios y existencias de ejemplo (**solo desarrollo**) |
| `db/07_correcciones_001.sql` | Copia de la migración 001 para instalaciones nuevas (pagos y permisos) |
| `pruebas/flujo_completo.sql` | Prueba de principio a fin; no deja datos |
| `pruebas/correcciones_001.sql` | Prueba de la migración 001; no deja datos |
| `ejemplos-php/` | Conexión, catálogo con filtros, registro e inicio de sesión |
| `scripts/respaldo.sh` | Respaldo con `pg_dump` |
| `migraciones/` | Cambios al esquema cuando la base ya tiene datos |

## Primeros pasos

```bash
cp .env.example .env          # y cambia las contraseñas
docker compose up -d          # en Fedora también sirve: podman compose up -d
docker compose logs -f db     # espera "database system is ready to accept connections"
```

Los archivos de `db/` se ejecutan en orden alfabético **solo la primera vez**. Para
borrar todo y empezar de cero: `docker compose down -v && docker compose up -d`.

Conectarte (desde la terminal o con DBeaver: host `127.0.0.1`, puerto `5432`):

```bash
docker compose exec db psql -U pool_admin -d pool_muebleria
```

Correr la prueba completa (debe terminar en `TODAS LAS PRUEBAS PASARON`):

```bash
docker compose exec -T db psql -U pool_admin -d pool_muebleria < pruebas/flujo_completo.sql
docker compose exec -T db psql -U pool_admin -d pool_muebleria < pruebas/correcciones_001.sql
```

### Si tu base ya existía antes del 19/11/2026

Aplica la migración 001 una vez (se puede repetir sin daño) y corre las dos pruebas:

```bash
docker compose exec -T db psql -U pool_admin -d pool_muebleria -v ON_ERROR_STOP=1 < migraciones/001_2026-11-19_corregir_pagos_y_permisos.sql
```

Qué corrige:
- No se puede pagar más que el total (se cuentan también los comprobantes en revisión).
- No se cancela un pedido con un comprobante en revisión, y no se confirman pagos de
  pedidos cancelados o entregados.
- `pool_app` ya no puede escribir directo en pedidos, pagos, historial ni en el rol de un
  usuario: solo a través de las funciones, que ahora son `SECURITY DEFINER`.

## Cómo se usa desde el backend

El backend se conecta como `pool_app` y llama funciones. Cada una valida sus reglas y,
si algo no cumple, lanza un error con un mensaje en español y no cambia nada.

| Momento | Llamada | Devuelve |
|---|---|---|
| El cliente confirma su carrito | `SELECT crear_pedido(usuario_id, 'anticipo', direccion_id)` | id del pedido |
| El cliente sube su comprobante | `SELECT registrar_pago(pedido_id, 'anticipo', monto, 'transferencia', referencia, url)` | id del pago |
| El admin valida el depósito | `SELECT confirmar_pago(pago_id, admin_id)` | estado del pedido |
| El admin no encuentra el depósito | `SELECT rechazar_pago(pago_id, admin_id)` | — |
| El taller avanza un mueble | `SELECT avanzar_produccion(pedido_item_id, admin_id)` | estado del mueble |
| Se entrega (ya liquidado) | `SELECT entregar_pedido(pedido_id, admin_id)` | — |
| Se cancela | `SELECT cancelar_pedido(pedido_id, quien_cancela_id, motivo)` | monto a reembolsar |

El plan puede ser `'anticipo'` (80/20) o `'pago_completo'`.

Consultas para las pantallas:

| Pantalla | Consulta |
|---|---|
| Catálogo y filtros | `SELECT * FROM v_catalogo WHERE ...` (ejemplos dentro de `03_vistas_app.sql`) |
| Ventana de compra | `SELECT * FROM v_producto_opciones WHERE producto_id = ?` |
| Carrito / Tus selecciones | `SELECT * FROM v_carrito WHERE usuario_id = ? AND NOT guardado` |
| Mis pedidos | `SELECT * FROM v_mis_pedidos WHERE usuario_id = ?` |
| Detalle de un pedido | `SELECT * FROM v_pedido_detalle WHERE pedido_id = ?` |
| ¿Cuánto me devuelven si cancelo? | `SELECT * FROM v_cancelacion_estimada WHERE pedido_id = ?` |
| Admin · Control de anticipos | `SELECT * FROM v_control_anticipos` |
| Admin · Cola de producción | `SELECT * FROM v_cola_produccion` |

### Ejemplos en PHP

Los archivos de `ejemplos-php/` responden JSON, así que los formularios deben enviarse
con `fetch()`. Para probarlos sin instalar un servidor web:

```bash
DB_NAME=pool_muebleria DB_USER=pool_app DB_PASSWORD=la_de_tu_env php -S 127.0.0.1:8080 -t ejemplos-php
# http://127.0.0.1:8080/catalogo.php?material=Terciopelo
```

## Cambios frecuentes

```sql
-- Agregar un método de pago
INSERT INTO metodo_pago (clave, nombre) VALUES ('efectivo', 'Efectivo en taller');

-- Cambiar la política de cancelación (hoy son valores de ejemplo)
UPDATE politica_cancelacion SET porcentaje_retencion = 40 WHERE etapa = 'en_fabricacion';

-- Dejar de ofrecer una opción sin romper pedidos anteriores
UPDATE producto_opcion SET activo = false WHERE producto_id = 1 AND opcion_id = 5;
```

## Pendiente: falta información del cliente (Documento de Requisitos)

- **Punto 5, tiempo de entrega:** el documento pide +4 días por cada pedido pendiente; la base
  usa 15–20 días hábiles por producto (de `ayuda.html`) y no mira la cola. Falta definir la regla.
  Tampoco hay función para que el admin ajuste la fecha estimada con registro del cambio.
- **Puntos 2 y 3:** faltan dimensiones y número de plazas por producto, y qué es pequeño/mediano/grande.
- **Punto 4:** faltan zonas/opciones de envío y sus costos (`costo_envio` hoy siempre es 0).
- **Puntos 8 y 9:** falta la tabla de notificaciones por WhatsApp/correo.

## Supuestos por confirmar con el cliente

- Porcentajes de cancelación: 0 % en cola, 30 % en fabricación, 100 % terminado (inventados).
- La retención se calcula sobre el total del pedido, sin pasar de lo ya pagado.
- En un pedido con varios muebles manda el más avanzado; los de existencia no cuentan.
- La fecha estimada usa días hábiles de lunes a viernes, sin días festivos.
- Un mueble sale de existencia solo si hay unidades suficientes con la misma configuración;
  si no, se fabrica.
- Precios y opciones del catálogo vienen del prototipo; solo el Oslo y el Premium tienen
  opciones con sobreprecio.

## Notas

- Los folios pueden saltarse números (`PM-000001`, `PM-000003`): un pedido que falla
  al crearse consume su número. Es normal.
- Un pedido, un pago o una cancelación nunca se borran; `pool_app` no tiene permiso.
- Antes de instalar con el cliente: no cargues `06_datos_prueba.sql` y usa contraseñas reales.
