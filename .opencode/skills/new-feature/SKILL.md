---
name: new-feature
description: Use when adding a new feature to the Debido Proceso app. Trigger keywords: feature, nueva feature, agregar, componente, pagina, funcionalidad.
---

# New Feature Skill

Workflow for adding features to Debido Proceso.

## Step 1: Plan

- Define the feature scope and requirements
- Identify affected tables/API routes
- Consider auth requirements (public vs logged-in)

## Step 2: Database (if needed)

- Add columns or tables via migration
- Update `supabase_migration.sql`
- Add RLS policies

## Step 3: Backend

- Add/update API routes in `server.ts` (dev) AND `api/index.js` (prod)
- Both files must stay in sync
- Use raw `https` module in `api/index.js`, never `fetch`

## Step 4: Frontend

- Create component in `src/components/`
- Add to `App.tsx` with lazy loading (`React.lazy`)
- All UI text in Spanish (Chilean)
- Use Tailwind CSS v4 utility classes
- Follow existing component patterns

## Step 5: Type safety

- Define types in `src/types/` if needed
- Update `lib/supabase.ts` mapping functions
- Ensure `npm run lint` passes

## Step 6: Test

- Add unit test in `src/**/*.test.ts`
- Run `npm run test`
- If E2E needed, add in `e2e/` and run `npm run test:e2e`

## Step 7: Verify

- `npm run lint` passes
- `npm run build` succeeds
- Feature works in dev (`npm run dev`)
