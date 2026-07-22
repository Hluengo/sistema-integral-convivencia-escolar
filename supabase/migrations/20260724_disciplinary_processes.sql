-- ============================================================
-- Migration: Tablas para procesos disciplinarios completos
-- ============================================================

-- 1. Tabla principal de procesos disciplinarios
CREATE TABLE IF NOT EXISTS disciplinary_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  process_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, pending, approved, rejected, closed
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Metadata del proceso
  course TEXT,
  teacher_name TEXT,
  incident_date DATE,
  description TEXT,
  
  -- Clasificación automática
  suggested_letter_type TEXT, -- amonestacion, compromiso, derivacion
  final_letter_type TEXT,
  
  -- Conteos del análisis
  total_negativas INTEGER NOT NULL DEFAULT 0,
  total_positivas INTEGER NOT NULL DEFAULT 0,
  total_informativas INTEGER NOT NULL DEFAULT 0,
  
  -- Estado del proceso
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_disciplinary_processes_student
  ON disciplinary_processes (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_disciplinary_processes_tenant
  ON disciplinary_processes (tenant_id);

CREATE INDEX IF NOT EXISTS idx_disciplinary_processes_status
  ON disciplinary_processes (status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_disciplinary_processes_number
  ON disciplinary_processes (process_number, tenant_id);

ALTER TABLE disciplinary_processes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_processes" ON disciplinary_processes;
CREATE POLICY "tenant_processes" ON disciplinary_processes
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- 2. Tabla de archivos asociados al proceso
CREATE TABLE IF NOT EXISTS disciplinary_process_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES disciplinary_processes(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  file_hash TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_disciplinary_files_process
  ON disciplinary_process_files (process_id);

CREATE INDEX IF NOT EXISTS idx_disciplinary_files_tenant
  ON disciplinary_process_files (tenant_id);

ALTER TABLE disciplinary_process_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_files" ON disciplinary_process_files;
CREATE POLICY "tenant_files" ON disciplinary_process_files
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- 3. Tabla de anotaciones individuales detectadas
CREATE TABLE IF NOT EXISTS disciplinary_annotations_detected (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES disciplinary_processes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  -- Metadata de la anotación
  annotation_type TEXT NOT NULL, -- Negativa, Positiva, Información
  annotation_text TEXT,
  page_number INTEGER,
  position_in_page INTEGER,
  
  -- Fecha y profesor si se detectan
  annotation_date DATE,
  teacher_name TEXT,
  
  -- Posición en el documento
  line_number INTEGER,
  character_position INTEGER,
  
  -- Timestamps
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_disciplinary_annotations_process
  ON disciplinary_annotations_detected (process_id);

CREATE INDEX IF NOT EXISTS idx_disciplinary_annotations_student
  ON disciplinary_annotations_detected (student_id);

CREATE INDEX IF NOT EXISTS idx_disciplinary_annotations_type
  ON disciplinary_annotations_detected (annotation_type);

CREATE INDEX IF NOT EXISTS idx_disciplinary_annotations_tenant
  ON disciplinary_annotations_detected (tenant_id);

ALTER TABLE disciplinary_annotations_detected ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_detected_annotations" ON disciplinary_annotations_detected;
CREATE POLICY "tenant_detected_annotations" ON disciplinary_annotations_detected
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- 4. Tabla de reglas de clasificación (parametrizado)
CREATE TABLE IF NOT EXISTS disciplinary_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL, -- letter_type, threshold, condition
  rule_name TEXT NOT NULL,
  description TEXT,
  
  -- Condiciones
  min_negativas INTEGER,
  max_negativas INTEGER,
  min_positivas INTEGER,
  max_positivas INTEGER,
  min_informativas INTEGER,
  max_informativas INTEGER,
  
  -- Resultado
  suggested_letter_type TEXT NOT NULL, -- amonestacion, compromiso, derivacion, none
  priority INTEGER NOT NULL DEFAULT 0, -- Orden de evaluación
  
  -- Estado
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_disciplinary_rules_type
  ON disciplinary_rules (rule_type);

CREATE INDEX IF NOT EXISTS idx_disciplinary_rules_active
  ON disciplinary_rules (is_active, priority DESC);

CREATE INDEX IF NOT EXISTS idx_disciplinary_rules_tenant
  ON disciplinary_rules (tenant_id);

ALTER TABLE disciplinary_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_rules" ON disciplinary_rules;
CREATE POLICY "tenant_rules" ON disciplinary_rules
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- 5. Insertar reglas por defecto (usando el primer tenant existente)
DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Obtener el primer tenant_id disponible
  SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
  
  -- Solo insertar si existe al menos un tenant
  IF v_tenant_id IS NOT NULL THEN
    INSERT INTO disciplinary_rules (rule_type, rule_name, description, min_negativas, max_negativas, suggested_letter_type, priority, tenant_id)
    VALUES 
      ('letter_type', 'Sin carta', 'Menos de 5 negativas', 0, 4, 'none', 1, v_tenant_id),
      ('letter_type', 'Carta preventiva', '5-9 negativas', 5, 9, 'amonestacion', 2, v_tenant_id),
      ('letter_type', 'Carta compromiso', '10-14 negativas', 10, 14, 'compromiso', 3, v_tenant_id),
      ('letter_type', 'Derivación', '15 o más negativas', 15, NULL, 'derivacion', 4, v_tenant_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 6. Función para generar número de proceso
CREATE OR REPLACE FUNCTION generate_process_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_number TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM now())::TEXT;
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM disciplinary_processes
  WHERE tenant_id = p_tenant_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now());
  
  v_number := LPAD(v_count::TEXT, 4, '0');
  
  RETURN 'DP-' || v_year || '-' || v_number;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_process_number(UUID) TO authenticated;

-- 7. Función para determinar carta sugerida basada en reglas
CREATE OR REPLACE FUNCTION get_suggested_letter_type(
  p_negativas INTEGER,
  p_positivas INTEGER,
  p_informativas INTEGER,
  p_tenant_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suggested TEXT;
BEGIN
  SELECT suggested_letter_type INTO v_suggested
  FROM disciplinary_rules
  WHERE tenant_id = p_tenant_id
    AND is_active = true
    AND (min_negativas IS NULL OR p_negativas >= min_negativas)
    AND (max_negativas IS NULL OR p_negativas <= max_negativas)
    AND (min_positivas IS NULL OR p_positivas >= min_positivas)
    AND (max_positivas IS NULL OR p_positivas <= max_positivas)
    AND (min_informativas IS NULL OR p_informativas >= min_informativas)
    AND (max_informativas IS NULL OR p_informativas <= max_informativas)
  ORDER BY priority DESC
  LIMIT 1;
  
  RETURN COALESCE(v_suggested, 'none');
END;
$$;

GRANT EXECUTE ON FUNCTION get_suggested_letter_type(INTEGER, INTEGER, INTEGER, UUID) TO authenticated;

-- 8. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_disciplinary_processes_updated_at ON disciplinary_processes;
CREATE TRIGGER trigger_disciplinary_processes_updated_at
  BEFORE UPDATE ON disciplinary_processes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_disciplinary_rules_updated_at ON disciplinary_rules;
CREATE TRIGGER trigger_disciplinary_rules_updated_at
  BEFORE UPDATE ON disciplinary_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
