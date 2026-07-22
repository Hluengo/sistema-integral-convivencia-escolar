-- Agrega 'Información' al CHECK constraint de type en inspectorate_records
-- Permite que las anotaciones de tipo informativo se guarden correctamente

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inspectorate_records_type_check'
      AND conrelid = 'inspectorate_records'::regclass
  ) THEN
    ALTER TABLE inspectorate_records DROP CONSTRAINT inspectorate_records_type_check;
  END IF;
END $$;

ALTER TABLE inspectorate_records
  ADD CONSTRAINT inspectorate_records_type_check
  CHECK (type IN ('Positiva', 'Negativa', 'Información'));
