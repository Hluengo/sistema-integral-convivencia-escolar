-- ============================================================
-- Migration: Bucket para procesos disciplinarios
-- ============================================================

-- Crear bucket para almacenar PDFs de procesos disciplinarios
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'disciplinary-processes',
  'disciplinary-processes',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'text/markdown', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Política RLS: solo usuarios autenticados del mismo tenant pueden acceder
CREATE POLICY "Users can upload disciplinary files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'disciplinary-processes'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their tenant's files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'disciplinary-processes'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their tenant's files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'disciplinary-processes'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their tenant's files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'disciplinary-processes'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);
