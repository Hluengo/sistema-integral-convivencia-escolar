-- Restrict the dashboard KPI RPC to signed-in users.
-- Keeps service_role/postgres access while removing anonymous execution.
REVOKE EXECUTE ON FUNCTION public.get_public_dashboard_kpis() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_public_dashboard_kpis() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_public_dashboard_kpis() TO authenticated;
