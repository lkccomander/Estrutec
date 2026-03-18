#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL no esta configurada"
  exit 1
fi

run_sql_file() {
  local file_path="$1"
  echo
  echo "Ejecutando ${file_path}"
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${file_path}"
}

run_sql_file "DATABASE/DB.SQL"

for migration in DATABASE/migrations/*.sql; do
  run_sql_file "${migration}"
done

for test_file in DATABASE/tests/*.sql; do
  run_sql_file "${test_file}"
done

echo
echo "Pruebas SQL completadas correctamente."
