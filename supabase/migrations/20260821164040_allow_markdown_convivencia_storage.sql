-- Permite respaldos Markdown en los documentos privados de convivencia.
-- Conserva el límite de 10 MB y las políticas existentes del bucket.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'text/markdown'
]::text[]
WHERE id = 'documentos_convivencia';
