-- Permite almacenar evidencia de texto pegado en los documentos privados de convivencia.
-- Conserva los formatos existentes y el límite configurado del bucket.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/markdown',
  'text/plain'
]::text[]
WHERE id = 'documentos_convivencia';
