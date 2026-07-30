# Project knowledge

This file gives Freebuff context about your project: goals, commands, conventions, and gotchas.

## Quickstart

- Setup: `npm install && cp .env.example .env.local` then edit `.env.local` with real Supabase + OpenRouter credentials.
- Dev: `npm run dev` — Express on :3001, Vite HMR on :3002. App at http://localhost:3000.
- Test: `npm run test` (22+ unit tests, node:test). `npm run test:e2e` for Playwright E2E.
- Lint: `npm run lint` (TypeScript `tsc --noEmit` + ESLint). **Must pass before commit.**
- Build: `npm run build` — Vite client + esbuild server bundle to `dist/`. `npm run build:web` for client only.
- CI: `npm run ci` — lint + test + build:web + security-audit.

## Architecture

SaaS multi-tenant app for Chilean school discipline management (convivencia escolar). Automates the "debido proceso" disciplinary workflow aligned with Circular 482 (2018) and Ley 21.809 (2026).

**Stack:** React 19 · TypeScript 5.8 · Vite 6 · Tailwind 4 · Zustand 5 · React Query 5 · Express 4 · Supabase PostgreSQL 17 · Vercel Serverless · OpenRouter AI (llama-3.1-8b-instruct).

### Key directories

- `src/` — Client app (FSD structure: `app/`, `features/`, `widgets/`, `shared/`, `components/`)
- `server/` — Dev server (Express + tsx). Entry: `server/index.ts`
- `server/api/` — Serverless API. Entry: `server/api/index.ts` → builds to `api/index.js`
- `server/api/routes/` — **Canonical** API route implementations (single source of truth)
- `supabase/migrations/` — SQL migrations (timestamp-prefixed)
- `docs/` — Architecture docs, ADRs, legal references, deploy guides
- `.ai/` — AI context: brain.md, rules.md, anti-patterns.md, roadmap.md

### Data flow

1. Client (`src/`) → Supabase (auth, database, storage) via `@supabase/supabase-js`
2. Client → Server API (`server/api/routes/`) for AI features, document generation
3. Server → Supabase (service role for privileged ops), OpenRouter (AI)
4. Vercel deploys `api/index.js` as serverless functions; `dist/` as static client

### Dual server entry points

- `server/index.ts` — Dev (Express + Vite middleware)
- `server/api/index.ts` → `api/index.js` — Production (Vercel serverless, uses `https` module not `fetch`)

**Rule:** Implement each route ONCE in `server/api/routes/`, then register in BOTH entry points.

## Conventions

### Formatting/linting

- TypeScript strict (`noEmit: true`, `isolatedModules: true`). Path alias `@/` → project root.
- ESLint 9 flat config + Prettier. Run `npm run lint` before every commit.
- `import type` for type-only imports. Explicit interface for component props.

### Patterns to follow

- **State:** Zustand stores (separate by domain: `authStore`, `causasStore`, `uiStore`). React Query for server state (no useEffect for fetching).
- **Forms:** react-hook-form + Zod schemas for validation.
- **DB ↔ TS:** `snake_case` in PostgreSQL → `camelCase` in TypeScript (use mappers).
- **UI:** Spanish (Chile). Tailwind v4 with `@theme` in `src/index.css`. Radix UI primitives. Lucide icons.
- **Services:** Create in `src/services/` or `src/shared/api/services/` for new features.
- **Hooks:** Create in `src/shared/lib/hooks/` for reusable logic.
- **Tests:** Co-located `*.test.ts` files using `node:test` + `node:assert/strict`.
- **DB tables:** UUID PKs, `tenant_id NOT NULL` with FK, RLS policies per operation.
- **Migrations:** New file `YYYYMMDDHHMMSS_description.sql` in `supabase/migrations/`. Never modify existing migrations.
- **Docs:** ADRs in `docs/adr/` for architectural decisions. License header: `/** @license SPDX-License-Identifier: Apache-2.0 */`

### Things to avoid

- **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
- **NEVER** modify existing SQL migrations.
- **NEVER** duplicate components/hooks — search `shared/` first.
- **NEVER** use `fetch` in Vercel serverless — use the `https` module.
- **NEVER** skip `npm run lint` before commit.
- **NEVER** prop drill more than 2 levels — use Zustand or context.
- **NEVER** run AI prompts through without `sanitizeForAI()`.

### Security (critical — handles NNA/minor data)

- RLS policies on all tables (multi-tenant by `tenant_id`).
- JWT verification on all sensitive API routes.
- Rate limit: 10 req/min/IP on AI endpoints.
- Anonymize personal data before sending to AI APIs.
- Input sanitization to prevent XSS and prompt injection.
- CSP headers restrictively configured.
