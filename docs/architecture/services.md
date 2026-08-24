# Services Layer

Los servicios encapsulan toda la comunicación con Supabase (base de datos, auth, storage) y APIs externas.

## Data Services (`src/shared/api/services/`)

| Servicio                          | Archivo                                                                                                                                                                                                                                                                                   | Métodos Clave                                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `auth.service.ts`                 | `signInWithEmail`, `signOut`, `onAuthStateChange`                                                                                                                                                                                                                                         | Auth                                                                                       |
| `causas.service.ts`               | `fetchCausas`, `fetchCausaDetails`, `createCausa`, `updateCausa`, `deleteCausa`                                                                                                                                                                                                           | Listado y detalle diferido de casos                                                        |
| `bitacora.service.ts`             | `saveBitacora`, `buildBitacoraSnapshotDelta`                                                                                                                                                                                                                                              | Historial vía RPC transaccional                                                            |
| `checklist.service.ts`            | `saveChecklist`, `buildChecklistSnapshotDelta`                                                                                                                                                                                                                                            | Checklist vía RPC transaccional                                                            |
| `annotations.service.ts`          | `fetchAnnotations`, `updateAnnotation`, `fetchAnnualAnnotationTrends`, `fetchStudentsWithAnnotationCounts`, `fetchAnnotationStageCounts`, `fetchDocumentAnalyses`, `fetchStudentAnnotationRanking`, `fetchTeacherAnnotationRanking`                                                       | Anotaciones (reciben `tenantId` explícito desde call sites)                                |
| `courses.service.ts`              | `fetchCourses`, `fetchStudentsByCourse`, `fetchStudentsWithCourses`                                                                                                                                                                                                                       | Cursos                                                                                     |
| `cartas.service.ts`               | `fetchCartas`, `fetchStudentDisciplinarySnapshot`, `createPendingCartaForStudent`, `markCartaProcessedManually`, `annulCarta`, `archiveCarta`, `registerPhysicalCartaForStudent`, `fetchCartaTableStates`, `fetchCourseCartaRanking`, `resolveCartaWorkflowStatus`, etapas disciplinarias | Cartas y etapas (escritura dual old+new en `carta_events` por DB-01)                       |
| `storage.service.ts`              | `uploadDocument`, `listDocuments`, `deleteDocument`                                                                                                                                                                                                                                       | Storage legacy                                                                             |
| `disciplinary-storage.service.ts` | `validateDisciplinaryPdf`, `uploadDisciplinaryFile`, `getDisciplinaryFileUrl`, `deleteDisciplinaryFile`                                                                                                                                                                                   | Storage PDF                                                                                |
| `disciplinary-rules.service.ts`   | `fetchDisciplinaryRules(tenantId)`                                                                                                                                                                                                                                                        | Reglas (tenantId explícito; `null` devuelve `[]`)                                          |
| `causaDocuments.service.ts`       | `createPendingCausaDocument`, `fetchCausaDocuments`, `saveCausaDocumentSnapshot`, `markCausaDocumentNotified`, `annulCausaDocument`                                                                                                                                                       | Documentos oficiales de causa (Notificación de Inicio de Indagación) vía RPC transaccional |

## Servicios de API Externa (desde frontend)

- `useAuditDraft` → `fetch('/api/audit-due-process')` — Auditoría AI
- `useAuditDraft` → `fetch('/api/draft-document')` — Draft AI

## Data Mappers (`src/shared/lib/mappers.ts`)

Convierten filas de Supabase (snake_case) a tipos TypeScript (camelCase):

- `mapInspectorateToAnnotation()` — InspectorateRecord → Annotation
- `mapCauseRowToCarta()` — DB row → CartaDisciplinaria
- `mapStageRowToEtapa()` — DB row → EtapaDisciplinaria

## Zod Schemas (`src/shared/lib/schemas/index.ts`)

Validación runtime para todos los tipos del dominio:

- `CausaSchema`, `BitacoraEntrySchema`, `ChecklistItemSchema`
- `AnnotationSchema`, `AnotacionStudentSchema`
- `CartaDisciplinariaSchema`, `EtapaDisciplinariaSchema`
- `CourseSchema`, `StudentSchema`, `StatisticsSchema`

## Patrón de Servicios

```
Components/Hooks
  └── Service Layer (shared/api/services/)
      └── Supabase Client (shared/api/lib/supabase.ts)
          └── @supabase/supabase-js
              ├── Database (SELECT, INSERT, UPDATE, DELETE)
              ├── Auth (signInWithPassword, signOut, onAuthStateChange)
              └── Storage (upload, download, list, remove)
```

## Caché de Expedientes

`useCausasQuery` concentra las lecturas de expedientes en React Query. Sus claves separan listado y detalle, e incluyen el tenant. `causasQueryCache` actualiza la caché después de una mutación exitosa para evitar consultas globales adicionales.

## Persistencia de Antecedentes

`saveBitacora()` y `saveChecklist()` ya no ejecutan `upsert` y `delete` por separado desde el cliente. Cada servicio calcula el delta local y llama una RPC `security invoker` (`save_bitacora_snapshot` / `save_checklist_snapshot`) que aplica filas cambiadas e IDs removidos dentro de una única transacción PostgreSQL, usando el tenant resuelto por RLS.
