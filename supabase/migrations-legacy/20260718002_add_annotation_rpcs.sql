-- ============================================================
-- Migration: Agregar RPCs para anotaciones (con drop previo)
-- ============================================================

-- Drop existing functions if they exist (to handle return type changes)
DROP FUNCTION IF EXISTS public.get_student_annotation_summary();
DROP FUNCTION IF EXISTS public.get_annotation_stage_counts();

-- Función get_student_annotation_summary para el dashboard de anotaciones
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
  course_name TEXT
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
    c.name AS course_name
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

-- Función get_annotation_stage_counts para KPIs del dashboard
CREATE OR REPLACE FUNCTION public.get_annotation_stage_counts()
RETURNS TABLE (
  stage TEXT,
  count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS '
  SELECT 
    CASE 
      WHEN annotations_count >= 15 THEN ''derivacion''
      WHEN annotations_count >= 10 THEN ''compromiso''
      WHEN annotations_count >= 5 THEN ''amonestacion''
      ELSE ''verde''
    END AS stage,
    COUNT(*)::BIGINT
  FROM (
    SELECT 
      s.id,
      COALESCE((
        SELECT COUNT(*)::INT
        FROM inspectorate_records ir
        WHERE ir.student_id = s.id
          AND ir.type = ''Negativa''
          AND ir.tenant_id = public.current_tenant_id()
      ), 0) AS annotations_count
    FROM students s
    WHERE s.tenant_id = public.current_tenant_id()
  ) sub
  WHERE annotations_count > 0
  GROUP BY 
    CASE 
      WHEN annotations_count >= 15 THEN ''derivacion''
      WHEN annotations_count >= 10 THEN ''compromiso''
      WHEN annotations_count >= 5 THEN ''amonestacion''
      ELSE ''verde''
    END;
';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_student_annotation_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_annotation_stage_counts() TO authenticated;
