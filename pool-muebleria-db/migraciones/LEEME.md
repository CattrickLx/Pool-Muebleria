# Migraciones

Los archivos de `db/` solo se ejecutan la primera vez que se crea la base.
Cuando la base ya tiene datos que no quieres perder, cada cambio al esquema va aquí,
en un archivo numerado y con fecha, y **nunca se edita uno que ya se aplicó**:

    migraciones/001_2026-11-20_agregar_zonas_de_envio.sql

Para aplicarlo:

    docker compose exec -T db psql -U pool_admin -d pool_muebleria -v ON_ERROR_STOP=1 < migraciones/001_2026-11-20_agregar_zonas_de_envio.sql

Después copia el mismo cambio a los archivos de `db/`, para que quien levante el
proyecto desde cero obtenga la misma base.
