-- Amplía allowed_mime_types del bucket anotaciones para aceptar archivos .md
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'text/markdown', 'text/plain']
WHERE id = 'anotaciones';
