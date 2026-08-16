#!/usr/bin/env bash
# =============================================================================
# run_swap_carta_events.sh — DB-01: carta_events TEXT → UUID (swap final)
#
# Ejecutar ÚNICAMENTE en ventana de mantenimiento coordinada (DBA/DevLead/QA/Ops).
# Requiere: $DATABASE_URL (cadena de conexión real), Docker, psql disponible.
#
# Flujo: backup → prechecks → swap → postchecks → (opcional) drop tras 24-72h.
# Rollback: restaurar el dump (ver función rollback).
#
# Uso:
#   export DATABASE_URL="postgresql://..."
#   bash scripts/run_swap_carta_events.sh --backup          # solo backup + prechecks
#   bash scripts/run_swap_carta_events.sh --swap            # backup + prechecks + swap + postchecks
#   bash scripts/run_swap_carta_events.sh --drop            # drop final (solo tras observación OK)
#   bash scripts/run_swap_carta_events.sh --rollback        # restaurar dump
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DUMP_FILE="${DUMP_FILE:-${REPO_ROOT}/carta_events_pre_swap.dump}"

SWAP_MIGRATION="${REPO_ROOT}/supabase/migrations/20260808000000_swap_carta_events_uuid_final.sql"
DROP_MIGRATION="${REPO_ROOT}/supabase/migrations/20260808100000_drop_carta_events_text_columns.sql"

# --- Helpers ---------------------------------------------------------------
die() { echo "❌ $*" >&2; exit 1; }
info() { echo "ℹ️  $*"; }
ok()   { echo "✅ $*"; }

require_db_url() {
  [[ -n "${DATABASE_URL:-}" ]] || die "DATABASE_URL no está definida. Exportar antes de ejecutar."
}

psql_run() {
  # Ejecuta psql vía Docker para no depender del cliente local.
  docker run --rm -v "${REPO_ROOT}:/work" -e DATABASE_URL="${DATABASE_URL}" \
    postgres:15 sh -c "psql \"$DATABASE_URL\" $*"
}

psql_t() {
  docker run --rm -v "${REPO_ROOT}:/work" -e DATABASE_URL="${DATABASE_URL}" \
    postgres:15 sh -c "psql \"$DATABASE_URL\" -tA $*"
}

assert_zero() {
  # $1 = label, resto = query
  local label="$1"; shift
  local result
  result="$(psql_t -c "$*")"
  [[ "${result}" == "0" ]] || die "${label}: se esperaba 0, se obtuvo ${result}. Abortando."
  ok "${label}: ${result}"
}

# --- 1. Backup ------------------------------------------------------------
backup() {
  require_db_url
  info "Creando dump single-table de public.carta_events..."
  docker run --rm -v "${REPO_ROOT}:/work" -e DATABASE_URL="${DATABASE_URL}" \
    postgres:15 sh -c "pg_dump --dbname=\"$DATABASE_URL\" -t public.carta_events -Fc -f /work/carta_events_pre_swap.dump"
  [[ -s "${DUMP_FILE}" ]] || die "Dump vacío o inexistente: ${DUMP_FILE}"
  info "Checksum:"
  sha256sum "${DUMP_FILE}" 2>/dev/null || certutil -hashfile "${DUMP_FILE}" SHA256
  ok "Backup creado: ${DUMP_FILE}"
}

# --- 2. Prechecks (deben dar 0) -------------------------------------------
prechecks() {
  require_db_url
  info "Ejecutando prechecks estrictos (abort si != 0)..."
  assert_zero "NULLs en *_uuid" \
    "SELECT count(*) FROM public.carta_events WHERE carta_id_uuid IS NULL OR student_id_uuid IS NULL;"
  assert_zero "cartas huérfanas" \
    "SELECT count(*) FROM public.carta_events ce WHERE NOT EXISTS (SELECT 1 FROM public.cartas_disciplinarias c WHERE c.id = ce.carta_id_uuid);"
  assert_zero "estudiantes huérfanos" \
    "SELECT count(*) FROM public.carta_events ce WHERE NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id = ce.student_id_uuid);"
  ok "Prechecks OK (0 filas en los tres)"
}

# --- 3. Aplicar swap -------------------------------------------------------
swap() {
  require_db_url
  [[ -f "${SWAP_MIGRATION}" ]] || die "Migración swap no encontrada: ${SWAP_MIGRATION}"
  info "Aplicando swap: ${SWAP_MIGRATION}"
  docker run --rm -v "${REPO_ROOT}:/work" -e DATABASE_URL="${DATABASE_URL}" \
    postgres:15 sh -c "psql \"$DATABASE_URL\" -v ON_ERROR_STOP=1 -f /work/supabase/migrations/20260808000000_swap_carta_events_uuid_final.sql"
  ok "Swap aplicado sin errores"
}

# --- 4. Postchecks (inmediatos) --------------------------------------------
postchecks() {
  require_db_url
  info "Validaciones inmediatas post-swap..."
  assert_zero "NULLs en columnas canónicas" \
    "SELECT count(*) FROM public.carta_events WHERE carta_id IS NULL OR student_id IS NULL;"
  assert_zero "cartas huérfanas (canónico)" \
    "SELECT count(*) FROM public.carta_events ce WHERE NOT EXISTS (SELECT 1 FROM public.cartas_disciplinarias c WHERE c.id = ce.carta_id);"
  assert_zero "estudiantes huérfanos (canónico)" \
    "SELECT count(*) FROM public.carta_events ce WHERE NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id = ce.student_id);"
  info "Constraints:"
  psql_run -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='public.carta_events'::regclass ORDER BY conname;"
  info "Índices:"
  psql_run -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename='carta_events' ORDER BY indexname;"
  ok "Postchecks OK"
}

# --- 5. Drop final (solo tras 24-72h de observación) -----------------------
drop_final() {
  require_db_url
  [[ -f "${DROP_MIGRATION}" ]] || die "Migración drop no encontrada: ${DROP_MIGRATION}"
  info "Aplicando drop final: ${DROP_MIGRATION}"
  docker run --rm -v "${REPO_ROOT}:/work" -e DATABASE_URL="${DATABASE_URL}" \
    postgres:15 sh -c "psql \"$DATABASE_URL\" -v ON_ERROR_STOP=1 -f /work/supabase/migrations/20260808100000_drop_carta_events_text_columns.sql"
  info "Validando columnas e índices finales:"
  psql_run -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='carta_events' ORDER BY ordinal_position;"
  psql_run -c "SELECT indexname FROM pg_indexes WHERE tablename='carta_events' ORDER BY indexname;"
  ok "Drop final aplicado"
}

# --- 6. Rollback (restaurar dump) ------------------------------------------
rollback() {
  require_db_url
  [[ -s "${DUMP_FILE}" ]] || die "Dump no encontrado: ${DUMP_FILE}"
  info "Restaurando dump ${DUMP_FILE}..."
  docker run --rm -v "${REPO_ROOT}:/work" -e DATABASE_URL="${DATABASE_URL}" \
    postgres:15 sh -c "pg_restore --clean --no-owner --dbname=\"$DATABASE_URL\" /work/carta_events_pre_swap.dump"
  ok "Rollback completado"
}

# --- Monitor (0-72h) --------------------------------------------------------
monitor() {
  require_db_url
  info "Consultas activas sobre carta_events:"
  psql_run -c "SELECT pid, usename, state, wait_event_type, query FROM pg_stat_activity WHERE query ILIKE '%carta_events%' ORDER BY state DESC;"
}

# --- Main ------------------------------------------------------------------
main() {
  [[ $# -gt 0 ]] || die "Uso: $0 {--backup|--swap|--drop|--rollback|--monitor}"
  case "$1" in
    --backup)   backup; prechecks ;;
    --swap)     backup; prechecks; swap; postchecks ;;
    --drop)     drop_final ;;
    --rollback) rollback ;;
    --monitor)  monitor ;;
    *) die "Opción desconocida: $1" ;;
  esac
}

main "$@"
