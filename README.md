# Sistema Integral de Convivencia Escolar

Gestor de hojas de vida, semáforo disciplinario (RICE Art. 24.BIS), extracción con IA (Gemini) y emisión de documentos oficiales.

**Colegio Carmela Romero de Espinosa** (Madres Dominicas — Concepción).

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Auth / DB | Supabase (Auth + PostgreSQL + RLS) |
| API IA | Express (local) / Vercel Serverless (prod) + Gemini |
| Deploy | Vercel + Supabase |

## Requisitos

- Node.js 22+
- Cuenta Supabase (proyecto configurado)
- `GEMINI_API_KEY` para parseo de PDF

## Setup local

```bash
npm install
cp .env.example .env.local
# Editar .env.local con URL/anon key de Supabase y GEMINI_API_KEY
```

Variables importantes:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
GEMINI_API_KEY=...
# Solo desarrollo sin login:
VITE_ALLOW_LOCAL_DEMO=true
```

```bash
npm run dev          # http://localhost:3000 (Express + Vite HMR)
npm run lint         # TypeScript check
npm run test         # Tests unitarios (domain/mappers)
npm run build:web    # Build frontend (Vercel)
```

## Supabase

Migraciones en `supabase/migrations/`. Aplicar:

```bash
supabase link --project-ref YOUR_REF
supabase db push
```

Tras el primer usuario Auth, asignar rol:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'su@correo.cl';
```

Roles: `admin` | `direccion` | `convivencia` | `inspectoria` | `profesor_jefe`

Ver checklist: [`docs/RLS_TEST.md`](docs/RLS_TEST.md)

## Vercel

```bash
vercel link
vercel env add GEMINI_API_KEY
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel --prod
```

`vercel.json` construye el frontend Vite y enruta `/api/*` a serverless functions.

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor desarrollo |
| `npm run build` | Build web + server Node |
| `npm run build:web` | Solo frontend (Vercel) |
| `npm run start` | Producción Node (`dist/server.cjs`) |
| `npm run lint` | `tsc --noEmit` |
| `npm run test` | Tests unitarios |
| `npm run ci` | lint + test + build:web |

## Estructura

```
src/
  domain/          # Semáforo RICE, medidas
  lib/             # supabase, mappers, docs builders
  contexts/        # Auth
  components/      # UI + auth + ai review
  App.tsx          # Shell + rutas
api/               # Vercel serverless
supabase/migrations/
docs/
```

## Licencia

Apache-2.0
