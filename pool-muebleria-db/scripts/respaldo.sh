#!/usr/bin/env bash
# Crea un respaldo completo de la base en la carpeta respaldos/.
# Uso:  ./scripts/respaldo.sh
#
# Para restaurarlo en una base vacía:
#   docker compose exec -T db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < respaldos/ARCHIVO.dump
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; source .env; set +a
mkdir -p respaldos
archivo="respaldos/pool_$(date +%Y%m%d_%H%M%S).dump"

docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom > "$archivo"
echo "Respaldo creado: $archivo ($(du -h "$archivo" | cut -f1))"
