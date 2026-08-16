-- Restaura el EXECUTE de current_role() para anon y authenticated.
--
-- Contexto: el baseline (00000_remote_schema_baseline.sql, líneas 3576-3579)
-- concede EXECUTE de current_role() a anon, authenticated y service_role.
-- Un REVOKE aplicado fuera de las migraciones locales dejó el ACL real con
-- solo {postgres, service_role}, lo que rompe las policies RLS is_staff()/
-- is_superuser() (que usan current_role()) para usuarios authenticated y anon
-- (error 42501 "permission denied for function current_role") en courses,
-- inspectorate_records, students, etc.
--
-- current_role() es SECURITY DEFINER y para anon devuelve 'teacher'
-- (auth.uid() es NULL), por lo que no expone datos: is_staff()/is_superuser()
-- evalúan false. Se restaura el estado documentado del baseline.

GRANT EXECUTE ON FUNCTION public.current_role() TO anon;
GRANT EXECUTE ON FUNCTION public.current_role() TO authenticated;

-- Cierra el drift de get_annual_annotation_trend: la migración
-- 20260806120000 revocó EXECUTE de anon, pero como anon es miembro de PUBLIC,
-- el default =X/postgres seguía permitiendo EXECUTE (mismo bug que SEC-02 en
-- app_role). REVOKE FROM PUBLIC quita el default; authenticated y service_role
-- conservan sus grants explícitos de la migración original.

REVOKE EXECUTE ON FUNCTION public.get_annual_annotation_trend(integer) FROM PUBLIC;

-- Verificación esperada tras aplicar:
--   SELECT has_function_privilege('anon', 'public.current_role()', 'EXECUTE');          -- true
--   SELECT has_function_privilege('authenticated', 'public.current_role()', 'EXECUTE'); -- true
--   SELECT has_function_privilege('service_role', 'public.current_role()', 'EXECUTE');  -- true
--   SELECT has_function_privilege('anon', 'public.get_annual_annotation_trend(integer)', 'EXECUTE'); -- false
--   SELECT has_function_privilege('authenticated', 'public.get_annual_annotation_trend(integer)', 'EXECUTE'); -- true
