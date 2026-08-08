-- =============================================================================
-- 04_verify.sql — Verificaciones post-mitigación (A/B/C)
-- =============================================================================
-- Ejecutar después de aplicar los pasos A, B y C. Todos deben responder OK.

-- A) teacher_public_view debe tener reloptions = {security_invoker=true}
SELECT relname, reloptions
FROM pg_class
WHERE relname = 'teacher_public_view';

-- A) Grants de la vista: solo SELECT para authenticated; nada para anon
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'teacher_public_view'
ORDER BY grantee, privilege_type;

-- B) EXECUTE de funciones sensibles: solo postgres y service_role
SELECT p.proname,
       COALESCE(string_agg(rrg.grantee, ',' ORDER BY rrg.grantee)
                FILTER (WHERE rrg.privilege_type = 'EXECUTE'), '') AS execute_grantees
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
LEFT JOIN information_schema.role_routine_grants rrg
       ON rrg.routine_name = p.proname AND rrg.routine_schema = n.nspname
WHERE n.nspname = 'public'
  AND p.proname IN ('set_tenant_id','process_audit_log','clean_old_logs',
                    'sync_tenant_to_jwt','handle_new_user')
GROUP BY p.proname
ORDER BY p.proname;

-- C) search_path endurecido en las 5 funciones
SELECT p.proname, pg_get_functiondef(p.oid) LIKE '%SET search_path TO %' AS has_search_path
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('app_role','audit_logs_sync_actor_columns','get_absence_stats',
                    'is_management','update_updated_at_column')
ORDER BY p.proname;

-- C) Triggers intactos y habilitados tras CREATE OR REPLACE
SELECT t.tgname, c.relname AS table_name, p.proname AS func, t.tgenabled
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal
  AND p.proname IN ('update_updated_at_column','audit_logs_sync_actor_columns',
                    'process_audit_log','sync_tenant_to_jwt')
ORDER BY p.proname, c.relname;

-- C) Smoke: is_management() y app_role() compilan sin error
-- (en sesión anónima deben devolver false/null sin excepción)
SELECT public.is_management() AS is_management_result,
       public.app_role() AS app_role_result;
