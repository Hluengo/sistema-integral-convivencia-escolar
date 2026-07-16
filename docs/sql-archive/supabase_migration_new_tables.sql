-- ============================================================
-- Migración: Nuevas tablas para persistencia de cartas
-- Colegio Carmela Romero de Espinosa
-- Ejecutar en: Supabase SQL Editor
-- NOTA: students.id y students.course_id son UUID en la DB real
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

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_cartas_student_id ON cartas_disciplinarias(student_id);
CREATE INDEX IF NOT EXISTS idx_cartas_emission_date ON cartas_disciplinarias(emission_date);
CREATE INDEX IF NOT EXISTS idx_cartas_letter_type ON cartas_disciplinarias(letter_type);
CREATE INDEX IF NOT EXISTS idx_etapas_student_id ON etapas_disciplinarias(student_id);

-- Habilitar RLS
ALTER TABLE cartas_disciplinarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE etapas_disciplinarias ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura
CREATE POLICY "cartas_select_anon" ON cartas_disciplinarias
  FOR SELECT USING (true);

CREATE POLICY "etapas_select_anon" ON etapas_disciplinarias
  FOR SELECT USING (true);

-- Políticas de escritura
CREATE POLICY "cartas_insert_anon" ON cartas_disciplinarias
  FOR INSERT WITH CHECK (true);

CREATE POLICY "cartas_update_anon" ON cartas_disciplinarias
  FOR UPDATE USING (true);

CREATE POLICY "etapas_insert_anon" ON etapas_disciplinarias
  FOR INSERT WITH CHECK (true);

CREATE POLICY "etapas_update_anon" ON etapas_disciplinarias
  FOR UPDATE USING (true);

CREATE POLICY "cartas_delete_anon" ON cartas_disciplinarias
  FOR DELETE USING (true);

CREATE POLICY "etapas_delete_anon" ON etapas_disciplinarias
  FOR DELETE USING (true);
