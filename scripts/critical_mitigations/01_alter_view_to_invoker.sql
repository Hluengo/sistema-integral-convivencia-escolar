-- =============================================================================
-- 01_alter_view_to_invoker.sql — SEC-A: teacher_public_view
-- Aplicado en producción 2026-08-08 (proyecto mjhbcqwtjzgvqssfiore)
-- =============================================================================
-- teacher_public_view exponía PII (ausencias + estudiantes + cursos) a
-- authenticated sin filtro de tenant y con grants DML. Con security_invoker
-- pasa a aplicar las RLS de las tablas base (filtro por tenant_id).
-- Se revocan los DML sobre la vista (solo lectura).
-- =============================================================================

ALTER VIEW public.teacher_public_view SET (security_invoker = true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.teacher_public_view FROM authenticated;
REVOKE ALL ON public.teacher_public_view FROM anon;
GRANT SELECT ON public.teacher_public_view TO authenticated;
