# 08 — Services

> **Referencia detallada:** `docs/architecture/services.md`

## Service Layer

| Servicio | Archivo | Tablas |
|----------|---------|--------|
| causasService | `shared/api/services/causas.service.ts` | causas, bitacora_entries, checklist_items |
| bitacoraService | `shared/api/services/bitacora.service.ts` | bitacora_entries |
| checklistService | `shared/api/services/checklist.service.ts` | checklist_items |
| annotationsService | `shared/api/services/annotations.service.ts` | inspectorate_records, document_analyses |
| coursesService | `shared/api/services/courses.service.ts` | courses, students |
| cartasService | `shared/api/services/cartas.service.ts` | cartas_disciplinarias |
| etapasService | `shared/api/services/etapas.service.ts` | etapas_disciplinarias |
| storageService | `shared/api/services/storage.service.ts` | storage (documentos_convivencia) |
| disciplinaryStorage | `shared/api/services/disciplinary-storage.service.ts` | storage (disciplinary-processes) |
| disciplinaryRules | `shared/api/services/disciplinary-rules.service.ts` | disciplinary_rules |
| authService | `shared/api/services/auth.service.ts` | Auth, profiles |
