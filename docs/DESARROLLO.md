# Guía de Desarrollo

## Setup

```bash
# Clonar e instalar
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales reales de Supabase y Groq
```

## Comandos

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor Express + Vite HMR (puerto 3001) |
| `npm run build` | Build cliente (Vite) + servidor (esbuild) → `dist/` |
| `npm run typecheck` | TypeScript strict type check |
| `npm run test` | Tests unitarios (57 tests, node:test) |
| `npm run test:e2e` | E2E Playwright |
| `npm run doctor` | React Doctor static analysis |

## Variables de Entorno

| Variable | Propósito |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key pública de Supabase |
| `SUPABASE_JWT_SECRET` | Para verificar JWT en API routes |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key para operaciones servidor |
| `GROQ_API_KEY` | API key de Groq (IA) |
| `VITE_ALLOW_LOCAL_DEMO` | Demo sin login (solo desarrollo) |
| `VITE_SENTRY_DSN` | Error tracking |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` | Analytics |

## Arquitectura General

El proyecto tiene **dos entry points** para el servidor:

- `server.ts` — Desarrollo local (Express + Vite middleware)
- `api/index.js` — Vercel Serverless (producción)

Ambos deben mantenerse sincronizados al agregar/modificar rutas API.

## Cliente (`src/`)

Estructura FSD (Feature-Sliced Design):

- `app/` — Inicialización: App.tsx, Router, Providers
- `features/` — Features completas (causas, onboarding)
- `widgets/` — Widgets reutilizables
- `shared/` — Código compartido: stores, hooks, servicios, schemas Zod, tipos
- `components/` — Componentes legacy con barrels de retrocompatibilidad

## Convenciones

- TypeScript estricto, path alias `@/` para `src/`
- Tailwind CSS v4 con `@theme` en `src/index.css`
- Nombres DB: `snake_case` → camelCase en TypeScript
- UI en español chileno
- License header: `/** @license SPDX-License-Identifier: Apache-2.0 */`
- Stores Zustand, schemas Zod, servicios Supabase tipados
