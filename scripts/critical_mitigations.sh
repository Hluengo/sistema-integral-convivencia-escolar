#!/usr/bin/env bash
# =============================================================================
# critical_mitigations.sh — Runbook de mitigaciones críticas de seguridad
#
# Auditoría 2026-08-08 — hallazgos SEC (security-advisors de Supabase).
# Aplica en orden: A (view invoker) → B (REVOKE/GRANT) → C (search_path).
# Por defecto imprime el SQL (dry-run). Con --apply lo ejecuta vía Docker+psql.
#
# Requiere: $DATABASE_URL (cadena de conexión real), Docker, psql disponible.
#
# Uso:
#   bash scripts/critical_mitigations.sh                 # dry-run (imprime SQL)
#   bash scripts/critical_mitigations.sh --apply         # ejecuta los 3 pasos
#   bash scripts/critical_mitigations.sh --verify        # solo verificaciones
#   bash scripts/critical_mitigations.sh --help          # ayuda
#
# ⚠️  NO incluye (fuera de alcance por ahora):
#   - D) leaked-password protection: toggle manual en Supabase Console
#        (Authentication → Security → Leaked password protection → Enable).
#   - E) drop final DB-01: requiere 24-72h de observación post-swap
#        (usar scripts/run_swap_carta_events.sh --drop).
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="${REPO_ROOT}/scripts/critical_mitigations"

# --- Helpers ---------------------------------------------------------------
die() { echo "❌ $*" >&2; exit 1; }
info() { echo "ℹ️  $*"; }
ok()   { echo "✅ $*"; }

require_db_url() {
  [[ -n "${DATABASE_URL:-}" ]] || die "DATABASE_URL no está definida. Exportar antes de ejecutar."
}

psql_run() {
  docker run --rm -v "${REPO_ROOT}:/work" -e DATABASE_URL="${DATABASE_URL}" \
    postgres:15 sh -c "psql \"$DATABASE_URL\" $*"
}

# --- A) teacher_public_view → SECURITY INVOKER + solo lectura ---------------
# La vista exponía PII (ausencias+estudiantes+cursos) sin filtro de tenant y
# con grants DML a authenticated. security_invoker=true hace que aplique RLS
# de las tablas base (filtro por tenant). Se revoca INSERT/UPDATE/DELETE.
step_a() {
  info "A) teacher_public_view → security_invoker + solo SELECT"
  cat <<'SQL'
-- ============================================================
-- A) teacher_public_view: SECURITY INVOKER + solo lectura
-- (la vista pasa a aplicar RLS de las tablas base por tenant)
-- ============================================================
ALTER VIEW public.teacher_public_view SET (security_invoker = true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.teacher_public_view FROM authenticated;
REVOKE ALL ON public.teacher_public_view FROM anon;
GRANT SELECT ON public.teacher_public_view TO authenticated;
SQL
}

# --- B) REVOKE EXECUTE en funciones sensibles -------------------------------
# set_tenant_id(uuid), process_audit_log(), clean_old_logs(integer),
# sync_tenant_to_jwt(), handle_new_user().
# Los triggers se siguen disparando: PostgreSQL no exige EXECUTE del usuario
# para disparos internos. Solo service_role las invoca directamente.
step_b() {
  info "B) REVOKE EXECUTE de anon/authenticated en funciones sensibles"
  cat <<'SQL'
-- ============================================================
-- B) REVOKE EXECUTE de anon/authenticated en funciones sensibles
-- (triggers siguen funcionando: Postgres no requiere EXECUTE
--  para disparos internos; solo service_role las invoca directo)
-- ============================================================
-- set_tenant_id(uuid): solo service_role (permite cambiar tenant)
REVOKE EXECUTE ON FUNCTION public.set_tenant_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_tenant_id(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.set_tenant_id(uuid) TO service_role;

-- process_audit_log(): trigger interno, no invocable por usuarios
REVOKE EXECUTE ON FUNCTION public.process_audit_log() FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_audit_log() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.process_audit_log() TO service_role;

-- clean_old_logs(integer): mantenimiento, solo service_role
REVOKE EXECUTE ON FUNCTION public.clean_old_logs(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.clean_old_logs(integer) TO service_role;

-- sync_tenant_to_jwt(): trigger interno + revocar grant a PUBLIC
REVOKE ALL ON FUNCTION public.sync_tenant_to_jwt() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_tenant_to_jwt() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_tenant_to_jwt() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sync_tenant_to_jwt() TO service_role;

-- handle_new_user(): trigger interno de signup, no invocable directo
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
SQL
}

# --- C) Endurecer search_path en funciones reportadas ------------------------
# app_role(), audit_logs_sync_actor_columns(), get_absence_stats(),
# is_management(), update_updated_at_column() (solo public).
# CREATE OR REPLACE conserva la OID → triggers existentes intactos.
# NOTA: is_management() original usaba p.id (inexistente); se corrige a p.user_id.
step_c() {
  info "C) Endurecer search_path en funciones con search_path mutable"
  cat <<'SQL'
-- ============================================================
-- C) Endurecer search_path (batch corregido: is_management usa user_id)
-- ============================================================

CREATE OR REPLACE FUNCTION public.app_role()
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  select p.role
  from public.profiles p
  where p.user_id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.audit_logs_sync_actor_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.performed_by is null and new.changed_by is not null then
    new.performed_by := new.changed_by;
  end if;

  if new.changed_by is null and new.performed_by is not null then
    new.changed_by := new.performed_by;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_absence_stats(p_level text, p_course_id uuid, p_start_date date, p_end_date date)
RETURNS TABLE(total bigint, justified bigint, pending bigint, with_tests bigint, without_doc bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH base AS (
    SELECT a.id, a.student_id, a.start_date, a.end_date, a.status, a.document_url, s.course_id
    FROM public.absences a
    JOIN public.students s ON s.id = a.student_id
    JOIN public.courses c ON c.id = s.course_id
    WHERE (p_level IS NULL OR c.level = p_level)
      AND (p_course_id IS NULL OR s.course_id = p_course_id)
      AND (
        (p_start_date IS NULL AND p_end_date IS NULL)
        OR (p_start_date IS NULL AND a.start_date <= p_end_date)
        OR (p_end_date IS NULL AND a.end_date >= p_start_date)
        OR (a.start_date <= p_end_date AND a.end_date >= p_start_date)
      )
  )
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'JUSTIFICADA') AS justified,
    COUNT(*) FILTER (WHERE status = 'PENDIENTE') AS pending,
    COUNT(*) FILTER (WHERE document_url IS NULL) AS without_doc,
    COUNT(*) FILTER (
      WHERE EXISTS (
        SELECT 1
        FROM public.tests t
        WHERE t.course_id = base.course_id
          AND t.date >= base.start_date
          AND t.date <= base.end_date
      )
    ) AS with_tests
  FROM base;
$function$;

CREATE OR REPLACE FUNCTION public.is_management()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT public.is_superuser()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role IN ('inspector', 'coordinador', 'director')
  );
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
SQL
}

# --- Verificación post-cambio -------------------------------------------------
verify() {
  require_db_url
  info "Verificaciones (A/B/C)..."
  psql_run -c "SELECT relname, reloptions FROM pg_class WHERE relname='teacher_public_view';"
  psql_run -c "SELECT p.proname, string_agg(rrg.grantee, ',' ORDER BY rrg.grantee) FILTER (WHERE rrg.privilege_type='EXECUTE') AS execute_grantees FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace LEFT JOIN information_schema.role_routine_grants rrg ON rrg.routine_name=p.proname AND rrg.routine_schema=n.nspname WHERE n.nspname='public' AND p.proname IN ('set_tenant_id','process_audit_log','clean_old_logs','sync_tenant_to_jwt','handle_new_user') GROUP BY p.proname ORDER BY p.proname;"
  psql_run -c "SELECT p.proname, pg_get_functiondef(p.oid) LIKE '%SET search_path TO %' AS has_search_path FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('app_role','audit_logs_sync_actor_columns','get_absence_stats','is_management','update_updated_at_column') ORDER BY p.proname;"
  psql_run -c "SELECT t.tgname, c.relname AS table_name, p.proname AS func FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_proc p ON p.oid=t.tgfoid WHERE NOT t.tgisinternal AND p.proname IN ('update_updated_at_column','audit_logs_sync_actor_columns','process_audit_log','sync_tenant_to_jwt') ORDER BY p.proname, c.relname;"
  psql_run -c "SELECT public.is_management() AS is_management_result, public.app_role() AS app_role_result;"
  ok "Verificación completada"
}

# --- Main ------------------------------------------------------------------
main() {
  local mode="${1:---dry-run}"
  case "${mode}" in
    --apply)
      require_db_url
      info "Aplicando A + B + C en ${DATABASE_URL%%@*}..."
      step_a | psql_run -v ON_ERROR_STOP=1
      step_b | psql_run -v ON_ERROR_STOP=1
      step_c | psql_run -v ON_ERROR_STOP=1
      verify
      ok "Runbook aplicado"
      ;;
    --verify)
      verify
      ;;
    --help|-h)
      sed -n '1,28p' "${BASH_SOURCE[0]}"
      ;;
    --dry-run|*)
      step_a
      echo
      step_b
      echo
      step_c
      ok "Dry-run: revisar SQL antes de --apply"
      ;;
  esac
}

main "$@"
