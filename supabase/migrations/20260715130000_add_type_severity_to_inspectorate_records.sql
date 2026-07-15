-- Agregar columnas type y severity a inspectorate_records
-- type: 'Positiva' | 'Negativa'
-- severity: 'Leve' | 'Grave' | 'Muy Grave' | 'Gravísima'

ALTER TABLE inspectorate_records 
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'Negativa' 
CHECK (type IN ('Positiva', 'Negativa'));

ALTER TABLE inspectorate_records 
ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'Leve' 
CHECK (severity IN ('Leve', 'Grave', 'Muy Grave', 'Gravísima'));

CREATE INDEX IF NOT EXISTS idx_inspectorate_type ON inspectorate_records(type);
CREATE INDEX IF NOT EXISTS idx_inspectorate_severity ON inspectorate_records(severity);