# Components Architecture

## Shared UI Components (`src/shared/ui/`)

| Componente | Archivo | Propósito |
|-----------|---------|-----------|
| `Button` | `Button.tsx` | Botón reutilizable con variantes |
| `Dialog` | `Dialog.tsx` | Modal dialog con overlay |
| `AlertDialog` | `AlertDialog.tsx` | Diálogo de confirmación |

## Shared Components (`src/shared/`)

| Componente | Archivo | Propósito |
|-----------|---------|-----------|
| `EmptyState` | `EmptyState.tsx` | Placeholder para estados vacíos |
| `Skeleton` | `Skeleton.tsx` | Loading skeletons |
| `SeverityBadge` | `SeverityBadge.tsx` | Badge de severidad con color |
| `ImproveTextarea` | `ImproveTextarea.tsx` | Textarea con botón de mejora AI |
| `ConfirmDialog` | `ConfirmDialog.tsx` | Confirmación reutilizable |

## Widgets (`src/widgets/`)

| Widget | Archivo | Propósito |
|--------|---------|-----------|
| `Header` | `header/Header.tsx` | Header sticky con acciones |
| `SearchBar` | `header/SearchBar.tsx` | Búsqueda global |

## Page Components (`src/features/`)

### Dashboard
- `DashboardStats.tsx` + `AnotacionesDashboardStats.tsx` — KPIs, tarjetas, gráficos

### Causas
- `CausasView.tsx` — Lista de casos con filtros
- `CausaCard.tsx` — Tarjeta resumen de caso
- `InteractiveTimeline.tsx` — Detalle del caso con tabs
- `NewCausaModal.tsx` / `NewCausaForm.tsx` — Wizard de nuevo caso
- `EditCausaModal.tsx` — Modal de edición

### Timeline (detalle de caso)
- `TimelineHeader.tsx` — Encabezado con estado y fase
- `TimelineTabs.tsx` — Pestañas de navegación
- `ProcesoTab.tsx` — Checklist + formulario de registro
- `BitacoraTab.tsx` — Bitácora de acciones
- `AsistenteIATab.tsx` — AI Audit + Draft
- `AuditPanel.tsx` — Panel de auditoría
- `DraftPanel.tsx` — Panel de drafts
- `AttachedDocuments.tsx` — Documentos adjuntos

### Anotaciones
- `AnotacionesView.tsx` — Vista principal
- `AnotacionesStudentTable.tsx` — Tabla de estudiantes
- `AnotacionesStudentDetailModal.tsx` — Detalle del estudiante
- `NewDisciplinaryProcessModal.tsx` — Wizard de proceso desde PDF
  - `UploadAnalyzeStep.tsx` — Subir y analizar PDF
  - `CourseSelectStep.tsx` — Seleccionar curso
  - `StudentSelectStep.tsx` — Seleccionar estudiante
  - `ClassificationStep.tsx` — Clasificar anotaciones
  - `ReviewStep.tsx` — Revisar y confirmar
- `AnotacionesDocumentGenerator.tsx` — Generador de documentos

### Documentos
- `DocumentosView.tsx` — Centro de documentos

### AI
- `AiAdvisor.tsx` — Chat con asesor legal AI
- `AdvisorMessage.tsx` — Mensaje del chat

### Layout
- `Sidebar.tsx` — Navegación lateral
- `MainContent.tsx` — Contenedor principal (switch de vistas)
- `ErrorBoundary.tsx` — Límite de error con retry
- `Toast.tsx` — Sistema de notificaciones

## Patterns

- **Composición sobre herencia**: Los componentes se componen, no heredan
- **Props tipadas**: Todos los componentes tienen interfaces de props explícitas
- **No prop drilling > 2 niveles**: Usar Zustand o Context
- **Lazy loading**: Componentes pesados con React.lazy + Suspense
- **Loading states**: Cada vista tiene su Skeleton correspondiente
