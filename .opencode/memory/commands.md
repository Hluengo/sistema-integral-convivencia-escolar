# Comandos Útiles

## Desarrollo
```bash
npm run dev              # Express (3001) + Vite HMR (3002)
npm run build            # Build producción (vite + esbuild server)
npm run build:web        # Solo build frontend (vite)
npm run lint             # TypeScript check (tsc --noEmit)
npm run typecheck        # TypeScript check (alias)
npm run test             # Unit tests (node:test via tsx)
npm run test:vitest      # Unit tests (vitest)
npm run test:coverage    # Vitest con cobertura
npm run test:e2e         # Playwright E2E
npm run test:e2e:ui      # Playwright UI mode
npm run doctor           # React Doctor
```

## Calidad
```bash
npm run lint:types       # TypeScript check (alias)
npm run lint:code        # ESLint check
npm run lint:code:fix    # ESLint auto-fix
npm run format           # Prettier format
npm run format:check     # Prettier check
npm run lint-staged      # Lint staged files
npm run depcheck         # Check unused deps
npm run knip             # Dead file analysis
npm run security-audit   # npm audit (prod only)
npm run check            # Full check (lint + code + test + build)
```

## Git
```bash
git status
git diff
git log --oneline -10
git commit -m "tipo: descripción"
```

## Supabase (si CLI disponible)
```bash
supabase status          # Estado de la conexión
supabase db diff         # Diff de migraciones
supabase migration new nombre  # Nueva migración
supabase db push         # Aplicar migraciones
supabase db seed         # Seed data
```

## Vercel
```bash
vercel env ls            # Listar variables de entorno
vercel --prod            # Deploy producción
vercel inspect           # Información de deploy
```

## Database (directo)
```bash
# RLS test helper
supabase db test
# Ejecutar seed desde proyecto linkeado
psql "$SUPABASE_CONNECTION_STRING" -f supabase/seed.sql
```
