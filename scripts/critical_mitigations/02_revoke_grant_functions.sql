-- =============================================================================
-- 02_revoke_grant_functions.sql — SEC-B: REVOKE EXECUTE funciones sensibles
-- Aplicado en producción 2026-08-08 (proyecto mjhbcqwtjzgvqssfiore)
-- =============================================================================
-- set_tenant_id(uuid)      → solo service_role (permite cambiar tenant)
-- process_audit_log()      → trigger interno (absences, students)
-- clean_old_logs(integer)  → mantenimiento, solo service_role
-- sync_tenant_to_jwt()     → trigger interno (profiles); revocar grant PUBLIC
-- handle_new_user()        → trigger interno de signup
--
-- Los triggers siguen funcionando: PostgreSQL no exige EXECUTE del usuario
-- que dispara la DML para la ejecución interna de la función-trigger.
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.set_tenant_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_tenant_id(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.set_tenant_id(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.process_audit_log() FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_audit_log() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.process_audit_log() TO service_role;

REVOKE EXECUTE ON FUNCTION public.clean_old_logs(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.clean_old_logs(integer) TO service_role;

REVOKE ALL ON FUNCTION public.sync_tenant_to_jwt() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_tenant_to_jwt() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_tenant_to_jwt() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sync_tenant_to_jwt() TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
