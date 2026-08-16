-- SEC-02 fix: `app_role()` seguía ejecutable por anon vía el grant default a
-- PUBLIC (acl de función recién creada). El REVOKE FROM anon de
-- 20260806093000 quita el grant directo, pero como anon es miembro de PUBLIC,
-- el default `=x/owner` seguía permitiendo EXECUTE.
--
-- Se revoca de PUBLIC (authenticated y service_role conservan sus grants
-- explícitos registrados en el baseline/00000 y en las políticas RLS).

REVOKE ALL ON FUNCTION public.app_role() FROM PUBLIC;

-- Verificación esperada tras aplicar:
--   SELECT has_function_privilege('anon', 'public.app_role()', 'EXECUTE'); -- false
--   SELECT has_function_privilege('authenticated', 'public.app_role()', 'EXECUTE'); -- true
--   SELECT has_function_privilege('service_role', 'public.app_role()', 'EXECUTE'); -- true
