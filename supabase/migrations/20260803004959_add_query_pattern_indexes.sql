/** @license SPDX-License-Identifier: Apache-2.0 */

-- Índices compuestos alineados con los patrones de lectura vigentes:
-- RLS/tenant + filtros frecuentes + ORDER BY. No cambian schema, datos ni políticas.

CREATE INDEX IF NOT EXISTS idx_courses_tenant_position_name
  ON public.courses (tenant_id, position ASC NULLS LAST, name ASC);

CREATE INDEX IF NOT EXISTS idx_students_tenant_full_name
  ON public.students (tenant_id, full_name ASC);

CREATE INDEX IF NOT EXISTS idx_students_tenant_course_full_name
  ON public.students (tenant_id, course_id, full_name ASC);

CREATE INDEX IF NOT EXISTS idx_students_tenant_rut_present
  ON public.students (tenant_id, rut)
  WHERE rut IS NOT NULL AND rut <> '';

CREATE INDEX IF NOT EXISTS idx_inspectorate_tenant_date_type_student
  ON public.inspectorate_records (tenant_id, date_time DESC, type, student_id);

CREATE INDEX IF NOT EXISTS idx_cartas_tenant_emission_created
  ON public.cartas_disciplinarias (tenant_id, emission_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cartas_tenant_student_emission_created
  ON public.cartas_disciplinarias (tenant_id, student_id, emission_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_carta_events_tenant_student_created
  ON public.carta_events (tenant_id, student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_carta_events_tenant_carta_student_type
  ON public.carta_events (tenant_id, carta_id, student_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_etapas_tenant_student_transition
  ON public.etapas_disciplinarias (tenant_id, student_id, transition_date DESC);

CREATE INDEX IF NOT EXISTS idx_disciplinary_files_tenant_student_uploaded
  ON public.disciplinary_process_files (tenant_id, student_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_disciplinary_files_tenant_hash_uploaded
  ON public.disciplinary_process_files (tenant_id, file_hash, uploaded_at DESC)
  WHERE file_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_disciplinary_annotations_tenant_student_detected
  ON public.disciplinary_annotations_detected (tenant_id, student_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_institution_rules_tenant_updated
  ON public.institution_rule_versions (tenant_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_institution_documents_tenant_uploaded
  ON public.institution_documents (tenant_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_events_letter_student_created
  ON public.usage_events ((properties ->> 'studentId'), created_at DESC)
  WHERE event_name IN ('letter_printed', 'letter_downloaded');
