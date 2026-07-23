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
            │   │       ├── CourseSelectStep
            │   │       ├── StudentSelectStep
            │   │       ├── ClassificationStep
            │   │       └── ReviewStep
            │   └── documentos → <DocumentosView>
            │       └── <AnotacionesDocumentGenerator> (lazy)
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

| Store | Ubicación | Estado | Persistencia |
|-------|-----------|--------|-------------|
| `authStore` | `shared/lib/stores/authStore.ts` | user, tenantId, authLoading | Supabase onAuthStateChange |
| `causasStore` | `shared/lib/stores/causasStore.ts` | causas[], selectedCausaId, saveStatus | Auto-save debounced 2s |
| `uiStore` | `shared/lib/stores/uiStore.ts` | currentView, sidebarCollapsed, privacyMode | — |
| `toastStore` | `shared/lib/stores/toastStore.ts` | toasts[] | — |

## Lazy Loading Strategy

- **Siempre lazy**: Componentes de página (vistas) y modals grandes
- **Nunca lazy**: Componentes shared (Button, Dialog) y providers
- **Suspense boundaries**: Cada vista tiene su propio `<Suspense>` con skeleton específico

## Conventions

- Feature-Sliced Design (FSD) con capas: app → features → widgets → shared
- Legacy `components/` preserva barrels para retrocompatibilidad
- Componentes de UI compartidos en `shared/ui/`
- Servicios de datos en `shared/api/services/`
- Hooks en `shared/lib/hooks/`
- Zod schemas en `shared/lib/schemas/`
