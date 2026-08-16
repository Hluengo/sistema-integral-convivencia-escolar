-- RPC get_annual_annotation_trend: devuelve la agregación mensual de
-- anotaciones del ciclo escolar (marzo-diciembre) en lugar de descargar
-- miles de filas de inspectorate_records para agregarlas en el cliente.
--
-- PERF-04: fetchAnnualAnnotationTrends descargaba todas las
-- inspectorate_records del año (5.000+ filas) y agregaba por mes en el
-- navegador. Esta función devuelve solo ~10-12 filas (una por mes) con
-- conteos disjuntos por celda (tipo × severidad alta) para que el cliente
-- reconstruya exactamente las métricas del dashboard: total, negativas,
-- positivas y de alta severidad, sin doble conteo.
--
-- tenant resuelto en base de datos vía current_tenant_id() (mismo patrón
-- que save_bitacora_snapshot/save_checklist_snapshot), security invoker y
-- EXECUTE solo a authenticated + service_role.

CREATE OR REPLACE FUNCTION public.get_annual_annotation_trend(p_year integer)
RETURNS TABLE (
  month_key text,
  total_count bigint,
  negative_count bigint,
  negative_high_count bigint,
  positive_count bigint,
  positive_high_count bigint,
  other_count bigint,
  other_high_count bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid := public.current_tenant_id();
  v_start timestamp with time zone := make_timestamp(p_year, 3, 1, 0, 0, 0);
  v_end timestamp with time zone := make_timestamp(p_year + 1, 1, 1, 0, 0, 0);
BEGIN
  IF p_year < 2000 OR p_year > 2200 THEN
    RAISE EXCEPTION 'El año escolar solicitado no es válido.';
  END IF;

  RETURN QUERY
  SELECT
    to_char(date_trunc('month', r.date_time), 'YYYY-MM') AS month_key,
    count(*) AS total_count,
    count(*) FILTER (WHERE r.type = 'Negativa' AND r.severity NOT IN ('Muy Grave', 'Gravísima')) AS negative_count,
    count(*) FILTER (WHERE r.type = 'Negativa' AND r.severity IN ('Muy Grave', 'Gravísima')) AS negative_high_count,
    count(*) FILTER (WHERE r.type = 'Positiva' AND r.severity NOT IN ('Muy Grave', 'Gravísima')) AS positive_count,
    count(*) FILTER (WHERE r.type = 'Positiva' AND r.severity IN ('Muy Grave', 'Gravísima')) AS positive_high_count,
    count(*) FILTER (WHERE r.type NOT IN ('Negativa', 'Positiva') AND r.severity NOT IN ('Muy Grave', 'Gravísima')) AS other_count,
    count(*) FILTER (WHERE r.type NOT IN ('Negativa', 'Positiva') AND r.severity IN ('Muy Grave', 'Gravísima')) AS other_high_count
  FROM public.inspectorate_records r
  WHERE r.tenant_id = v_tenant_id
    AND r.date_time >= v_start
    AND r.date_time < v_end
  GROUP BY month_key
  ORDER BY month_key;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_annual_annotation_trend(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_annual_annotation_trend(integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_annual_annotation_trend(integer) FROM anon;

-- Verificación esperada tras aplicar:
--   SELECT has_function_privilege('anon', 'public.get_annual_annotation_trend(integer)', 'EXECUTE'); -- false
--   SELECT has_function_privilege('authenticated', 'public.get_annual_annotation_trend(integer)', 'EXECUTE'); -- true
