/** @license SPDX-License-Identifier: Apache-2.0 */

CREATE TABLE IF NOT EXISTS public.institution_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'otro',
  original_name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  uploaded_by uuid REFERENCES auth.users(id),
  archived_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS institution_documents_tenant_status_idx
  ON public.institution_documents (tenant_id, status, uploaded_at DESC);

ALTER TABLE public.institution_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS institution_documents_select ON public.institution_documents;
CREATE POLICY institution_documents_select ON public.institution_documents
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.current_app_role() = 'superadmin');

DROP POLICY IF EXISTS institution_documents_write ON public.institution_documents;
CREATE POLICY institution_documents_write ON public.institution_documents
  FOR ALL TO authenticated
  USING (
    public.current_app_role() = 'superadmin'
    OR (tenant_id = public.current_tenant_id() AND public.current_app_role() IN ('admin', 'direccion'))
  )
  WITH CHECK (
    public.current_app_role() = 'superadmin'
    OR (tenant_id = public.current_tenant_id() AND public.current_app_role() IN ('admin', 'direccion'))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.institution_documents TO authenticated;
GRANT ALL ON public.institution_documents TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'institution-assets',
  'institution-assets',
  false,
  20971520,
  ARRAY[
    'image/png', 'image/jpeg', 'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
