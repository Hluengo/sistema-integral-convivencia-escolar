# Storage Architecture

## Buckets

| Bucket | Propósito | Visibilidad | Path Pattern |
|--------|-----------|-------------|--------------|
| `anotaciones` | Documentos de anotaciones | Privado | `{tenant_id}/...` |
| `disciplinary-processes` | PDFs de procesos disciplinarios | Privado | `{tenant_id}/{student_id}/{process_id}/{stored_name}` |
| `documentos_convivencia` (legacy) | Documentos varios | Privado | `{causa_id}/...` |

## Path Conventions

### `anotaciones`
````
{tenant_id}/{archivo_nombre}.pdf
````

### `disciplinary-processes`
````
{tenant_id}/{student_id}/{process_id}/{timestamp}_{hash}.pdf
````

### `documentos_convivencia` (legacy)
```
{causa_id}/{prefix}_{archivo_nombre}
```

## RLS en Storage

Los objetos en storage siguen el mismo patrón de tenant isolation:

```sql
CREATE POLICY "tenant_files_select"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'disciplinary-processes'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM profiles
    WHERE user_id = auth.uid()
  )
);
```

## Signed URLs

Los archivos se acceden mediante signed URLs con expiración (por defecto 1 hora). Nunca se exponen URLs directas a los buckets privados.

## File Validation

- Máximo 10 MB
- Solo PDF, MD, TXT (anotaciones)
- Solo PDF (disciplinary-processes)
- Validación de header `%PDF-` al subir
