# Architecture Reference — Sistema Integral de Convivencia Escolar

## Stack

```
Frontend:    React 19 + TypeScript 5.8 + Vite 6 + Tailwind v4
State:       Zustand 5 + TanStack React Query 5
Forms:       react-hook-form 7 + Zod 4
Backend:     Express 4 (dev) / Vercel Serverless (prod)
Database:    Supabase PostgreSQL 17 + Auth + Storage
AI:          OpenRouter (meta-llama/llama-3.1-8b-instruct)
Documents:   docx (Word) + pdfjs-dist 6 (PDF)
Monitoring:  Sentry + PostHog
```

## FSD Structure

```
src/
├── app/              # Entry, providers, global styles
├── features/         # Feature modules (anotaciones, causas, timeline, dashboard)
├── widgets/          # Header, Sidebar
├── shared/           # api/services, lib, ui, hooks, stores, schemas
├── components/       # Legacy barrels (backward compat)
├── hooks/            # Re-exports
├── stores/           # Re-exports
├── services/         # Re-exports
└── lib/              # Re-exports
```

## Patrón de State

```
Zustand: authStore | causasStore | uiStore | toastStore
  └── Estado global + acciones síncronas

React Query: ['courses'], ['students', courseId]
  └── Fetching + cache (staleTime: 30min / 10min)

useReducer: useNewCausaForm
  └── Estado local de formulario wizard

Auto-save: useCausasPersistence → debounce 2s → Supabase
```

## State-driven Routing (No React Router)

```
uiStore.currentView → MainContent renderiza:
  dashboard | causas | informes | alumnos | anotaciones | documentos

Modals (sin ruta): LoginPage, NewCausaModal, EditCausaModal, ShortcutsModal,
  NewDisciplinaryProcessModal, AnotacionesStudentDetailModal, OnboardingTour
```

## Dual Server Entry Points

```
Dev:  server/index.ts → tsx → Express + Vite HMR
Prod: server/api/index.ts → esbuild → api/index.js → Vercel Serverless

⚠️ Ambos deben mantener sincronía en rutas, middleware y lógica.
```

## API Endpoints (11)

Ver `docs/architecture/backend.md` para lista completa.
Resumen: 4 endpoints AI, 2 PDF processing, 2 documentos, 2 usage, 1 debug.
