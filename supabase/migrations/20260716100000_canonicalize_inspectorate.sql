-- Canonicalize inspectorate_records as sole annotations source of truth
ALTER TABLE inspectorate_records
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Negativa';

ALTER TABLE inspectorate_records
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'Leve';

ALTER TABLE inspectorate_records
  ADD COLUMN IF NOT EXISTS registered_by TEXT DEFAULT 'Inspectoría';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspectorate_records_type_check'
  ) THEN
    ALTER TABLE inspectorate_records
      ADD CONSTRAINT inspectorate_records_type_check
      CHECK (type IN ('Positiva', 'Negativa'));
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspectorate_records_severity_check'
  ) THEN
    ALTER TABLE inspectorate_records
      ADD CONSTRAINT inspectorate_records_severity_check
      CHECK (severity IN ('Leve', 'Grave', 'Muy Grave', 'Gravísima'));
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_inspectorate_type ON inspectorate_records(type);
CREATE INDEX IF NOT EXISTS idx_inspectorate_severity ON inspectorate_records(severity);
CREATE INDEX IF NOT EXISTS idx_inspectorate_student_id ON inspectorate_records(student_id);
