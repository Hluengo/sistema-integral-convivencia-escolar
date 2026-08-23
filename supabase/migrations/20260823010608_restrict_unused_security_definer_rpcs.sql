REVOKE EXECUTE ON FUNCTION public.generate_process_number(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_dashboard_kpis() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_app_access(text, text[]) FROM authenticated;
