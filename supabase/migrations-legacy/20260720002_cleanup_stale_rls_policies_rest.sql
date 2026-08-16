-- ============================================================
-- Migration 20260720002: Cleanup stale RLS policies (rest)
--
-- Continúa la limpieza de políticas antiguas que quedaron
-- activas en courses, etapas_disciplinarias, document_templates,
-- students y profiles.
-- ============================================================

-- ============================================================
-- courses
-- ============================================================
DROP POLICY IF EXISTS "courses_select_staff" ON courses;
DROP POLICY IF EXISTS "courses_write_admin" ON courses;

-- ============================================================
-- etapas_disciplinarias
-- ============================================================
DROP POLICY IF EXISTS "etapas_select_staff" ON etapas_disciplinarias;
DROP POLICY IF EXISTS "etapas_update_staff" ON etapas_disciplinarias;
DROP POLICY IF EXISTS "etapas_write_staff" ON etapas_disciplinarias;

-- ============================================================
-- document_templates
-- ============================================================
DROP POLICY IF EXISTS "p_doc_templates_insert" ON document_templates;
DROP POLICY IF EXISTS "p_doc_templates_read" ON document_templates;
DROP POLICY IF EXISTS "p_doc_templates_update" ON document_templates;

-- ============================================================
-- students
-- ============================================================
DROP POLICY IF EXISTS "students_insert_staff" ON students;
DROP POLICY IF EXISTS "students_select_staff" ON students;
DROP POLICY IF EXISTS "students_update_staff" ON students;

-- ============================================================
-- profiles (se mantiene Allow public insert profiles para
-- el signup anónimo vía trigger handle_new_user)
-- ============================================================
DROP POLICY IF EXISTS "Allow public read profiles" ON profiles;

-- ============================================================
-- Refresh PostgREST schema cache
-- ============================================================
SELECT pg_notify('pgrst', 'reload schema');
