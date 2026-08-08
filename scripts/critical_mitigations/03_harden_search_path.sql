-- =============================================================================
-- 03_harden_search_path.sql — SEC-C: endurecer search_path
-- Aplicado en producción 2026-08-08 (proyecto mjhbcqwtjzgvqssfiore)
-- =============================================================================
-- Las 5 funciones reportadas por security-advisors tenían search_path mutable
-- ($user, public, extensions). Se fija 'public, pg_temp' (mismo patrón que las
-- demás funciones endurecidas). CREATE OR REPLACE conserva la OID → los
-- triggers existentes que las invocan siguen apuntando a la misma función.
--
-- ⚠️  is_management() original usaba "p.id = auth.uid()" (columna inexistente:
--     profiles usa user_id). La función nunca pudo devolver true por esa vía.
--     Se corrige a p.user_id — bug latente reparado de paso.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.app_role()
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  select p.role
  from public.profiles p
  where p.user_id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.audit_logs_sync_actor_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.performed_by is null and new.changed_by is not null then
    new.performed_by := new.changed_by;
  end if;

  if new.changed_by is null and new.performed_by is not null then
    new.changed_by := new.performed_by;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_absence_stats(p_level text, p_course_id uuid, p_start_date date, p_end_date date)
RETURNS TABLE(total bigint, justified bigint, pending bigint, with_tests bigint, without_doc bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH base AS (
    SELECT a.id, a.student_id, a.start_date, a.end_date, a.status, a.document_url, s.course_id
    FROM public.absences a
    JOIN public.students s ON s.id = a.student_id
    JOIN public.courses c ON c.id = s.course_id
    WHERE (p_level IS NULL OR c.level = p_level)
      AND (p_course_id IS NULL OR s.course_id = p_course_id)
      AND (
        (p_start_date IS NULL AND p_end_date IS NULL)
        OR (p_start_date IS NULL AND a.start_date <= p_end_date)
        OR (p_end_date IS NULL AND a.end_date >= p_start_date)
        OR (a.start_date <= p_end_date AND a.end_date >= p_start_date)
      )
  )
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'JUSTIFICADA') AS justified,
    COUNT(*) FILTER (WHERE status = 'PENDIENTE') AS pending,
    COUNT(*) FILTER (WHERE document_url IS NULL) AS without_doc,
    COUNT(*) FILTER (
      WHERE EXISTS (
        SELECT 1
        FROM public.tests t
        WHERE t.course_id = base.course_id
          AND t.date >= base.start_date
          AND t.date <= base.end_date
      )
    ) AS with_tests
  FROM base;
$function$;

CREATE OR REPLACE FUNCTION public.is_management()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT public.is_superuser()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role IN ('inspector', 'coordinador', 'director')
  );
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
