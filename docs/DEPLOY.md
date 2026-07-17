# Deploy

## Vercel

El proyecto está configurado para deploy en Vercel con `vercel.json`.

```bash
# Login
npx vercel login

# Preview
npx vercel

# Producción
npx vercel --prod
```

### Variables de Entorno en Vercel

Agregar en Vercel Dashboard > Project Settings > Environment Variables:

| Variable | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key pública |
| `SUPABASE_JWT_SECRET` | JWT secret de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `GROQ_API_KEY` | Groq API key |
| `VITE_SENTRY_DSN` | (opcional) Error tracking |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` | (opcional) Analytics |

### Pre-deploy Checklist

1. `npm run build`
2. `npm run typecheck` — 0 errores
3. `npm run test` — 57 tests, 0 fallos
4. Verificar que migraciones SQL están aplicadas en producción
5. Verificar RLS policies activas

## Supabase Migrations

Las migraciones están en `supabase/migrations/`:

- `20260717001_add_tenant_rls.sql` — Multi-tenant: tabla `tenants`, columnas `tenant_id`, RLS
- `20260717002_jwt_tenant_claim.sql` — Sincronización JWT tenant_id
- `20260717003_performance_indexes.sql` — Índices compuestos

Aplicar migraciones vía Management API:

```bash
curl -X POST https://api.supabase.com/v1/projects/{ref}/sql \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$(cat migracion.sql | tr '\n' ' ')\"}"
```

O usando Supabase CLI:

```bash
supabase db push
```
