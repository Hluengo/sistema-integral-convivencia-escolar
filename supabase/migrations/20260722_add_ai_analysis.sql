-- ============================================================
-- Migration: Agregar ai_analysis JSONB a students + RPC actualizada
-- ============================================================

ALTER TABLE students ADD COLUMN IF NOT EXISTS ai_analysis JSONB;

-- Drop and recreate RPC to include ai_analysis
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
    s.ai_analysis
  FROM students s
  LEFT JOIN courses c ON c.id = s.course_id AND c.tenant_id = public.current_tenant_id()
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT AS cnt, MAX(date_time) AS last_date
    FROM inspectorate_records ir
    WHERE ir.student_id = s.id
      AND ir.type = ''Negativa''
      AND ir.tenant_id = public.current_tenant_id()
  ) neg ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT AS cnt
    FROM inspectorate_records ir
    WHERE ir.student_id = s.id
      AND ir.type = ''Positiva''
      AND ir.tenant_id = public.current_tenant_id()
  ) pos ON true
  WHERE s.tenant_id = public.current_tenant_id()
  ORDER BY s.full_name;
';

GRANT EXECUTE ON FUNCTION public.get_student_annotation_summary() TO authenticated;
