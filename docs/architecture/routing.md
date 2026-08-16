# Navigation & Routing

## Estrategia: URL + bridge de estado

La navegación usa un bridge propio entre `window.history` y el Zustand `uiStore`.
`src/app/routing.ts` define el mapa canónico de paths y `src/app/hooks/useUrlRouting.ts`
mantiene sincronizados `window.location`, `uiStore.currentView` y
`causasStore.selectedCausaId`.

No se agregó `react-router-dom`: la dependencia fue evaluada en la Fase 3, pero
`npm run security-audit` falló por advisory alto en `react-router`. La migración
a rutas declarativas queda condicionada a una versión que pase el gate de seguridad.

## Views

| View ID       | Ruta principal     | Componente Renderizado                   | Feature                   |
| ------------- | ------------------ | ---------------------------------------- | ------------------------- |
| `dashboard`   | `/`                | `<DashboardStats>`                       | Dashboard con KPIs        |
| `causas`      | `/expedientes`     | `<CausasView>` + `<InteractiveTimeline>` | Gestión de casos          |
| `causas`      | `/expedientes/:id` | `<CausasView>` con detalle seleccionado  | Deep link de expediente   |
| `informes`    | `/informes`        | `<AdvisorView>`                          | Asesoría AI + Plantillas  |
| `alumnos`     | `/alumnos`         | `<StudentsPanel>`                        | Directorio de estudiantes |
| `anotaciones` | `/anotaciones`     | `<AnotacionesView>`                      | Sistema de anotaciones    |
| `reportes`    | `/reportes`        | `<ReportsCenter>`                        | Centro de reportes        |
| `admin`       | `/admin`           | `<AdminView>`                            | Administración tenant     |
| `platform`    | `/plataforma`      | `<PlatformView>`                         | Administración global     |
| `login`       | `/login`           | `<LoginPage>` modal                      | Autenticación             |

## Modals

| Modal                           | Trigger                                | Store/State                        |
| ------------------------------- | -------------------------------------- | ---------------------------------- |
| `LoginPage`                     | `/login`, no autenticado / botón login | `authStore.showLoginModal`         |
| `NewCausaModal`                 | Botón "Nuevo Caso" (tecla N)           | `useNewCausaForm` RHF + Zod        |
| `EditCausaModal`                | Click en "Editar" en timeline          | Local state en InteractiveTimeline |
| `ShortcutsModal`                | Tecla `?`                              | `uiStore.showShortcuts`            |
| `NewDisciplinaryProcessModal`   | Botón "Nuevo Proceso" en Anotaciones   | Local state en AnotacionesView     |
| `AnotacionesStudentDetailModal` | Click en estudiante en tabla           | Local state en AnotacionesView     |
| `OnboardingTour`                | Primera visita                         | Feature flag                       |

## Sidebar Navigation

La `Sidebar` contiene:

- Logo del establecimiento
- Items de navegación (icono + label)
- Colapso (toggle)
- User menu (avatar + nombre + rol + logout)

`Sidebar`, `Header` y `CommandPalette` siguen llamando `handleViewChange()`;
ese callback delega en `navigateToView()` para que el URL cambie junto con el
estado de UI.

## Keyboard Shortcuts

- `N` → Nuevo caso
- `?` → Mostrar shortcuts
- `Escape` → Cerrar modal activo

## Limitations

- **Routing declarativo pendiente**: `MainContent` todavía renderiza por condicionales mientras el bridge evita una reescritura completa de vistas.
- **Deep link autenticado pendiente de E2E**: `/expedientes/:id` está cubierto por tests unitarios de parsing; falta prueba E2E con sesión y datos reales.
- **Rutas de modales limitadas**: solo `/login` tiene URL propia. `NewCausaModal`, edición de causa y modales de anotaciones siguen controlados por estado local.
