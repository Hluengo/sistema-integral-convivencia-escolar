# Project Brain — Sistema Integral de Convivencia Escolar

> Lee esto PRIMERO antes de tocar cualquier código.
> Última actualización: 2026-07-23

## TL;DR

App SaaS multi-tenant para gestión de convivencia escolar chilena. React 19 + Vite 6 + Tailwind 4 + Zustand 5 + React Query 5 + Supabase + Express + Vercel. AI via OpenRouter (llama-3.1-8b-instruct). Documentos en DOCX.

## Stack Rápido

| Capa | Stack | Tests |
|------|-------|-------|
| Frontend | React 19, TypeScript 5.8, Vite 6, Tailwind 4 | `npm run test` (22) |
| State | Zustand 5 + React Query 5 | `npm run lint` (0 errors) |
| Backend Dev | Express 4 + tsx | `npm run build:web` (~27s) |
| Backend Prod | Vercel Serverless (esbuild) | `npm run test:e2e` |
| Database | Supabase PostgreSQL 17 | 16 tablas, RLS multi-tenant |
| Documentos | docx (Word) + pdfjs-dist (PDF) | 3 templates DOCX |
| AI | OpenRouter (llama-3.1-8b-instruct) | 4 endpoints AI |

## Comandos Esenciales

```bash
npm run dev        # Desarrollo (Express 3001 + Vite HMR 3002)
npm run build      # Build producción completo
npm run lint       # TypeScript check (tiene que pasar SIEMPRE)
npm run test       # 22 tests (node:test)
npm run ci         # lint + test + build:web
```

## Regla #1 — Proteger

Este proyecto maneja **datos de estudiantes (NNA)**. Las prioridades inmutables son:

1. **Seguridad**: RLS, JWT, CSP, secrets — nunca comprometer
2. **Debido Proceso**: Las 5 fases del proceso disciplinario deben funcionar siempre
3. **Documentos legales**: La generación de cartas tiene implicancias legales
4. **Datos de estudiantes**: Privacidad, anonimización, no exponer

## Regla #2 — No Romper

- No modificar migraciones existentes
- No duplicar componentes/hooks (buscar en shared/ primero)
- No modificar solo un server entry point (actualizar ambos: server/routes/ + server/api/routes/)
- No exponer service_role key al cliente

## Documentación Relacionada

- `docs/CONSTITUTION.md` — Reglas inmutables
- `docs/engineering/HANDBOOK.md` — Engineering standards
- `docs/architecture/` — Guía de arquitectura viva
- `docs/adr/` — Architecture Decision Records
- `.opencode/memory/project.md` — Memoria Staff Engineer
- `AGENTS.md` — Comandos y agentes
