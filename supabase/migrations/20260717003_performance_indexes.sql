-- ============================================================
-- Migration 20260717003: Performance Indexes
-- Agrega índices compuestos para queries frecuentes.
-- ============================================================

-- ============================================================
-- 1. causas: filtro por estudiante_curso (común en dashboard)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_causas_estudiante_curso
  ON causas(estudiante_curso);

-- Índice compuesto para tenant + fecha (la query principal)
DROP INDEX IF EXISTS idx_causas_fecha;
CREATE INDEX IF NOT EXISTS idx_causas_tenant_fecha
  ON causas(tenant_id, fecha_ultima_actualizacion DESC);

-- ============================================================
-- 2. bitacora_entries: consulta por causa_id ordenada por fecha
-- ============================================================
DROP INDEX IF EXISTS idx_bitacora_causa_id;
CREATE INDEX IF NOT EXISTS idx_bitacora_causa_fecha
  ON bitacora_entries(causa_id, fecha ASC);

-- ============================================================
-- 3. inspectorate_records: consulta por student_id + fecha
-- ============================================================
DROP INDEX IF EXISTS idx_inspectorate_student_id;
CREATE INDEX IF NOT EXISTS idx_inspectorate_student_date
  ON inspectorate_records(student_id, date_time DESC);

-- Índice compuesto para tenant + student_id
CREATE INDEX IF NOT EXISTS idx_inspectorate_tenant_student
  ON inspectorate_records(tenant_id, student_id);

-- ============================================================
-- 4. checklist_items: consulta por causa_id
-- ============================================================
DROP INDEX IF EXISTS idx_checklist_causa_id;
CREATE INDEX IF NOT EXISTS idx_checklist_causa_completado
  ON checklist_items(causa_id, completado);

-- ============================================================
-- 5. students: tenant + course_id
-- ============================================================
DROP INDEX IF EXISTS idx_students_course;
CREATE INDEX IF NOT EXISTS idx_students_tenant_course
  ON students(tenant_id, course_id);

-- ============================================================
-- 6. profiles: tenant + role (para queries de permisos)
-- ============================================================
DROP INDEX IF EXISTS idx_profiles_role;
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_role
  ON profiles(tenant_id, role);

-- ============================================================
-- Refresh PostgREST schema cache
-- ============================================================
SELECT pg_notify('pgrst', 'reload schema');
