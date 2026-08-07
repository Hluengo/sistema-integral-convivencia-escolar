-- RPC get_tenant_user_counts: devuelve el conteo de usuarios (profiles) por
-- tenant en una sola query agregada.
--
-- PERF-02: GET /api/platform/tenants iteraba todos los colegios y ejecutaba
-- profiles.select(count) por cada uno (N+1). Con 200 colegios eran 201
-- queries. Esta función devuelve todos los conteos con GROUP BY tenant_id en
-- una sola ejecución.
--
-- Solo la invoca el backend con service_role (superadmin), por lo que se
-- concede EXECUTE solo a service_role.

CREATE OR REPLACE FUNCTION public.get_tenant_user_counts()
RETURNS TABLE (
  tenant_id uuid,
  user_count bigint
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.tenant_id, count(*)::bigint AS user_count
  FROM public.profiles p
  GROUP BY p.tenant_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_user_counts() TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_tenant_user_counts() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_tenant_user_counts() FROM anon;

-- Verificación esperada tras aplicar:
--   SELECT has_function_privilege('anon', 'public.get_tenant_user_counts()', 'EXECUTE'); -- false
--   SELECT has_function_privilege('service_role', 'public.get_tenant_user_counts()', 'EXECUTE'); -- true
