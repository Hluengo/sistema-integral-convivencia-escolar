-- ============================================================
-- MIGRACIÓN: Esquema completo para Gestión de Debido Proceso
-- Ejecutar en el SQL Editor de Supabase
-- Proyecto: Gestión Debido Proceso / Convivencia Escolar
-- ============================================================

-- Nota: Esta migración solo cubre las tablas del módulo de
-- convivencia. Las tablas `courses` y `students` pertenecen a
-- módulos previos del proyecto (matrícula/asistencia) y deben
-- existir antes de ejecutar este script.

-- ============================================================
-- 1. TABLAS PRINCIPALES
-- ============================================================

CREATE TABLE IF NOT EXISTS causas (
  id TEXT PRIMARY KEY,
  estudiante_nombre TEXT NOT NULL,
  estudiante_curso TEXT NOT NULL,
  nna_protected_name TEXT NOT NULL,
  run_estudiante TEXT NOT NULL,
  fecha_apertura TEXT NOT NULL,
  estado_actual TEXT NOT NULL,
  tipo_infraccion TEXT NOT NULL,
  responsable TEXT NOT NULL,
  compromete_aula_segura BOOLEAN DEFAULT false,
  fecha_ultima_actualizacion TEXT NOT NULL,
  observaciones TEXT DEFAULT '',
  conducta_rice_id TEXT,
  medidas_ejecutadas JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bitacora_entries (
  id TEXT PRIMARY KEY,
  causa_id TEXT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  fecha TEXT NOT NULL,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  participantes JSONB DEFAULT '[]',
  documento_adjunto TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT NOT NULL,
  causa_id TEXT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  completado BOOLEAN DEFAULT false,
  fecha_completado TEXT,
  requerido_por TEXT NOT NULL,
  registrado_por TEXT,
  observaciones TEXT,
  documento_nombre TEXT,
  documento_url TEXT,
  PRIMARY KEY (id, causa_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_bitacora_causa_id ON bitacora_entries(causa_id);
CREATE INDEX IF NOT EXISTS idx_checklist_causa_id ON checklist_items(causa_id);
CREATE INDEX IF NOT EXISTS idx_causas_estado ON causas(estado_actual);
CREATE INDEX IF NOT EXISTS idx_causas_fecha ON causas(fecha_ultima_actualizacion DESC);

-- ============================================================
-- 3. TRIGGER updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_causas_updated_at ON causas;
CREATE TRIGGER trigger_causas_updated_at
  BEFORE UPDATE ON causas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. RLS
-- ============================================================
-- La app usa la anon key sin sesión (persistSession: false).
-- Para desarrollo se permite acceso a 'anon' y 'authenticated'.
--
-- Producción: restringir por establecimiento/tenant con auth.uid().

ALTER TABLE causas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitacora_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated on causas" ON causas;
CREATE POLICY "Allow authenticated on causas" ON causas
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated on bitacora_entries" ON bitacora_entries;
CREATE POLICY "Allow authenticated on bitacora_entries" ON bitacora_entries
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated on checklist_items" ON checklist_items;
CREATE POLICY "Allow authenticated on checklist_items" ON checklist_items
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- 5. STORAGE
-- ============================================================
-- Crear manualmente en Dashboard > Storage:
-- - Bucket: documentos_convivencia
-- - Política pública de lectura/escritura para desarrollo
-- ============================================================

-- ============================================================
-- 6. ÍNDICES ADICIONALES (Performance Anotaciones)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_inspectorate_records_student_id ON inspectorate_records(student_id);
CREATE INDEX IF NOT EXISTS idx_inspectorate_records_type ON inspectorate_records(type);
CREATE INDEX IF NOT EXISTS idx_inspectorate_records_student_type ON inspectorate_records(student_id, type);
CREATE INDEX IF NOT EXISTS idx_inspectorate_records_datetime ON inspectorate_records(date_time DESC);
CREATE INDEX IF NOT EXISTS idx_cartas_disciplinarias_student ON cartas_disciplinarias(student_id);
CREATE INDEX IF NOT EXISTS idx_etapas_disciplinarias_student ON etapas_disciplinarias(student_id);

-- ============================================================
-- 7. RPC: Resumen de estudiantes con conteos agregados
-- ============================================================
-- Reemplaza la agregación en frontend (N+1) por una sola query
-- que devuelve estudiantes con conteos pre-calculados en DB.
-- ============================================================

CREATE OR REPLACE FUNCTION get_student_annotation_summary()
RETURNS TABLE (
  id TEXT,
  full_name TEXT,
  course_id TEXT,
  rut TEXT,
  course_name TEXT,
  annotations_count BIGINT,
  positive_count BIGINT,
  last_annotation_date TIMESTAMPTZ,
  disciplinary_status TEXT
) LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.full_name,
    s.course_id,
    s.rut,
    c.name AS course_name,
    COALESCE(neg.count, 0) AS annotations_count,
    COALESCE(pos.count, 0) AS positive_count,
    neg.last_date AS last_annotation_date,
    CASE
      WHEN COALESCE(neg.count, 0) >= 15 THEN 'Rojo'
      WHEN COALESCE(neg.count, 0) >= 10 THEN 'Naranja'
      WHEN COALESCE(neg.count, 0) >= 5  THEN 'Amarillo'
      ELSE 'Verde'
    END AS disciplinary_status
  FROM students s
  LEFT JOIN courses c ON c.id = s.course_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS count, MAX(ir.date_time) AS last_date
    FROM inspectorate_records ir
    WHERE ir.student_id = s.id AND ir.type = 'Negativa'
  ) neg ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS count
    FROM inspectorate_records ir
    WHERE ir.student_id = s.id AND ir.type = 'Positiva'
  ) pos ON true
  ORDER BY s.full_name;
END;
$$;

-- ============================================================
-- 8. RPC: Conteos por etapa (para dashboard KPIs)
-- ============================================================
-- Versión ligera que solo devuelve 3 números, no todos los
-- estudiantes. Ideal para el dashboard.
-- ============================================================

CREATE OR REPLACE FUNCTION get_annotation_stage_counts()
RETURNS TABLE (stage TEXT, count BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 'amonestacion'::TEXT, COUNT(*)::BIGINT
  FROM (
    SELECT s.id
    FROM students s
    LEFT JOIN inspectorate_records ir ON ir.student_id = s.id AND ir.type = 'Negativa'
    GROUP BY s.id
    HAVING COUNT(ir.id) >= 5 AND COUNT(ir.id) < 10
  ) am
  UNION ALL
  SELECT 'compromiso'::TEXT, COUNT(*)::BIGINT
  FROM (
    SELECT s.id
    FROM students s
    LEFT JOIN inspectorate_records ir ON ir.student_id = s.id AND ir.type = 'Negativa'
    GROUP BY s.id
    HAVING COUNT(ir.id) >= 10 AND COUNT(ir.id) < 15
  ) co
  UNION ALL
  SELECT 'derivacion'::TEXT, COUNT(*)::BIGINT
  FROM (
    SELECT s.id
    FROM students s
    LEFT JOIN inspectorate_records ir ON ir.student_id = s.id AND ir.type = 'Negativa'
    GROUP BY s.id
    HAVING COUNT(ir.id) >= 15
  ) de;
END;
$$;
