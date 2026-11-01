-- Teachers can read attendance data, but cannot mutate it.
-- Keep application boundaries explicit because this database is shared with Convivencia.

DROP POLICY IF EXISTS p_absences_staff_select ON public.absences;
CREATE POLICY p_absences_staff_select
  ON public.absences FOR SELECT TO authenticated
  USING (
    public.has_app_access('inasistencias', ARRAY['teacher','staff','superuser','admin','direccion'])
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = absences.student_id
        AND s.tenant_id = public.current_tenant_id()
    )
  );

DROP POLICY IF EXISTS p_absences_staff_insert ON public.absences;
CREATE POLICY p_absences_staff_insert
  ON public.absences FOR INSERT TO authenticated
  WITH CHECK (
    public.has_app_access('inasistencias', ARRAY['staff','superuser','admin','direccion'])
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = absences.student_id
        AND s.tenant_id = public.current_tenant_id()
    )
  );

DROP POLICY IF EXISTS p_absences_staff_update ON public.absences;
CREATE POLICY p_absences_staff_update
  ON public.absences FOR UPDATE TO authenticated
  USING (
    public.has_app_access('inasistencias', ARRAY['staff','superuser','admin','direccion'])
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = absences.student_id
        AND s.tenant_id = public.current_tenant_id()
    )
  )
  WITH CHECK (
    public.has_app_access('inasistencias', ARRAY['staff','superuser','admin','direccion'])
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = absences.student_id
        AND s.tenant_id = public.current_tenant_id()
    )
  );

DROP POLICY IF EXISTS p_tests_staff_select ON public.tests;
CREATE POLICY p_tests_staff_select
  ON public.tests FOR SELECT TO authenticated
  USING (
    public.has_app_access('inasistencias', ARRAY['teacher','staff','superuser','admin','direccion'])
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = tests.course_id
        AND c.tenant_id = public.current_tenant_id()
    )
  );

DROP POLICY IF EXISTS p_tests_staff_insert ON public.tests;
CREATE POLICY p_tests_staff_insert
  ON public.tests FOR INSERT TO authenticated
  WITH CHECK (
    public.has_app_access('inasistencias', ARRAY['staff','superuser','admin','direccion'])
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = tests.course_id
        AND c.tenant_id = public.current_tenant_id()
    )
  );

DROP POLICY IF EXISTS p_tests_staff_update ON public.tests;
CREATE POLICY p_tests_staff_update
  ON public.tests FOR UPDATE TO authenticated
  USING (
    public.has_app_access('inasistencias', ARRAY['staff','superuser','admin','direccion'])
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = tests.course_id
        AND c.tenant_id = public.current_tenant_id()
    )
  )
  WITH CHECK (
    public.has_app_access('inasistencias', ARRAY['staff','superuser','admin','direccion'])
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = tests.course_id
        AND c.tenant_id = public.current_tenant_id()
    )
  );

DROP POLICY IF EXISTS makeup_exams_staff_select ON public.makeup_exams;
CREATE POLICY makeup_exams_staff_select
  ON public.makeup_exams FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.has_app_access('inasistencias', ARRAY['teacher','staff','superuser','admin','direccion'])
  );

CREATE OR REPLACE FUNCTION public.teacher_get_public_absences(
  p_month integer,
  p_year integer,
  p_level text DEFAULT NULL::text,
  p_course_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  absence_id uuid, student_name text, course_id uuid, course_name text,
  course_level text, start_date date, end_date date, status text,
  observation text, affected_tests_count integer
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
  SELECT a.id, s.full_name, c.id, c.name, c.level,
    a.start_date, a.end_date, a.status, a.observation,
    COALESCE(ta.affected_tests_count, 0)::int
  FROM public.absences a
  JOIN public.students s ON s.id = a.student_id
    AND s.tenant_id = public.current_tenant_id()
  JOIN public.courses c ON c.id = s.course_id
    AND c.tenant_id = public.current_tenant_id()
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS affected_tests_count
    FROM public.tests t
    WHERE t.course_id = c.id
      AND t.date BETWEEN a.start_date AND a.end_date
      AND t.date BETWEEN v_month_start AND v_month_end
  ) ta ON true
  WHERE a.start_date <= v_month_end
    AND a.end_date >= v_month_start
    AND (p_level IS NULL OR c.level = p_level)
    AND (p_course_id IS NULL OR c.id = p_course_id)
  ORDER BY a.start_date DESC, s.full_name ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.teacher_get_public_absence_detail(p_absence_id uuid)
RETURNS TABLE(id uuid, date date, subject text, type text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT t.id, t.date, t.subject, t.type
  FROM public.absences a
  JOIN public.students s ON s.id = a.student_id
    AND s.tenant_id = public.current_tenant_id()
  JOIN public.tests t ON t.course_id = s.course_id
  WHERE a.id = p_absence_id
    AND public.has_app_access(
      'inasistencias', ARRAY['teacher','staff','superuser','admin','direccion']
    )
    AND t.date BETWEEN a.start_date AND a.end_date
  ORDER BY t.date;
$function$;

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
