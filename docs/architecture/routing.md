# Navigation & Routing

## Estrategia: State-driven (No React Router)

El proyecto NO usa React Router ni ningún router de cliente. La navegación se maneja mediante una variable de estado `currentView` en el Zustand `uiStore`.

## Views

| View ID | Componente Renderizado | Feature |
|---------|----------------------|---------|
| `dashboard` | `<DashboardStats>` | Dashboard con KPIs |
| `causas` | `<CausasView>` + `<InteractiveTimeline>` | Gestión de casos |
| `informes` | `<AdvisorView>` | Asesoría AI + Plantillas |
| `alumnos` | `<StudentsPanel>` | Directorio de estudiantes |
| `anotaciones` | `<AnotacionesView>` | Sistema de anotaciones |
| `documentos` | `<DocumentosView>` | Centro de documentos |

## Modals (sin ruta, controlados por estado)

| Modal | Trigger | Store/State |
|-------|---------|-------------|
| `LoginPage` | No autenticado / botón login | `authStore.showLoginModal` |
| `NewCausaModal` | Botón "Nuevo Caso" (tecla N) | `useNewCausaForm` useReducer |
| `EditCausaModal` | Click en "Editar" en timeline | Local state en InteractiveTimeline |
| `ShortcutsModal` | Tecla `?` | `uiStore.showShortcuts` |
| `NewDisciplinaryProcessModal` | Botón "Nuevo Proceso" en Anotaciones | Local state en AnotacionesView |
| `AnotacionesStudentDetailModal` | Click en estudiante en tabla | Local state en AnotacionesView |
| `OnboardingTour` | Primera visita | Feature flag |

## Sidebar Navigation

La `Sidebar` contiene:
- Logo del establecimiento
- Items de navegación (icono + label)
- Colapso (toggle)
- User menu (avatar + nombre + rol + logout)

## Keyboard Shortcuts

- `N` → Nuevo caso
- `?` → Mostrar shortcuts
- `Escape` → Cerrar modal activo

## Limitations

- **No deep linking**: No se puede compartir URL a una vista específica
- **No browser back/forward**: Los botones de navegación del browser no cambian de vista
- **State perdido al recargar**: La vista actual se pierde (vuelve a dashboard)
