-- Revoca permisos directos del rol anon sobre las tablas del schema public.
--
-- Contexto: el baseline (00000_remote_schema_baseline.sql) otorga
-- GRANT ALL ON TABLE ... TO anon en 57 objetos (students, profiles, causas,
-- cartas_disciplinarias, inspectorate_records, etc.). El RLS está habilitado y
-- no hay policies para anon, por lo que el aislamiento se mantiene hoy, pero
-- esto es defensa en profundidad débil: si en el futuro se crea una policy sin
-- restringir rol o se deshabilita RLS, anon tendría acceso total.
--
-- Esta migración revoca el acceso directo a tablas. Los flujos públicos que
-- requieren datos (dashboard público, vista docente) usan funciones
-- SECURITY DEFINER con grants propios (get_public_dashboard_kpis,
-- teacher_get_public_*), que NO se ven afectadas por este REVOKE.
--
-- Regla: las políticas RLS siguen siendo la primera línea de defensa; este
-- REVOKE es la segunda capa (least privilege).

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- SEC-02: revoca ejecución de funciones internas que no deben ser invocables
-- por anon. app_role() resuelve el rol del usuario desde auth.uid() y no tiene
-- uso legítimo público. current_app_role()/current_tenant_id() son usadas por
-- las RLS policies (se evalúan como SECURITY DEFINER dentro del contexto de la
-- policy) y conservan su grant para authenticated vía las policies, pero
-- anon no debe invocarlas directamente.

REVOKE ALL ON FUNCTION public.app_role() FROM anon;
REVOKE ALL ON FUNCTION public.current_app_role() FROM anon;
REVOKE ALL ON FUNCTION public.current_tenant_id() FROM anon;
REVOKE ALL ON FUNCTION public.clean_old_logs(integer) FROM anon;
REVOKE ALL ON FUNCTION public.count_affected_tests(uuid, date, date) FROM anon;

-- Verificación esperada tras aplicar:
--   SELECT has_table_privilege('anon', 'public.students', 'SELECT');  -- false
--   SELECT has_table_privilege('anon', 'public.causas', 'SELECT');    -- false
--   SELECT has_function_privilege('anon', 'public.app_role()', 'EXECUTE'); -- false
--   SELECT has_function_privilege('anon', 'public.get_public_dashboard_kpis()', 'EXECUTE'); -- true
