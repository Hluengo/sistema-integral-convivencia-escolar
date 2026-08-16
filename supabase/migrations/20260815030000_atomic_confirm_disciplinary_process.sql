-- Atomic confirmation of a disciplinary PDF.
-- The backend calls this function with service_role after validating the PDF,
-- tenant, student and idempotency outside the database.

CREATE OR REPLACE FUNCTION public.confirm_disciplinary_process_atomic(
  p_tenant_id uuid,
  p_student_id uuid,
  p_suggested_letter_type text,
  p_file_name text,
  p_storage_path text,
  p_file_size integer,
  p_mime_type text,
  p_file_hash text,
  p_bucket text,
  p_original_file_name text,
  p_stored_file_name text,
  p_analysis_version text,
  p_annotations jsonb,
  p_total_negativas integer,
  p_total_positivas integer,
  p_total_informativas integer,
  p_confirmed_by uuid DEFAULT NULL
)
RETURNS TABLE(
  process_id uuid,
  process_number text,
  inserted_negativas integer,
  inserted_positivas integer,
  inserted_informativas integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_process_id uuid;
  v_process_number text;
  v_student_name text;
  v_course_id uuid;
  v_course_name text;
  v_letter_type text;
  v_stage_name text;
  v_step_number integer;
BEGIN
  IF p_tenant_id IS NULL OR p_student_id IS NULL THEN
    RAISE EXCEPTION 'Tenant y estudiante son obligatorios';
  END IF;

  SELECT s.full_name, s.course_id, c.name
    INTO v_student_name, v_course_id, v_course_name
    FROM public.students s
    LEFT JOIN public.courses c ON c.id = s.course_id AND c.tenant_id = p_tenant_id
   WHERE s.id = p_student_id
     AND s.tenant_id = p_tenant_id;

  IF v_student_name IS NULL THEN
    RAISE EXCEPTION 'El estudiante no pertenece al establecimiento activo';
  END IF;

  SELECT public.generate_process_number(p_tenant_id) INTO v_process_number;
  IF v_process_number IS NULL OR v_process_number = '' THEN
    RAISE EXCEPTION 'No fue posible generar el número de proceso';
  END IF;

  INSERT INTO public.disciplinary_processes (
    student_id, process_number, status, tenant_id, suggested_letter_type,
    total_negativas, total_positivas, total_informativas, is_completed, created_by
  ) VALUES (
    p_student_id, v_process_number, 'draft', p_tenant_id, coalesce(p_suggested_letter_type, 'none'),
    coalesce(p_total_negativas, 0), coalesce(p_total_positivas, 0),
    coalesce(p_total_informativas, 0), false, p_confirmed_by
  ) RETURNING id INTO v_process_id;

  INSERT INTO public.disciplinary_process_files (
    process_id, file_name, storage_path, file_size, mime_type, file_hash,
    tenant_id, bucket, original_file_name, stored_file_name, processing_status,
    analysis_version, student_id, uploaded_by
  ) VALUES (
    v_process_id, p_file_name, p_storage_path, coalesce(p_file_size, 0),
    coalesce(p_mime_type, 'application/pdf'), p_file_hash, p_tenant_id,
    coalesce(p_bucket, 'disciplinary-processes'), p_original_file_name,
    p_stored_file_name, 'confirmed', p_analysis_version, p_student_id, p_confirmed_by
  );

  INSERT INTO public.disciplinary_annotations_detected (
    process_id, student_id, annotation_type, annotation_text, page_number,
    position_in_page, annotation_date, teacher_name, line_number, tenant_id,
    raw_text, normalized_text, category, classification_method, confidence,
    parser_version, confirmed_annotation_type
  )
  SELECT
    v_process_id,
    p_student_id,
    CASE a.type WHEN 'negative' THEN 'Negativa' WHEN 'positive' THEN 'Positiva' ELSE 'Información' END,
    a.raw_text,
    a.page_number,
    coalesce(a.sequence_number, row_number() OVER ()),
    a.detected_date,
    a.detected_teacher,
    coalesce(a.sequence_number, row_number() OVER ()),
    p_tenant_id,
    a.raw_text,
    coalesce(a.normalized_text, lower(a.raw_text)),
    a.type,
    'regex',
    coalesce(a.confidence, 0.8),
    p_analysis_version,
    a.type
  FROM jsonb_to_recordset(coalesce(p_annotations, '[]'::jsonb)) AS a(
    raw_text text,
    normalized_text text,
    type text,
    page_number integer,
    sequence_number integer,
    detected_date date,
    detected_teacher text,
    confidence numeric
  );

  INSERT INTO public.inspectorate_records (
    student_id, tenant_id, date_time, observation, severity, type,
    registered_by, created_by, pdf_file_path
  )
  SELECT
    p_student_id,
    p_tenant_id,
    coalesce(a.detected_date::timestamptz, now()),
    a.raw_text,
    CASE a.type WHEN 'negative' THEN 'Leve' WHEN 'positive' THEN 'Leve' ELSE 'Leve' END,
    CASE a.type WHEN 'negative' THEN 'Negativa' WHEN 'positive' THEN 'Positiva' ELSE 'Información' END,
    'PDF Convivencia Escolar',
    'Sistema PDF',
    p_storage_path
  FROM jsonb_to_recordset(coalesce(p_annotations, '[]'::jsonb)) AS a(
    raw_text text,
    type text,
    detected_date date
  )
  WHERE NOT EXISTS (
    SELECT 1
      FROM public.inspectorate_records ir
     WHERE ir.tenant_id = p_tenant_id
       AND ir.student_id = p_student_id
       AND ir.observation = a.raw_text
       AND ir.type = CASE a.type WHEN 'negative' THEN 'Negativa' WHEN 'positive' THEN 'Positiva' ELSE 'Información' END
  );

  v_letter_type := CASE p_suggested_letter_type
    WHEN 'amonestacion' THEN 'Amonestación Escrita'
    WHEN 'compromiso' THEN 'Carta de Compromiso Conductual'
    WHEN 'compromiso_conductual' THEN 'Carta de Compromiso Conductual'
    WHEN 'derivacion' THEN 'Ficha de Derivación'
    ELSE NULL
  END;

  IF v_letter_type IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cartas_disciplinarias
     WHERE tenant_id = p_tenant_id AND student_id = p_student_id
       AND observations ILIKE '%' || v_process_id::text || '%'
  ) THEN
    INSERT INTO public.cartas_disciplinarias (
      student_id, tenant_id, letter_type, emission_date, status, emitted_by,
      apoderado_name, annotations_count, student_name, course, regulation_basis,
      observations, created_by
    ) VALUES (
      p_student_id, p_tenant_id, v_letter_type, current_date, 'Vigente',
      'Convivencia Escolar', 'Por definir', coalesce(p_total_negativas, 0),
      v_student_name, coalesce(v_course_name, 'Sin curso'),
      'RICE 2026 - Registro de anotaciones y debido proceso',
      format('Proceso PDF %s (%s). Documento sugerido automáticamente desde PDF confirmado.', v_process_number, v_process_id),
      'Sistema PDF'
    );
  END IF;

  v_stage_name := CASE p_suggested_letter_type
    WHEN 'amonestacion' THEN 'amonestacion'
    WHEN 'compromiso' THEN 'compromiso'
    WHEN 'compromiso_conductual' THEN 'compromiso'
    WHEN 'derivacion' THEN 'derivacion'
    ELSE NULL
  END;
  v_step_number := CASE v_stage_name WHEN 'amonestacion' THEN 1 WHEN 'compromiso' THEN 2 WHEN 'derivacion' THEN 3 ELSE NULL END;

  IF v_stage_name IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.etapas_disciplinarias
     WHERE tenant_id = p_tenant_id AND student_id = p_student_id
       AND stage_name = v_stage_name AND comment ILIKE '%' || v_process_id::text || '%'
  ) THEN
    INSERT INTO public.etapas_disciplinarias (
      student_id, tenant_id, step_number, stage_name, responsible, comment, created_by
    ) VALUES (
      p_student_id, p_tenant_id, v_step_number, v_stage_name,
      'Convivencia Escolar',
      format('Proceso PDF %s (%s). Etapa sugerida automáticamente desde PDF confirmado.', v_process_number, v_process_id),
      'Sistema PDF'
    );
  END IF;

  INSERT INTO public.document_analyses (
    student_id, file_name, negativas, positivas, informativas, tenant_id,
    status, process_id, file_hash, parser_version, confirmed_at, confirmed_by
  ) VALUES (
    p_student_id, p_file_name, coalesce(p_total_negativas, 0),
    coalesce(p_total_positivas, 0), coalesce(p_total_informativas, 0),
    p_tenant_id, 'confirmed', v_process_id, p_file_hash, p_analysis_version,
    now(), p_confirmed_by
  );

  RETURN QUERY SELECT
    v_process_id,
    v_process_number,
    coalesce(p_total_negativas, 0),
    coalesce(p_total_positivas, 0),
    coalesce(p_total_informativas, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_disciplinary_process_atomic(
  uuid, uuid, text, text, text, integer, text, text, text, text, text, text,
  jsonb, integer, integer, integer, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_disciplinary_process_atomic(
  uuid, uuid, text, text, text, integer, text, text, text, text, text, text,
  jsonb, integer, integer, integer, uuid
) TO service_role;
