-- ============================================================
-- Migración: Sistema de Gestión de Medidas Disciplinarias
-- Colegio Carmela Romero de Espinosa
-- NOTA: Este archivo documenta el esquema real de Supabase
-- ============================================================

-- ============================================================
-- TABLAS EXISTENTES (confirmadas en Supabase)
-- ============================================================

-- Tabla de estudiantes (REAL: id UUID, course_id UUID)
-- NO tiene: teacher_id, status, tenant_id
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  course_id UUID REFERENCES courses(id),
  rut TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de cursos (REAL: id UUID, level, position)
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  level TEXT,          -- 'MEDIA', 'BASICA'
  position INTEGER,   -- orden
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de registros de inspectoría (reemplaza annotations)
CREATE TABLE IF NOT EXISTS inspectorate_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  date_time TIMESTAMPTZ NOT NULL,
  observation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de causas disciplinarias (reemplaza disciplinary_cases)
CREATE TABLE IF NOT EXISTS causas (
  id TEXT PRIMARY KEY,  -- Formato: DC-2026-001
  estudiante_nombre TEXT NOT NULL,
  estudiante_curso TEXT NOT NULL,
  nna_protected_name TEXT NOT NULL,
  run_estudiante TEXT NOT NULL,
  fecha_apertura TEXT NOT NULL,
  estado_actual TEXT NOT NULL,
  tipo_infraccion TEXT NOT NULL,
  responsable TEXT NOT NULL,
  compromete_aula_segura BOOLEAN,
  fecha_ultima_actualizacion TEXT NOT NULL,
  observaciones TEXT,
  conducta_rice_id TEXT,
  medidas_ejecutadas JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NUEVAS TABLAS (creadas para persistencia de cartas)
-- ============================================================

-- Tabla de cartas disciplinarias (Amonestación y Compromiso Conductual)
CREATE TABLE IF NOT EXISTS cartas_disciplinarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  letter_type TEXT NOT NULL CHECK (letter_type IN (
    'Amonestación Escrita',
    'Carta de Compromiso Conductual'
  )),
  emission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'Vigente' CHECK (status IN ('Vigente', 'Cumplida', 'Incumplida', 'Anulada')),
  emitted_by TEXT NOT NULL,
  supervisor_name TEXT,
  apoderado_name TEXT NOT NULL,
  annotations_count INTEGER NOT NULL,
  student_name TEXT NOT NULL,
  course TEXT NOT NULL,
  regulation_basis TEXT NOT NULL,
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de etapas disciplinarias (historial de transiciones)
CREATE TABLE IF NOT EXISTS etapas_disciplinarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  responsible TEXT NOT NULL,
  transition_date TIMESTAMPTZ DEFAULT NOW(),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_students_course_id ON students(course_id);
CREATE INDEX IF NOT EXISTS idx_inspectorate_student_id ON inspectorate_records(student_id);
CREATE INDEX IF NOT EXISTS idx_inspectorate_date ON inspectorate_records(date_time);
CREATE INDEX IF NOT EXISTS idx_causas_estado ON causas(estado_actual);
CREATE INDEX IF NOT EXISTS idx_cartas_student_id ON cartas_disciplinarias(student_id);
CREATE INDEX IF NOT EXISTS idx_cartas_emission_date ON cartas_disciplinarias(emission_date);
CREATE INDEX IF NOT EXISTS idx_cartas_letter_type ON cartas_disciplinarias(letter_type);
CREATE INDEX IF NOT EXISTS idx_etapas_student_id ON etapas_disciplinarias(student_id);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspectorate_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE causas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartas_disciplinarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE etapas_disciplinarias ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura
CREATE POLICY "students_select_anon" ON students FOR SELECT USING (true);
CREATE POLICY "courses_select_anon" ON courses FOR SELECT USING (true);
CREATE POLICY "inspectorate_select_anon" ON inspectorate_records FOR SELECT USING (true);
CREATE POLICY "causas_select_anon" ON causas FOR SELECT USING (true);
CREATE POLICY "cartas_select_anon" ON cartas_disciplinarias FOR SELECT USING (true);
CREATE POLICY "etapas_select_anon" ON etapas_disciplinarias FOR SELECT USING (true);

-- Políticas de escritura
CREATE POLICY "students_insert_anon" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "students_update_anon" ON students FOR UPDATE USING (true);
CREATE POLICY "courses_insert_anon" ON courses FOR INSERT WITH CHECK (true);
CREATE POLICY "courses_update_anon" ON courses FOR UPDATE USING (true);
CREATE POLICY "inspectorate_insert_anon" ON inspectorate_records FOR INSERT WITH CHECK (true);
CREATE POLICY "inspectorate_update_anon" ON inspectorate_records FOR UPDATE USING (true);
CREATE POLICY "causas_insert_anon" ON causas FOR INSERT WITH CHECK (true);
CREATE POLICY "causas_update_anon" ON causas FOR UPDATE USING (true);
CREATE POLICY "cartas_insert_anon" ON cartas_disciplinarias FOR INSERT WITH CHECK (true);
CREATE POLICY "cartas_update_anon" ON cartas_disciplinarias FOR UPDATE USING (true);
CREATE POLICY "cartas_delete_anon" ON cartas_disciplinarias FOR DELETE USING (true);
CREATE POLICY "etapas_insert_anon" ON etapas_disciplinarias FOR INSERT WITH CHECK (true);
CREATE POLICY "etapas_update_anon" ON etapas_disciplinarias FOR UPDATE USING (true);
CREATE POLICY "etapas_delete_anon" ON etapas_disciplinarias FOR DELETE USING (true);
