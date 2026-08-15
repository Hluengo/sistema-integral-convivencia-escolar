-- Reproduce the live grant state for teacher RPCs.
-- Public/anon execution is intentionally closed; authenticated teachers and
-- service_role retain access through the existing function contracts.
REVOKE ALL ON FUNCTION public.teacher_get_instant_messages(text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.teacher_get_instant_messages(text, uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.teacher_get_public_absence_detail(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.teacher_get_public_absence_detail(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.teacher_get_public_absences(integer, integer, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.teacher_get_public_absences(integer, integer, text, uuid) TO authenticated, service_role;
