-- Las funciones de la cadena solo deben ser ejecutables por service_role.
REVOKE EXECUTE ON FUNCTION public.stamp_audit_event_hash() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_audit_event_chain(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_audit_event_chain(uuid) TO service_role;
