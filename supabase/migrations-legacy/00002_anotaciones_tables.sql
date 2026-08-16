-- ============================================================
-- Migration 00002: Tablas para Gestión de Anotaciones
-- Tablas: inspectorate_records, cartas_disciplinarias, etapas_disciplinarias
-- NOTA: Usa TEXT para student_id (coherente con PK TEXT de students)
-- RLS: autenticado (coherente con debidoproceso)
-- ============================================================

-- Tabla de registros inspectoriales (anotaciones/observaciones)
CREATE TABLE IF NOT EXISTS inspectorate_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date_time TIMESTAMPTZ DEFAULT NOW(),
  observation TEXT NOT NULL,
  severity TEXT DEFAULT 'Leve' CHECK (severity IN ('Leve', 'Grave', 'Muy Grave', 'Gravísima')),
  type TEXT DEFAULT 'Negativa' CHECK (type IN ('Positiva', 'Negativa')),
  registered_by TEXT DEFAULT 'Inspectoría',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cartas_disciplinarias (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  letter_type TEXT NOT NULL CHECK (letter_type IN ('Amonestación Escrita', 'Carta de Compromiso Conductual')),
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

CREATE TABLE IF NOT EXISTS etapas_disciplinarias (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  responsible TEXT NOT NULL,
  transition_date TIMESTAMPTZ DEFAULT NOW(),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspectorate_student_id ON inspectorate_records(student_id);
CREATE INDEX IF NOT EXISTS idx_inspectorate_date_time ON inspectorate_records(date_time);
CREATE INDEX IF NOT EXISTS idx_cartas_student_id ON cartas_disciplinarias(student_id);
CREATE INDEX IF NOT EXISTS idx_cartas_emission_date ON cartas_disciplinarias(emission_date);
CREATE INDEX IF NOT EXISTS idx_etapas_student_id ON etapas_disciplinarias(student_id);

ALTER TABLE inspectorate_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartas_disciplinarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE etapas_disciplinarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inspectorate_select_auth" ON inspectorate_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "inspectorate_insert_auth" ON inspectorate_records FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "inspectorate_update_auth" ON inspectorate_records FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "inspectorate_delete_auth" ON inspectorate_records FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "cartas_select_auth" ON cartas_disciplinarias FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "cartas_insert_auth" ON cartas_disciplinarias FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "cartas_update_auth" ON cartas_disciplinarias FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "cartas_delete_auth" ON cartas_disciplinarias FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "etapas_select_auth" ON etapas_disciplinarias FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "etapas_insert_auth" ON etapas_disciplinarias FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "etapas_update_auth" ON etapas_disciplinarias FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "etapas_delete_auth" ON etapas_disciplinarias FOR DELETE USING (auth.role() = 'authenticated');
