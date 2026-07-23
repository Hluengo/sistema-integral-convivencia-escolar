# 04 — Storage

> **Referencia detallada:** `docs/architecture/storage.md`

## Buckets

| Bucket | Uso | Privado | Max Size | MIME |
|--------|-----|---------|----------|------|
| `anotaciones` | Documentos de anotaciones | ✅ | 10 MB | PDF, MD, TXT |
| `disciplinary-processes` | PDFs de procesos disciplinarios | ✅ | 10 MB | PDF |
| `documentos_convivencia` (legacy) | Documentos varios | ✅ | — | — |

## Path Conventions
- `anotaciones`: `{tenant_id}/{filename}`
- `disciplinary-processes`: `{tenant_id}/{student_id}/{process_id}/{stored_name}`
