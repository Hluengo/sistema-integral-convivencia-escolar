# Guía de Desarrollo

## Setup

```bash
# Clonar e instalar
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales reales de Supabase, OpenRouter y Gemini
```

## Comandos

| Comando             | Descripción                                         |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Servidor Express + Vite HMR (puerto 3001)           |
| `npm run build`     | Build cliente (Vite) + servidor (esbuild) → `dist/` |
| `npm run typecheck` | TypeScript strict type check                        |
| `npm run test`      | Suite unitaria con `node:test`                      |
| `npm run test:e2e`  | E2E Playwright                                      |

## Variables de Entorno

| Variable                                 | Propósito                                              |
| ---------------------------------------- | ------------------------------------------------------ |
| `VITE_SUPABASE_URL`                      | URL del proyecto Supabase                              |
| `VITE_SUPABASE_ANON_KEY`                 | Anon key pública de Supabase                           |
| `SUPABASE_JWT_SECRET`                    | Para verificar JWT en API routes                       |
| `SUPABASE_SERVICE_ROLE_KEY`              | Admin key para operaciones servidor                    |
| `OPENROUTER_API_KEY`                     | Mejora de textos y asistencia breve                    |
| `TEXT_IMPROVEMENT_AI_MODEL`              | Modelo OpenRouter para mejorar textos (opcional)       |
| `TEXT_AI_MODEL`                          | Modelo OpenRouter general o fallback global (opcional) |
| `GEMINI_API_KEY`                         | Informes y documentos                                  |
| `LEGAL_DRAFT_MODEL`                      | Modelo Gemini para borradores legales (opcional)       |
| `LEGAL_DRAFT_OPENROUTER_MODEL`           | Modelo OpenRouter de respaldo para borradores legales  |
| `VITE_ALLOW_LOCAL_DEMO`                  | Demo sin login (solo desarrollo)                       |
| `VITE_SENTRY_DSN`                        | Error tracking                                         |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` | Analytics                                              |

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
