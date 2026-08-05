# Frontend Architecture

## Component Tree

```
<QueryClientProvider>
  <ErrorBoundary>
    <PerformanceProfiler>
      <AuthAnalytics />
      <App>
        <ToastProvider>
          <AppProvider>
            ├── <CommandPalette /> (lazy)
            ├── <Sidebar /> (lazy)
            ├── <Header /> (lazy)
            ├── <MainContent> (lazy)
            │   ├── dashboard → <DashboardStats>
            │   │   └── AnotacionesDashboardStats
            │   ├── causas → <CausasView>
            │   │   ├── <CausaCard /> × N
            │   │   └── <InteractiveTimeline> (lazy)
            │   │       ├── <TimelineHeader>
            │   │       ├── <TimelineTabs>
            │   │       │   ├── ProcesoTab
            │   │       │   │   ├── <ProcessChecklist>
            │   │       │   │   └── <RegistrationForm>
            │   │       │   ├── BitacoraTab
            │   │       │   └── AsistenteIATab
            │   │       │       ├── <AuditPanel>
            │   │       │       └── <DraftPanel>
            │   │       └── <EditCausaModal> (lazy)
            │   ├── informes → <AdvisorView>
            │   │   ├── <AiAdvisor>
            │   │   └── <TemplateEditor>
            │   ├── alumnos → <StudentsPanel>
            │   ├── anotaciones → <AnotacionesView>
            │   │   ├── <AnotacionesStudentTable>
            │   │   ├── <AnotacionesStudentDetailModal> (lazy)
            │   │   └── <NewDisciplinaryProcessModal> (lazy)
            │   │       ├── UploadAnalyzeStep
            │   │       ├── StudentSelectStep
            │   │       ├── ClassificationStep
            │   │       └── ReviewStep
            └── Modals (todos lazy)
                ├── <LoginPage>
                ├── <NewCausaModal>
                ├── <ShortcutsModal>
                └── <OnboardingTour>
          </AppProvider>
        </ToastProvider>
      </App>
    </PerformanceProfiler>
  </ErrorBoundary>
</QueryClientProvider>
```

## State Management

| Store         | Ubicación                          | Estado                                     | Persistencia               |
| ------------- | ---------------------------------- | ------------------------------------------ | -------------------------- |
| `authStore`   | `shared/lib/stores/authStore.ts`   | user, tenantId, authLoading                | Supabase onAuthStateChange |
| `causasStore` | `shared/lib/stores/causasStore.ts` | causas[], selectedCausaId, saveStatus      | Auto-save debounced 2s     |
| `uiStore`     | `shared/lib/stores/uiStore.ts`     | currentView, sidebarCollapsed, privacyMode | —                          |
| `toastStore`  | `shared/lib/stores/toastStore.ts`  | toasts[]                                   | —                          |

## App Shell

- `App.tsx` actúa como coordinador del shell y se mantiene bajo 300 líneas.
- La carga/hidratación de expedientes vive en `src/app/hooks/useCausaWorkspace.ts`.
- Los permisos de navegación viven en `src/app/hooks/useRoleGates.ts`; la función pura `resolveRoleGates()` cubre la prioridad entre `profileRole` y `appRole`.
- La navegación protegida vive en `src/app/hooks/useAppNavigation.ts`.
- La bienvenida pública vive en `src/app/hooks/useWelcomeGate.ts`.
- El modal de nueva causa se controla desde `src/app/hooks/useNewCausaModalController.tsx`; su estado de formulario vive en `useNewCausaForm()` con `react-hook-form` + Zod (`src/shared/lib/schemas/newCausaForm.ts`) y su frontera lazy está en `src/app/components/NewCausaModalBoundary.tsx`.
- `EditCausaModalForm` y `LoginPage` también usan `react-hook-form` + Zod mediante schemas compartidos en `src/shared/lib/schemas/`.
- `MainContent` recibe view-models agrupados (`causaWorkspace`, `createCausa`, `navigation`) y no vuelve a propagar filtros globales que ya están en Zustand.

## Routing

- `src/app/main.tsx` monta la SPA sin router externo.
- `src/app/routing.ts` define el mapa canónico de vistas: `/`, `/expedientes`, `/expedientes/:causaId`, `/anotaciones`, `/alumnos`, `/informes`, `/reportes`, `/admin`, `/plataforma` y `/login`.
- `src/app/hooks/useUrlRouting.ts` sincroniza la URL con `uiStore.currentView` y `causasStore.selectedCausaId` usando `window.history` y `popstate`.
- La URL es la fuente de verdad para navegación; `uiStore` se mantiene como bridge para las vistas existentes.
- Rutas no autorizadas redirigen a `/` o `/login` según corresponda; `/login` abre el modal de autenticación.

## Lazy Loading Strategy

- **Siempre lazy**: Componentes de página (vistas) y modals grandes
- **Nunca lazy**: Componentes shared (Button, Dialog) y providers
- **Suspense boundaries**: Cada vista y modal lazy visible tiene su propio `<Suspense>` con skeleton específico; `src/app/lazyFallbacks.test.ts` evita volver a `fallback={null}` en `src/app` y `src/features`.

## Shared Charts

- `src/shared/ui/charts/` contiene los componentes reutilizables `TrendChart`, `MonthlyBars` y `LegendPill`.
- `DashboardTrendsPanel` usa `TrendChart` para tendencias del año escolar.
- `ReportsCenter` reutiliza el mismo contrato (`TrendChartPoint`, `ChartSeriesItem`) para la distribución mensual por gravedad.

## Telemetry

- `initializeTelemetry()` se ejecuta después del primer render y delega en `loadTelemetry()`.
- Sentry usa `@sentry/browser` sin Session Replay para evitar captura visual de datos de NNA.
- PostHog, Sentry y Web Vitals se cargan en chunks diferidos; `webVitals` recibe adaptadores y no importa Sentry/PostHog de forma estática.
- Las fuentes se cargan desde `index.html`; `src/index.css` no debe usar `@import` hacia Google Fonts.

## Accessibility

- `npm run test:a11y` ejecuta `@axe-core/playwright` sobre dashboard público y login.
- En CI, el paso de accesibilidad usa `PLAYWRIGHT_USE_WEBSERVER=true` para levantar el servidor de Playwright aun con `CI=true`.
- Los componentes de carga deben usar roles válidos (`role="status"` cuando anuncian estado) y texto visible con contraste AA.

## Conventions

- Feature-Sliced Design (FSD) con capas: app → features → widgets → shared
- Legacy `components/` preserva barrels para retrocompatibilidad
- Componentes de UI compartidos en `shared/ui/`
- Servicios de datos en `shared/api/services/`
- Hooks en `shared/lib/hooks/`
- Zod schemas en `shared/lib/schemas/`
- Formularios nuevos o migrados usan `react-hook-form` + Zod; `NewCausaForm`, `EditCausaModalForm` y `LoginPage` son las referencias vigentes.
