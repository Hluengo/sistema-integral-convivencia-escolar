# Arquitectura — Debido Proceso

## Visión General

Debido Proceso es una aplicación web SaaS para la gestión de casos de convivencia escolar en Chile, con cumplimiento total de la normativa legal vigente.

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS v4 + lucide-react |
| Backend | Express.js (dev) / Vercel Serverless |
| Base de Datos | Supabase PostgreSQL 17 |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| AI | Groq API (llama-3.3-70b-versatile) |
| Deploy | Vercel |

## Arquitectura de Componentes

```
index.html
  └── src/main.tsx
       └── App.tsx
            ├── Layout (Sidebar + MainContent)
            ├── DashboardView
            ├── CasesListView
            ├── CaseDetailView
            │    ├── ResumenCausa
            │    ├── Timeline
            │    ├── ChecklistPanel
            │    └── DocumentosCausa
            ├── AdvisorView (AI Asesor Legal)
            │    ├── Consulta Legal (chat)
            │    └── Plantillas (editor)
            ├── NewCaseWizard
            └── ReportsView
```

## Flujo de Datos

```
Usuario → React UI → API (fetch) → Express/Vercel → Supabase
                                    ↓
                              Groq API (AI)
```

## Seguridad

1. JWT verification (HMAC + ES256 fallback)
2. requireAuth middleware
3. RLS policies en Supabase
4. CSP headers en Vercel
5. Signed URLs para documentos
6. Per-user cache

## Convenciones

- Path alias `@/` → project root
- Snake_case en DB, camelCase en TS
- Español chileno en UI
- License headers Apache-2.0
