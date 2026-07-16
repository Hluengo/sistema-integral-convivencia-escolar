-- Replace open anon policies with authenticated staff policies
-- NOTE: keeps temporary authenticated full-staff access; tighten profesor_jefe later via course_ids

-- Enable RLS
ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inspectorate_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS causas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cartas_disciplinarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS etapas_disciplinarias ENABLE ROW LEVEL SECURITY;

-- Drop known open anon policies (idempotent)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'students', 'courses', 'inspectorate_records',
        'causas', 'cartas_disciplinarias', 'etapas_disciplinarias'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- STUDENTS
CREATE POLICY students_select_staff ON students
  FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY students_insert_staff ON students
  FOR INSERT TO authenticated
  WITH CHECK (public.current_app_role() IN ('admin', 'direccion', 'convivencia', 'inspectoria'));

CREATE POLICY students_update_staff ON students
  FOR UPDATE TO authenticated
  USING (public.current_app_role() IN ('admin', 'direccion', 'convivencia', 'inspectoria'));

-- COURSES
CREATE POLICY courses_select_staff ON courses
  FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY courses_write_admin ON courses
  FOR ALL TO authenticated
  USING (public.current_app_role() IN ('admin', 'direccion'))
  WITH CHECK (public.current_app_role() IN ('admin', 'direccion'));

-- INSPECTORATE RECORDS
CREATE POLICY inspectorate_select_staff ON inspectorate_records
  FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY inspectorate_insert_staff ON inspectorate_records
  FOR INSERT TO authenticated
  WITH CHECK (public.current_app_role() IN ('admin', 'direccion', 'convivencia', 'inspectoria', 'profesor_jefe'));

CREATE POLICY inspectorate_update_staff ON inspectorate_records
  FOR UPDATE TO authenticated
  USING (public.current_app_role() IN ('admin', 'direccion', 'convivencia', 'inspectoria'));

CREATE POLICY inspectorate_delete_admin ON inspectorate_records
  FOR DELETE TO authenticated
  USING (public.current_app_role() IN ('admin', 'convivencia'));

-- CAUSAS
CREATE POLICY causas_select_staff ON causas
  FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY causas_write_staff ON causas
  FOR INSERT TO authenticated
  WITH CHECK (public.current_app_role() IN ('admin', 'direccion', 'convivencia', 'inspectoria'));

CREATE POLICY causas_update_staff ON causas
  FOR UPDATE TO authenticated
  USING (public.current_app_role() IN ('admin', 'direccion', 'convivencia', 'inspectoria'));

-- CARTAS
CREATE POLICY cartas_select_staff ON cartas_disciplinarias
  FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY cartas_write_convivencia ON cartas_disciplinarias
  FOR INSERT TO authenticated
  WITH CHECK (public.current_app_role() IN ('admin', 'direccion', 'convivencia', 'inspectoria'));

CREATE POLICY cartas_update_convivencia ON cartas_disciplinarias
  FOR UPDATE TO authenticated
  USING (public.current_app_role() IN ('admin', 'direccion', 'convivencia'));

CREATE POLICY cartas_delete_admin ON cartas_disciplinarias
  FOR DELETE TO authenticated
  USING (public.current_app_role() IN ('admin', 'convivencia'));

-- ETAPAS
CREATE POLICY etapas_select_staff ON etapas_disciplinarias
  FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY etapas_write_staff ON etapas_disciplinarias
  FOR INSERT TO authenticated
  WITH CHECK (public.current_app_role() IN ('admin', 'direccion', 'convivencia', 'inspectoria'));

CREATE POLICY etapas_update_staff ON etapas_disciplinarias
  FOR UPDATE TO authenticated
  USING (public.current_app_role() IN ('admin', 'direccion', 'convivencia'));

-- Grants for authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
