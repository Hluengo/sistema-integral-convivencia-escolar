# AGENTS.md — Debido Proceso

## Lectura al iniciar tarea

Leer en este orden: `docs/CONSTITUTION.md` → `.ai/brain.md` → `.ai/rules.md` → `.ai/anti-patterns.md` → `.opencode/memory/project.md` → `docs/architecture/` (según módulo) → `docs/reviews/security-review.md` o `performance-review.md` si aplica.

## Comandos del proyecto

- `npm run dev` — Express (puerto 3001) + Vite HMR (puerto 3002). Entry: `server/index.ts`
- `npm run build` — Vite build + esbuild server bundle. `esbuild server/api/index.ts` → `api/index.js` para Vercel
- `npm run test` — `node --import tsx --test "src/**/*.test.ts" "server/**/*.test.ts"`
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — `npm run lint:code && npm run typecheck`
- `npm run lint:code` — ESLint con `eslint .`
- `npm run security-audit` — `npm audit --omit=dev`
- `npm run ci` — lint + test + build:web + security-audit (full quality gate)
- `git push` ejecuta pre-push hook → `npm run pre-push` (lint + test + build:web + security-audit)
- `git commit` ejecuta lint-staged (eslint --fix + prettier --write en staged)
- `npm run build:web` — Solo Vite build (sin server)

## Arquitectura

- **Dual entry point:** Dev = `server/index.ts` (Express + Vite). Producción (Vercel) = `api/index.js` (serverless, usa `https`, no `fetch`). Cada ruta API en `server/api/routes/` se registra en ambos entry points.
- **Client:** `index.html` → `src/app/main.tsx` → `src/app/App.tsx`
- **FSD (Feature-Sliced Design):** `app/`, `features/`, `widgets/`, `shared/`. Hay duplicación legacy en `src/components/` con barrels retrocompatibles — muchos componentes existen en ambos lugares. Las implementaciones nuevas deben ir en `src/features/`.
- **Multi-tenant:** Tabla `tenants`, columna `tenant_id` en tablas clave. RLS por tenant + rol. JWT claim `app_metadata.tenant_id`. Trigger `sync_tenant_to_jwt()` en `profiles`
- **AI:** OpenRouter (`meta-llama/llama-3.1-8b-instruct`). Env: `OPENROUTER_API_KEY`
- **Estado global:** Zustand stores en `src/shared/lib/stores/` (authStore, causasStore, toastStore, uiStore)
- **Server state:** TanStack React Query (v5)
- **Auth:** Supabase Auth (email/password). Dashboard público read-only; CRUD requiere login. Rol desde `profiles.role`
- **DB:** Supabase PostgreSQL. Migraciones en `supabase/migrations/` — **nunca modificar migraciones existentes**, crear nuevas
- **UI primitives:** Radix UI (Dialog, AlertDialog). Tailwind v4 con `@theme` en `src/index.css`

## Convenciones que rompen defaults

- Fechas civiles **siempre** en `America/Santiago` vía `formatChileDate()` / `formatChileDateTime()` en `src/shared/lib/dateTime.ts`. Prohibido `new Date().toISOString().split('T')[0]` para fechas chilenas
- DB snake_case ↔ TypeScript camelCase (mapear explícitamente en servicios)
- Path alias `@/` → raíz del proyecto (configurado en `tsconfig.json` y `vite.config.ts`)
- License headers en todo archivo: `/** @license SPDX-License-Identifier: Apache-2.0 */`
- UI en español chileno
- Zod v4 para schemas (en `src/shared/lib/schemas/`)
- `consistent-type-imports` forzado por ESLint
- ESLint con `jsx-a11y` estricto: click-events-have-key-events, no-static-element-interactions, etc.

## Reglas de ejecución

1. No consultar Supabase desde componentes visuales — usar servicios en `src/services/` o `src/shared/api/services/`
2. No modificar migraciones antiguas — crear nuevas en `supabase/migrations/`
3. No ejecutar UPDATE, DELETE, ALTER, DROP, cambios RLS ni migraciones en Supabase sin confirmación explícita
4. No subir secretos, `.env*`, tokens ni datos personales de estudiantes a Git
5. No refactorizar módulos fuera del alcance sin justificarlo
6. Preferir cambios pequeños y verificables
7. Ejecutar quality gate (`npm run ci` o al menos `lint && test && build:web`) antes de declarar trabajo terminado
8. Antes de publicar, revisar `git diff` para confirmar que no hay datos de estudiantes
9. Después de publicar, verificar Vercel READY y URL productiva funcional
10. Informar resultados comprobados, no supuestos

## Modelo de datos clave

- **`Causa`** (`src/shared/lib/types.ts`): 24 estados en `EstadoCausa` agrupados en 5 fases (`FaseProcedimental`: Recepción, Investigación, Resolución, Apelación, Seguimiento). IDs tipo `DC-2026-014`. Incluye campos de Aula Segura, protección de víctimas, NEE
- **`ChecklistItem`**: Tiene `id`, `causa_id`, `label`, `completado`, `fechaCompletado`, `requeridoPor`, `registradoPor`, `observaciones`, `documentoNombre`, `documentoUrl`. Upsert con conflicto en `checklistConflict.CHECKLIST_CONFLICT_TARGET`
- **`BitacoraEntry`**: `id`, `causa_id`, `fecha`, `tipo`, `titulo`, `descripcion`, `participantes`, `documentoAdjunto`
- **Servicios** (`src/shared/api/services/`): `causas.service.ts`, `checklist.service.ts`, `bitacora.service.ts` — todos usan upsert+cleanup (no delete-all + re-insert)

## Pruebas

- Framework: `node:test` (nativo de Node 22) + `tsx` para transpilación
- Tests co-localizados: `src/**/*.test.ts` y `server/**/*.test.ts`
- Sin Vitest/Jest — usar `node:test` con `describe`, `it`, `mock`, `assert`
- Sin mocks de Supabase en tests de componentes — prefieren test unitarios de funciones puras
- `src/shared/__tests__/mockSupabase.ts` disponible para helper de mock
- Tests E2E: Playwright en `e2e/`, requieren `E2E_BASE_URL`

## Estructura de archivos FSD (nuevas implementaciones)

- `src/features/<nombre>/` — Componentes y lógica de feature
- `src/shared/lib/` — Lógica compartida (hooks, stores, domain, utils)
- `src/shared/api/services/` — Servicios Supabase
- `src/shared/lib/domain/` — Lógica de dominio pura (checklistReconciliation, disciplinaryStatus, disciplinaryStage)
- `src/shared/ui/` — Componentes UI reutilizables (AlertDialog, Dialog, Button)

## Vercel

- Build: `npm run build` (Vite + esbuild)
- Output: `dist/` (cliente), `api/index.js` (serverless)
- Framework: vite, Node 24.x
- CSP estricto en `index.html` — cualquier nuevo external origin requiere actualización del CSP

## Carga de contexto progresivo

Base → dominio (`docs/CONSTITUTION.md`, `.ai/`) → módulo (`docs/architecture/`) → implementación (`src/`, `server/`).
