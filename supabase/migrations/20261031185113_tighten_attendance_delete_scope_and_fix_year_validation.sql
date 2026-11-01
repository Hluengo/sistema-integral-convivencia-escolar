DROP POLICY IF EXISTS p_absences_superuser_delete ON public.absences;
CREATE POLICY p_absences_superuser_delete
  ON public.absences FOR DELETE TO authenticated
  USING (
    public.is_superuser()
    AND public.has_app_access('inasistencias', ARRAY['superuser','admin','direccion'])
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = absences.student_id
        AND s.tenant_id = public.current_tenant_id()
    )
  );

CREATE OR REPLACE FUNCTION public.teacher_get_public_makeup_exams(
  p_month integer,
  p_year integer,
  p_level text DEFAULT NULL::text,
  p_course_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  makeup_exam_id uuid, student_name text, course_id uuid, course_name text,
  course_level text, subject text, original_date date, scheduled_date date,
  status text, observation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_month_start date;
  v_month_end date;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_app_access(
    'inasistencias', ARRAY['teacher','staff','superuser','admin','direccion']
  ) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  IF p_month IS NULL OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'p_month must be between 1 and 12';
  END IF;
  IF p_year IS NULL OR p_year < 2000 OR p_year > 2100 THEN
    RAISE EXCEPTION 'p_year must be between 2000 and 2100';
  END IF;

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end := (v_month_start + interval '1 month - 1 day')::date;

  RETURN QUERY
  SELECT m.id, s.full_name, c.id, c.name, c.level, m.subject,
    m.original_date, m.scheduled_date, m.status, m.notes
  FROM public.makeup_exams m
  JOIN public.students s ON s.id = m.student_id
    AND s.tenant_id = public.current_tenant_id()
  JOIN public.courses c ON c.id = s.course_id
    AND c.tenant_id = public.current_tenant_id()
  WHERE m.tenant_id = public.current_tenant_id()
    AND m.scheduled_date BETWEEN v_month_start AND v_month_end
    AND (p_level IS NULL OR c.level = p_level)
    AND (p_course_id IS NULL OR c.id = p_course_id)
  ORDER BY m.scheduled_date, s.full_name, m.subject;
END;
$function$;
