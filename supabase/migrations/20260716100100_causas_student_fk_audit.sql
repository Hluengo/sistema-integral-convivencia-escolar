-- Link causas to students + audit columns across disciplinary tables

ALTER TABLE causas
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL;

ALTER TABLE causas
  ADD COLUMN IF NOT EXISTS annotations_count INTEGER DEFAULT 0;

ALTER TABLE causas
  ADD COLUMN IF NOT EXISTS created_by TEXT;

ALTER TABLE causas
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_causas_student_id ON causas(student_id);
CREATE INDEX IF NOT EXISTS idx_causas_estado ON causas(estado_actual);

ALTER TABLE inspectorate_records
  ADD COLUMN IF NOT EXISTS created_by TEXT;

ALTER TABLE cartas_disciplinarias
  ADD COLUMN IF NOT EXISTS created_by TEXT;

ALTER TABLE cartas_disciplinarias
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE etapas_disciplinarias
  ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Ensure cartas / etapas tables exist (idempotent for fresh envs)
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
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS etapas_disciplinarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  responsible TEXT NOT NULL,
  transition_date TIMESTAMPTZ DEFAULT NOW(),
  comment TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cartas_student_id ON cartas_disciplinarias(student_id);
CREATE INDEX IF NOT EXISTS idx_etapas_student_id ON etapas_disciplinarias(student_id);
