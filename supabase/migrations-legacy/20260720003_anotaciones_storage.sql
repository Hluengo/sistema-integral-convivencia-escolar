CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('anotaciones', 'anotaciones', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anotaciones_upload" ON storage.objects;
DROP POLICY IF EXISTS "anotaciones_select" ON storage.objects;
DROP POLICY IF EXISTS "anotaciones_delete" ON storage.objects;

CREATE POLICY "anotaciones_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'anotaciones'
    AND (storage.foldername(name))[1] = (SELECT current_tenant_id()::text)
  );

CREATE POLICY "anotaciones_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'anotaciones'
    AND (storage.foldername(name))[1] = (SELECT current_tenant_id()::text)
  );

CREATE POLICY "anotaciones_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'anotaciones'
    AND (storage.foldername(name))[1] = (SELECT current_tenant_id()::text)
  );

ALTER TABLE inspectorate_records ADD COLUMN IF NOT EXISTS pdf_file_path text;

SELECT pg_notify('pgrst', 'reload schema');
