# Storage Architecture

## Buckets

| Bucket                            | Propósito                       | Visibilidad | Path Pattern                                          |
| --------------------------------- | ------------------------------- | ----------- | ----------------------------------------------------- |
| `anotaciones`                     | Documentos de anotaciones       | Privado     | `{tenant_id}/...`                                     |
| `disciplinary-processes`          | PDFs de procesos disciplinarios | Privado     | `{tenant_id}/{student_id}/{process_id}/{stored_name}` |
| `documentos_convivencia` (legacy) | Documentos varios               | Privado     | `{causa_id}/...`                                      |

## Path Conventions

### `anotaciones`

```
{tenant_id}/{archivo_nombre}.pdf
```

### `disciplinary-processes`

```
{tenant_id}/{student_id}/{process_id}/{timestamp}_{hash}.pdf
{tenant_id}/pending-student/draft/{stored_name}.pdf
```

### `documentos_convivencia` (legacy)

```
{causa_id}/documentos/{timestamp}_{archivo_nombre}
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

Para `disciplinary-processes`, las políticas `SELECT`, `INSERT`, `UPDATE` y
`DELETE` validan membresía activa en `app_memberships` para la aplicación
`convivencia`, con los mismos roles aceptados por `CONVIVENCIA_MEMBERSHIP` en
el middleware. Esto permite que cuentas operativas como `staff` suban PDFs al
modal de revisión sin romper el aislamiento por carpeta `{tenant_id}/...`.

Para `documentos_convivencia`, las políticas `SELECT`, `INSERT` y `DELETE`
validan que la primera carpeta sea el `causa.id`, que la segunda carpeta sea
`documentos`, y que el usuario tenga una membresía activa de la aplicación
`convivencia` en el tenant dueño de esa causa. La lista de roles aceptados se
mantiene alineada con `CONVIVENCIA_MEMBERSHIP`, incluyendo `staff`, porque el
modal de causas permite registrar hitos y bitácora manual desde cuentas
operativas.

## Signed URLs

Los archivos se acceden mediante signed URLs con expiración (por defecto 1 hora). Nunca se exponen URLs directas a los buckets privados.

## File Validation

- Máximo 10 MB
- Solo PDF, MD, TXT (anotaciones)
- Solo PDF (disciplinary-processes)
- Validación de header `%PDF-` al subir
