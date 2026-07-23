# 00 — Architecture Overview

> **Propósito:** Mapa general del sistema. Lee esto primero.
> **Documentos detallados:** Cada sección referencia su archivo específico.

## System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                        Users                             │
│  (admin, direccion, convivencia, inspectoria, docente)   │
└──────────────┬──────────────────────────────┬────────────┘
               │                              │
        ┌──────▼──────┐              ┌────────▼────────┐
        │   React      │              │   Express        │
        │   Frontend   │◄────API────►│   / Vercel       │
        │   (Vite)     │              │   Serverless     │
        └──────┬──────┘              └────────┬────────┘
               │                              │
               │  Supabase SDK                │  Service Role
               │  (anon key)                  │  (admin ops)
               │                              │
        ┌──────▼──────────────────────────────▼────────┐
        │                 Supabase                       │
        │  ┌──────────┐  ┌──────────┐  ┌────────────┐   │
        │  │  Auth     │  │  DB      │  │  Storage    │   │
        │  │ (JWT)    │  │ (PG 17)  │  │ (Buckets)  │   │
        │  └──────────┘  └────┬─────┘  └────────────┘   │
        │                     │                          │
        │              ┌──────▼──────┐                   │
        │              │   RLS       │                   │
        │              │ (tenant_id) │                   │
        │              └─────────────┘                   │
        └────────────────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
        ┌─────▼─────┐        ┌──────▼──────┐
        │  OpenRouter │        │  Sentry     │
        │  (AI)      │        │  PostHog    │
        └───────────┘        └─────────────┘
```

## Architecture Stack

| Capa | Tecnología | Archivo |
|------|-----------|---------|
| Frontend | React 19 + Vite 6 + Tailwind 4 | [01-frontend.md](./01-frontend.md) |
| Backend | Express 4 / Vercel Serverless | [02-backend.md](./02-backend.md) |
| Database | Supabase PostgreSQL 17 | [03-database.md](./03-database.md) |
| Storage | Supabase Storage | [04-storage.md](./04-storage.md) |
| Auth | Supabase Auth + JWT | [05-auth.md](./05-auth.md) |
| Permissions | RLS + Roles | [06-permissions.md](./06-permissions.md) |
| State | Zustand + React Query | [07-state.md](./07-state.md) |
| Services | Supabase SDK + API | [08-services.md](./08-services.md) |
| Components | React Component Tree | [09-components.md](./09-components.md) |
| DocGen | DOCX + PDF | [10-docgen.md](./10-docgen.md) |
| PDF Analysis | pdfjs-dist + regex | [11-pdf-analysis.md](./11-pdf-analysis.md) |
| Performance | Chunks, cache, lazy | [12-performance.md](./12-performance.md) |
| Security | JWT, CSP, RLS, Privacy | [13-security.md](./13-security.md) |
| Roadmap | Próximos pasos | [14-roadmap.md](./14-roadmap.md) |

## Navigation Map

```
App shell (Sidebar + Header + MainContent)
├── Dashboard      → KPIs, métricas, severity cards
├── Causas         → Lista de casos + Timeline interactivo
│   ├── ProcesoTab → Checklist + RegistrationForm
│   ├── BitacoraTab → Historial de acciones
│   └── AsistenteIATab → Auditoría + Draft AI
├── Informes       → Asesor AI + Editor de plantillas
├── Alumnos        → Directorio de estudiantes por curso
├── Anotaciones    → Tabla estudiantes + Detail modal + Proceso PDF
└── Documentos     → Generador de documentos unificado
```

## Data Flow (Simplificado)

```
User Action → Component → Service → Supabase Client → Database
                                        │
                                    React Query
                                    (cache)
                                        │
                                    Component re-render
                                        │
                                    User sees result
```

## AI Flow

```
User Message → Component → fetch(/api/endpoint)
  → Express/Vercel → sanitizeForAI() → OpenRouter API
  → LLM Response → sanitize output → Return to client
  → Component renders AI result
```
