-- ============================================================
-- Migration: endurecimiento del flujo PDF disciplinario
-- ============================================================

ALTER TABLE document_analyses
  ALTER COLUMN student_id DROP NOT NULL;

ALTER TABLE document_analyses
  ADD COLUMN IF NOT EXISTS process_id UUID REFERENCES disciplinary_processes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS file_id UUID REFERENCES disciplinary_process_files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS detected_student_name TEXT,
  ADD COLUMN IF NOT EXISTS detected_course TEXT,
  ADD COLUMN IF NOT EXISTS student_match_status TEXT,
  ADD COLUMN IF NOT EXISTS warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS file_hash TEXT,
  ADD COLUMN IF NOT EXISTS parser_version TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_document_analyses_process
  ON document_analyses (process_id);

CREATE INDEX IF NOT EXISTS idx_document_analyses_status
  ON document_analyses (tenant_id, status, analyzed_at DESC);

ALTER TABLE disciplinary_process_files
  ADD COLUMN IF NOT EXISTS bucket TEXT NOT NULL DEFAULT 'disciplinary-processes',
  ADD COLUMN IF NOT EXISTS original_file_name TEXT,
  ADD COLUMN IF NOT EXISTS stored_file_name TEXT,
  ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS processing_error TEXT,
  ADD COLUMN IF NOT EXISTS analysis_version TEXT,
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_disciplinary_files_storage_path
  ON disciplinary_process_files (tenant_id, storage_path);

CREATE INDEX IF NOT EXISTS idx_disciplinary_files_student
  ON disciplinary_process_files (student_id);

ALTER TABLE disciplinary_annotations_detected
  ADD COLUMN IF NOT EXISTS raw_text TEXT,
  ADD COLUMN IF NOT EXISTS normalized_text TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS classification_method TEXT,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(4, 3),
  ADD COLUMN IF NOT EXISTS parser_version TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_annotation_type TEXT,
  ADD COLUMN IF NOT EXISTS corrected_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS corrected_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_disciplinary_annotations_process_sequence
  ON disciplinary_annotations_detected (process_id, line_number);

COMMENT ON COLUMN disciplinary_process_files.storage_path IS 'Ruta privada en Supabase Storage. No debe contener nombres de estudiantes.';
COMMENT ON COLUMN disciplinary_annotations_detected.raw_text IS 'Texto original extraído para auditoría. No reemplaza al PDF fuente.';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf'],
    file_size_limit = 10485760,
    public = false
WHERE id = 'disciplinary-processes';
