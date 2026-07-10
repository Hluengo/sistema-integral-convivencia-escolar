# AGENTS.md — Debido Proceso

## Commands

- `npm run build` — Vite client build + esbuild server bundle (`dist/`)
- `npm run dev` — Express server (port 3001) with Vite HMR (port 3002)
- `npm run lint` — **TypeScript only** (`tsc --noEmit`). No ESLint/Prettier configured.
- `npm run test` — Unit tests via `tsx --test "src/**/*.test.ts"` (Node built-in runner)
- `npm run test:e2e` — Playwright E2E (requires `E2E_BASE_URL` env; auto-skips if unset)
- `npm run doctor` — React Doctor static analysis (see `doctor.config.json`)

Always run `npm run lint` before committing. Type-check is the only lint step.

## Architecture

**Dual server entry points:**
- `server.ts` — Dev server (Express + Vite middleware, used by `npm run dev`)
- `api/index.js` — Vercel serverless function (same API routes, uses raw `https` module instead of `fetch`)

When modifying API routes, update **both** files. `api/index.js` must use `import`/`export default` (ESM, `"type": "module"` in package.json) and `https` for HTTP calls (not `fetch`).

**Client entry:** `index.html` → `src/main.tsx` → `App.tsx`

**AI provider:** Groq API (`llama-3.3-70b-versatile`). Env var: `GROQ_API_KEY`.

**Auth:** Supabase Auth with email/password. Dashboard is public (read-only); CRUD operations require login. Auth listener in `App.tsx` manages user state.

## Environment Variables

All in `.env.local`:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key
- `GROQ_API_KEY` — Groq API key (server-side only)

## Database

Supabase tables (`causas`, `bitacora_entries`, `checklist_items`) must exist. Schema in `supabase_migration.sql`. Also requires storage bucket `documentos_convivencia`.

Seed: `scripts/seed.ts`

## Conventions

- **No ESLint/Prettier.** Style enforced by TypeScript + React Doctor.
- **TypeScript:** `noEmit: true`, `isolatedModules: true`, `allowImportingTsExtensions: true` (imports use `.tsx` extensions)
- **Path alias:** `@/` maps to project root (configured in both `tsconfig.json` and `vite.config.ts`)
- **Tailwind CSS v4:** Theme tokens via `@theme` in `src/index.css`. No separate `tailwind.config.*`.
- **Lazy loading:** Major components lazy-loaded at top of `App.tsx`.
- **DB columns:** snake_case in Supabase, camelCase in TypeScript. Mapping in `lib/supabase.ts` (`mapCausaFromDB`/`mapCausaToDB`).
- **All UI text is in Spanish** (Chilean).
- **License headers:** `/** @license SPDX-License-Identifier: Apache-2.0 */` on source files.

## Testing

Coverage is minimal (2 unit test files, 1 E2E file). Unit tests use Node's built-in `node:test` + `node:assert/strict`. No test framework config. No coverage tool.

## React Doctor

Config in `doctor.config.json`. Key rules: exhaustive-deps enforced, artifact-baas-authority-surface disabled. Run `npx react-doctor@latest . --verbose` for full diagnostics.

## Deployment

Vercel via `vercel.json`: `/(.*)` rewrites to `/api`, static served from `dist/`. The `api/index.js` serverless function handles API routes and falls back to SPA.
