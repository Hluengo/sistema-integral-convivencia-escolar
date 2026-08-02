# Components Architecture

## Shared UI Components (`src/shared/ui/`)

| Componente       | Archivo              | Propósito                        |
| ---------------- | -------------------- | -------------------------------- |
| `Button`         | `Button.tsx`         | Botón reutilizable con variantes |
| `Dialog`         | `Dialog.tsx`         | Modal dialog con overlay         |
| `AlertDialog`    | `AlertDialog.tsx`    | Diálogo de confirmación          |
| `ErrorBoundary`  | `ErrorBoundary.tsx`  | Límite de error con retry        |
| `MetricCard`     | `MetricCard.tsx`     | Tarjeta KPI reutilizable         |
| `ShortcutsModal` | `ShortcutsModal.tsx` | Modal de atajos de teclado       |
| `ToastProvider`  | `Toast.tsx`          | Sistema global de notificaciones |

## Shared Components (`src/shared/`)

| Componente        | Archivo               | Propósito                       |
| ----------------- | --------------------- | ------------------------------- |
| `EmptyState`      | `EmptyState.tsx`      | Placeholder para estados vacíos |
| `Skeleton`        | `Skeleton.tsx`        | Loading skeletons               |
| `SeverityBadge`   | `SeverityBadge.tsx`   | Badge de severidad con color    |
| `ImproveTextarea` | `ImproveTextarea.tsx` | Textarea con botón de mejora AI |
| `ConfirmDialog`   | `ConfirmDialog.tsx`   | Confirmación reutilizable       |

## Widgets (`src/widgets/`)

| Widget            | Archivo                       | Propósito                        |
| ----------------- | ----------------------------- | -------------------------------- |
| `Header`          | `header/Header.tsx`           | Header sticky con acciones       |
| `HeaderActions`   | `header/HeaderActions.tsx`    | Acciones del header              |
| `PageTitle`       | `header/PageTitle.tsx`        | Título contextual por vista      |
| `SearchBar`       | `header/SearchBar.tsx`        | Búsqueda global                  |
| `Sidebar`         | `sidebar/Sidebar.tsx`         | Navegación lateral del app shell |
| `SidebarUserMenu` | `sidebar/SidebarUserMenu.tsx` | Estado de sesión dentro del menú |

## Page Components (`src/features/`)

### Dashboard

- `DashboardStats.tsx` + `AnotacionesDashboardStats.tsx` — KPIs, tarjetas, gráficos

### Causas

- `CausasView.tsx` — Lista de casos con filtros
- `CausaCard.tsx` — Tarjeta resumen de caso
- `ClosedCases.tsx` — Listado de expedientes cerrados
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
  - `StudentSelectStep.tsx` — Seleccionar estudiante
  - `ClassificationStep.tsx` — Clasificar anotaciones
  - `ReviewStep.tsx` — Revisar y confirmar
- `AnotacionesDocumentGenerator.tsx` — Generador de documentos

### AI

- `AiAdvisor.tsx` — Chat con asesor legal AI
- `AdvisorMessage.tsx` — Mensaje del chat

### Layout

- `MainContent.tsx` — Contenedor principal (switch de vistas)

## Legacy Compatibility Layer (`src/components/`)

`src/components/` conserva compatibilidad con imports históricos, pero los componentes canónicos deben vivir en `features/`, `widgets/` o `shared/ui/`.

- `src/components/` contiene 30 archivos: 27 barrels protegidos por `src/components/legacyCompatibility.test.ts`, 2 componentes reales pendientes y el test de compatibilidad.
- Barrels protegidos: `AiAdvisor`, `ClosedCases`, `CommandPalette`, `DashboardStats`, `EditCausaModal`, `ErrorBoundary`, `Header`, `Header/HeaderActions`, `Header/NotificationsDropdown`, `Header/PageTitle`, `Header/PrivacyToggle`, `Header/SaveStatus`, `Header/UserAvatar`, `Header/constants`, `Header/hooks/useEscapeClose`, `LoginPage`, `MainContent`, `MetricCard`, `NewCausaModal`, `Sidebar`, `SidebarUserMenu`, `ShortcutsModal`, `Toast`, `InteractiveTimeline/TimelineHeader`, `InteractiveTimeline/TimelineTabPanels`, `InteractiveTimeline/TimelineTabs`, `InteractiveTimeline/hooks/useBreaches`.
- Componentes reales aún pendientes de migración gradual: `InteractiveTimeline` y `TemplateEditor`.
- `MetricCard`, `ErrorBoundary`, `ShortcutsModal` y `ToastProvider` ya fueron movidos a `src/shared/ui/`; `Header` y sus subcomponentes viven en `src/widgets/header/`; `Sidebar` y `SidebarUserMenu` viven en `src/widgets/sidebar/`. Sus archivos bajo `src/components/` quedan sólo como re-export de compatibilidad.

## Patterns

- **Composición sobre herencia**: Los componentes se componen, no heredan
- **Props tipadas**: Todos los componentes tienen interfaces de props explícitas
- **No prop drilling > 2 niveles**: Usar Zustand o Context
- **Lazy loading**: Componentes pesados con React.lazy + Suspense
- **Loading states**: Cada vista tiene su Skeleton correspondiente
