-- ============================================================
-- Fix: Políticas RLS para todas las tablas del sistema
-- Ejecutar en: Supabase SQL Editor
-- Colegio Carmela Romero de Espinosa
-- ============================================================

-- ============================================================
-- 1. students
-- ============================================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN DROP POLICY IF EXISTS "students_select_anon" ON students; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "students_insert_anon" ON students; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "students_update_anon" ON students; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "students_select_anon" ON students FOR SELECT USING (true);
CREATE POLICY "students_insert_anon" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "students_update_anon" ON students FOR UPDATE USING (true);

-- ============================================================
-- 2. courses
-- ============================================================
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN DROP POLICY IF EXISTS "courses_select_anon" ON courses; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "courses_insert_anon" ON courses; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "courses_update_anon" ON courses; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "courses_select_anon" ON courses FOR SELECT USING (true);
CREATE POLICY "courses_insert_anon" ON courses FOR INSERT WITH CHECK (true);
CREATE POLICY "courses_update_anon" ON courses FOR UPDATE USING (true);

-- ============================================================
-- 3. inspectorate_records (TABLA CON PROBLEMA)
-- ============================================================
ALTER TABLE inspectorate_records ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN DROP POLICY IF EXISTS "inspectorate_select_anon" ON inspectorate_records; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "inspectorate_insert_anon" ON inspectorate_records; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "inspectorate_update_anon" ON inspectorate_records; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "inspectorate_select_anon" ON inspectorate_records FOR SELECT USING (true);
CREATE POLICY "inspectorate_insert_anon" ON inspectorate_records FOR INSERT WITH CHECK (true);
CREATE POLICY "inspectorate_update_anon" ON inspectorate_records FOR UPDATE USING (true);

-- ============================================================
-- 4. causas
-- ============================================================
ALTER TABLE causas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN DROP POLICY IF EXISTS "causas_select_anon" ON causas; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "causas_insert_anon" ON causas; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "causas_update_anon" ON causas; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "causas_select_anon" ON causas FOR SELECT USING (true);
CREATE POLICY "causas_insert_anon" ON causas FOR INSERT WITH CHECK (true);
CREATE POLICY "causas_update_anon" ON causas FOR UPDATE USING (true);

-- ============================================================
-- 5. cartas_disciplinarias
-- ============================================================
ALTER TABLE cartas_disciplinarias ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN DROP POLICY IF EXISTS "cartas_select_anon" ON cartas_disciplinarias; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "cartas_insert_anon" ON cartas_disciplinarias; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "cartas_update_anon" ON cartas_disciplinarias; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "cartas_delete_anon" ON cartas_disciplinarias; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "cartas_select_anon" ON cartas_disciplinarias FOR SELECT USING (true);
CREATE POLICY "cartas_insert_anon" ON cartas_disciplinarias FOR INSERT WITH CHECK (true);
CREATE POLICY "cartas_update_anon" ON cartas_disciplinarias FOR UPDATE USING (true);
CREATE POLICY "cartas_delete_anon" ON cartas_disciplinarias FOR DELETE USING (true);

-- ============================================================
-- 6. etapas_disciplinarias
-- ============================================================
ALTER TABLE etapas_disciplinarias ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN DROP POLICY IF EXISTS "etapas_select_anon" ON etapas_disciplinarias; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "etapas_insert_anon" ON etapas_disciplinarias; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "etapas_update_anon" ON etapas_disciplinarias; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "etapas_delete_anon" ON etapas_disciplinarias; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "etapas_select_anon" ON etapas_disciplinarias FOR SELECT USING (true);
CREATE POLICY "etapas_insert_anon" ON etapas_disciplinarias FOR INSERT WITH CHECK (true);
CREATE POLICY "etapas_update_anon" ON etapas_disciplinarias FOR UPDATE USING (true);
CREATE POLICY "etapas_delete_anon" ON etapas_disciplinarias FOR DELETE USING (true);
