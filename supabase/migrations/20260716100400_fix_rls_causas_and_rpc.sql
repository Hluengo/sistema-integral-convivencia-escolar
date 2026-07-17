-- ============================================================
-- Migration 20260716100400: Fix RLS policy for causas + create RPC
-- ============================================================

-- 1. Fix RLS policies for causas — widen write/update to include teacher/profesor_jefe/staff
DROP POLICY IF EXISTS causas_write_staff ON causas;
CREATE POLICY causas_write_staff ON causas
  FOR INSERT
  WITH CHECK (current_app_role() = ANY (ARRAY[
    'admin', 'direccion', 'convivencia', 'inspectoria',
    'profesor_jefe', 'teacher', 'staff'
  ]));

DROP POLICY IF EXISTS causas_update_staff ON causas;
CREATE POLICY causas_update_staff ON causas
  FOR UPDATE
  USING (current_app_role() = ANY (ARRAY[
    'admin', 'direccion', 'convivencia', 'inspectoria',
    'profesor_jefe', 'teacher', 'staff'
  ]));

DROP POLICY IF EXISTS "Allow authenticated on causas" ON causas;
CREATE POLICY "Allow authenticated on causas" ON causas
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 2. RPC: get_student_annotation_summary (was defined in monolithic SQL but never migrated)
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
