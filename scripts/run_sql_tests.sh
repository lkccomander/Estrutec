#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL no esta configurada"
  exit 1
fi

resolve_psql_bin() {
  if [[ -n "${PSQL_BIN:-}" ]]; then
    echo "${PSQL_BIN}"
    return 0
  fi

  if command -v psql >/dev/null 2>&1; then
    command -v psql
    return 0
  fi

  local windows_candidates=(
    "/mnt/c/Program Files/PostgreSQL/17/bin/psql.exe"
    "/mnt/c/Program Files/PostgreSQL/16/bin/psql.exe"
    "/mnt/c/Program Files/PostgreSQL/15/bin/psql.exe"
    "/mnt/c/Program Files/PostgreSQL/14/bin/psql.exe"
    "/mnt/c/Program Files/PostgreSQL/13/bin/psql.exe"
  )

  local candidate
  for candidate in "${windows_candidates[@]}"; do
    if [[ -x "${candidate}" ]]; then
      echo "${candidate}"
      return 0
    fi
  done

  return 1
}

PSQL_CMD="$(resolve_psql_bin || true)"

if [[ -z "${PSQL_CMD}" ]]; then
  echo "No se encontro psql."
  echo "Instala PostgreSQL client o ejecuta el script con PSQL_BIN apuntando a psql."
  echo "Ejemplo:"
  echo "  PSQL_BIN='/mnt/c/Program Files/PostgreSQL/17/bin/psql.exe' DATABASE_URL='...' bash scripts/run_sql_tests.sh"
  exit 1
fi

run_sql_file() {
  local file_path="$1"
  echo
  echo "Ejecutando ${file_path}"
  "${PSQL_CMD}" "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${file_path}"
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
