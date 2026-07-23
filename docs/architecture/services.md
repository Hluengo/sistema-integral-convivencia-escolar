# Services Layer

Los servicios encapsulan toda la comunicación con Supabase (base de datos, auth, storage) y APIs externas.

## Data Services (`src/shared/api/services/`)

| Servicio | Archivo | Métodos Clave |
|----------|---------|--------------|
| `auth.service.ts` | `signInWithEmail`, `signOut`, `onAuthStateChange` | Auth |
| `causas.service.ts` | `fetchCausas`, `createCausa`, `updateCausa`, `deleteCausa` | CRUD casos |
| `bitacora.service.ts` | `fetchBitacora`, `saveBitacora`, `addBitacoraEntry` | Historial |
| `checklist.service.ts` | `saveChecklist` | Checklist |
| `annotations.service.ts` | `fetchAnnotations`, `saveAnnotation`, `fetchStudentsWithAnnotationCounts`, `fetchAnnotationStageCounts`, `fetchDocumentAnalyses`, `saveDocumentAnalysis` | Anotaciones |
| `courses.service.ts` | `fetchCourses`, `fetchStudentsByCourse`, `fetchStudentsWithCourses` | Cursos |
| `cartas.service.ts` | `fetchCartas` | Cartas |
| `etapas.service.ts` | `fetchEtapas` | Etapas |
| `storage.service.ts` | `uploadDocument`, `listDocuments`, `deleteDocument` | Storage legacy |
| `disciplinary-storage.service.ts` | `validateDisciplinaryPdf`, `uploadDisciplinaryFile`, `getDisciplinaryFileUrl`, `deleteDisciplinaryFile` | Storage PDF |
| `disciplinary-rules.service.ts` | `fetchDisciplinaryRules` | Reglas |

## Servicios de API Externa (desde frontend)

- `useAuditDraft` → `fetch('/api/audit-due-process')` — Auditoría AI
- `useAuditDraft` → `fetch('/api/draft-document')` — Draft AI
- `useTextImprovement` → `fetch('/api/improve-text')` — Mejora de texto

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
