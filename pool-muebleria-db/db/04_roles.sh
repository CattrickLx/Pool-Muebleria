#!/bin/bash
# Crea el usuario con el que se conecta la aplicación web.
# No es dueño de las tablas: no puede cambiar el esquema ni borrar pedidos o pagos.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
     -v app_password="$APP_DB_PASSWORD" <<-'EOSQL'
	CREATE ROLE pool_app LOGIN PASSWORD :'app_password';

	GRANT USAGE ON SCHEMA public TO pool_app;
	GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO pool_app;
	GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO pool_app;

	-- Solo se puede borrar lo que no es historia del negocio
	GRANT DELETE ON carrito_item, carrito_item_opcion, direccion,
	                producto_imagen, producto_opcion, variante, variante_opcion
	      TO pool_app;

	-- Las tablas que se agreguen después heredan los mismos permisos básicos
	ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE ON TABLES TO pool_app;
	ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO pool_app;
EOSQL
