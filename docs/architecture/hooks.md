# Custom Hooks

## React Query Hooks

| Hook | Query Key | Stale Time | Descripción |
|------|-----------|------------|-------------|
| `useCoursesQuery()` | `['courses']` | 30 min | Obtiene todos los cursos |
| `useStudentsQuery(courseId)` | `['students', courseId]` | 10 min | Estudiantes por curso (solo si courseId ≠ null) |

## App-Level Hooks

| Hook | Archivo | Propósito |
|------|---------|-----------|
| `useNewCausaForm()` | `hooks/useNewCausaForm.ts` | useReducer para wizard de nuevo caso |
| `useCausasPersistence()` | `hooks/useCausasPersistence.ts` | Carga inicial + auto-save debounced (2s) |
| `useKeyboardShortcuts()` | `hooks/useKeyboardShortcuts.ts` | Atajos de teclado globales |
| `useNotifications()` | `hooks/useNotifications.ts` | Notificaciones desde causas |
| `useAppContext()` | `lib/useAppContext.ts` | Facade que combina todos los stores |
| `useTextImprovement()` | `hooks/useTextImprovement.ts` | Llama a `/api/improve-text` |

## Timeline Hooks

| Hook | Archivo | Propósito |
|------|---------|-----------|
| `useTimelineController()` | `hooks/useTimelineController.ts` | Compone sub-hooks del timeline |
| `useChecklistRegistration()` | `hooks/useChecklistRegistration.ts` | Registro de items checklist |
| `useDocumentManager()` | `hooks/useDocumentManager.ts` | Subir/listar/remover documentos |
| `useBitacoraLog()` | `hooks/useBitacoraLog.ts` | Gestión de entradas de bitácora |
| `useAuditDraft()` | `hooks/useAuditDraft.ts` | AI audit + draft de documentos |
| `useBreaches()` | `features/timeline/hooks/useBreaches.ts` | Cómputo de plazos legales vencidos |

## Document Generation Hooks

| Hook | Archivo | Propósito |
|------|---------|-----------|
| `useDocumentState()` | `docgen/hooks/useDocumentState.ts` | Estado del formulario de documento |
| `useSelectedAnnotations()` | `docgen/hooks/useSelectedAnnotations.ts` | Anotaciones seleccionadas |
| `useDocumentExport()` | `docgen/hooks/useDocumentExport.ts` | Exportar documento a DOCX |
| `useDocumentRegistry()` | `docgen/hooks/useDocumentRegistry.ts` | Registrar carta en DB |
| `useRegisterCommitment()` | `docgen/hooks/useRegisterCommitment.ts` | Registrar compromiso |

## Disciplinary PDF Hooks

| Hook | Archivo | Propósito |
|------|---------|-----------|
| `useDisciplinaryData()` | `AnotacionesStudentDetailModal/hooks/useDisciplinaryData.ts` | Datos del proceso disciplinario |
| `usePdfProcessing()` | `AnotacionesStudentDetailModal/hooks/usePdfProcessing.ts` | Procesamiento de PDF |

## Pattern

Todos los hooks siguen el patrón:
- Un solo propósito (Single Responsibility)
- Devuelven objetos/interfaces tipadas
- No mutan props — llaman a stores o servicios
- Nombres con prefijo `use` + sustantivo descriptivo
