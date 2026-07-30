-- Restrict Sistema Integral RPC endpoints without changing data, tables, RLS, or Storage.
-- The authenticated grant preserves browser calls and the service_role grant preserves Vercel PDF analysis.

revoke all on function public.current_tenant_id() from public, anon, authenticated, service_role;
revoke all on function public.current_app_role() from public, anon, authenticated, service_role;
revoke all on function public.current_user_memberships() from public, anon, authenticated, service_role;
revoke all on function public.has_app_access(text, text[]) from public, anon, authenticated, service_role;
revoke all on function public.get_student_annotation_summary() from public, anon, authenticated, service_role;
revoke all on function public.get_annotation_stage_counts() from public, anon, authenticated, service_role;
revoke all on function public.get_latest_analysis(uuid) from public, anon, authenticated, service_role;
revoke all on function public.get_usage_stats(timestamp with time zone, timestamp with time zone) from public, anon, authenticated, service_role;
revoke all on function public.get_daily_active_users(timestamp with time zone, timestamp with time zone) from public, anon, authenticated, service_role;
revoke all on function public.generate_process_number(uuid) from public, anon, authenticated, service_role;
revoke all on function public.get_suggested_letter_type(integer, integer, integer, uuid) from public, anon, authenticated, service_role;

-- Browser session and server fallback with the user's JWT.
grant execute on function public.current_tenant_id() to authenticated, service_role;
grant execute on function public.current_app_role() to authenticated, service_role;
grant execute on function public.current_user_memberships() to authenticated, service_role;
grant execute on function public.has_app_access(text, text[]) to authenticated, service_role;
grant execute on function public.get_student_annotation_summary() to authenticated, service_role;
grant execute on function public.get_annotation_stage_counts() to authenticated, service_role;
grant execute on function public.get_latest_analysis(uuid) to authenticated, service_role;
grant execute on function public.get_usage_stats(timestamp with time zone, timestamp with time zone) to authenticated, service_role;
grant execute on function public.get_daily_active_users(timestamp with time zone, timestamp with time zone) to authenticated, service_role;
grant execute on function public.generate_process_number(uuid) to authenticated, service_role;
grant execute on function public.get_suggested_letter_type(integer, integer, integer, uuid) to authenticated, service_role;

-- The unauthenticated landing dashboard intentionally exposes aggregate KPIs only.
revoke all on function public.get_public_dashboard_kpis() from public, anon, authenticated, service_role;
grant execute on function public.get_public_dashboard_kpis() to anon, authenticated, service_role;
