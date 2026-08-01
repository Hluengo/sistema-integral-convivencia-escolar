-- ============================================================
-- Migration: Tabla document_analyses para historial de análisis IA
-- ============================================================

CREATE TABLE IF NOT EXISTS document_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  file_name TEXT,
  negativas INTEGER NOT NULL DEFAULT 0,
  positivas INTEGER NOT NULL DEFAULT 0,
  informativas INTEGER NOT NULL DEFAULT 0,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_analyses_student
  ON document_analyses (student_id, analyzed_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_analyses_tenant
  ON document_analyses (tenant_id);

ALTER TABLE document_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_analyses" ON document_analyses;
CREATE POLICY "tenant_analyses" ON document_analyses
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- RPC: última análisis por estudiante
DROP FUNCTION IF EXISTS public.get_latest_analysis(p_student_id UUID);
CREATE OR REPLACE FUNCTION public.get_latest_analysis(p_student_id UUID)
RETURNS TABLE(
  negativas INT,
  positivas INT,
  informativas INT,
  analyzed_at TIMESTAMPTZ,
  file_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS '
  SELECT da.negativas, da.positivas, da.informativas, da.analyzed_at, da.file_name
  FROM document_analyses da
  WHERE da.student_id = p_student_id
    AND da.tenant_id = public.current_tenant_id()
  ORDER BY da.analyzed_at DESC
  LIMIT 1;
';

-- Actualizar RPC de summary para usar document_analyses como fuente de ai_analysis
DROP FUNCTION IF EXISTS public.get_student_annotation_summary();
CREATE OR REPLACE FUNCTION public.get_student_annotation_summary()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  course_id UUID,
  teacher_id UUID,
  status TEXT,
  annotations_count BIGINT,
  positive_annotations_count BIGINT,
  last_annotation_date TIMESTAMPTZ,
  disciplinary_status TEXT,
  rut TEXT,
  course_name TEXT,
  ai_analysis JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS '
  SELECT 
    s.id,
    s.full_name,
    s.course_id,
    NULL::UUID AS teacher_id,
    ''Activo''::TEXT AS status,
    COALESCE(neg.cnt, 0)::BIGINT AS annotations_count,
    COALESCE(pos.cnt, 0)::BIGINT AS positive_annotations_count,
    neg.last_date AS last_annotation_date,
    CASE 
      WHEN COALESCE(neg.cnt, 0) >= 15 THEN ''Rojo''
      WHEN COALESCE(neg.cnt, 0) >= 10 THEN ''Naranja''
      WHEN COALESCE(neg.cnt, 0) >= 5 THEN ''Amarillo''
      ELSE ''Verde''
    END AS disciplinary_status,
    s.rut,
    c.name AS course_name,
    latest.analysis_json AS ai_analysis
  FROM students s
  LEFT JOIN courses c ON c.id = s.course_id AND c.tenant_id = public.current_tenant_id()
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT AS cnt, MAX(date_time) AS last_date
    FROM inspectorate_records ir
    WHERE ir.student_id = s.id AND ir.type = ''Negativa'' AND ir.tenant_id = public.current_tenant_id()
  ) neg ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT AS cnt
    FROM inspectorate_records ir
    WHERE ir.student_id = s.id AND ir.type = ''Positiva'' AND ir.tenant_id = public.current_tenant_id()
  ) pos ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_build_object(
      ''negativas'', da.negativas,
      ''positivas'', da.positivas,
      ''informativas'', da.informativas,
      ''analyzed_at'', da.analyzed_at
    ) AS analysis_json
    FROM document_analyses da
    WHERE da.student_id = s.id AND da.tenant_id = public.current_tenant_id()
    ORDER BY da.analyzed_at DESC
    LIMIT 1
  ) latest ON true
  WHERE s.tenant_id = public.current_tenant_id()
  ORDER BY s.full_name;
';

GRANT EXECUTE ON FUNCTION public.get_student_annotation_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_analysis(UUID) TO authenticated;
