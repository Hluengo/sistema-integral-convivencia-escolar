<div align="center">
  <img src="./logo.svg" alt="Sistema Integral de Convivencia Escolar" width="120" />
  <h1>Sistema Integral de Convivencia Escolar</h1>
  <p><strong>Plataforma SaaS multi-tenant para la gestión integral del debido proceso disciplinario en establecimientos educacionales chilenos.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5.8" />
    <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" alt="Vite 6" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
    <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white" alt="Express 4" />
    <img src="https://img.shields.io/badge/License-Apache%202.0-green.svg" alt="Apache 2.0" />
  </p>
</div>

---

## Tabla de contenidos

- [Descripción](#descripción)
- [Características principales](#características-principales)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Requisitos previos](#requisitos-previos)
- [Instalación local](#instalación-local)
- [Variables de entorno](#variables-de-entorno)
- [Comandos disponibles](#comandos-disponibles)
- [Testing](#testing)
- [Deploy](#deploy)
- [Seguridad y cumplimiento](#seguridad-y-cumplimiento)
- [Roadmap](#roadmap)
- [Contribución](#contribución)
- [Licencia](#licencia)

---

## Descripción

El **Sistema Integral de Convivencia Escolar** automatiza el flujo completo del debido proceso disciplinario, alineado a la **Circular 482 (2018)** y la **Ley 21.809 (2026)**. Permite registrar anotaciones, clasificar conductas mediante el sistema **RICE** (Leve, Grave, Muy Grave, Gravísima), gestionar causas disciplinarias con bitácora y checklist, generar cartas disciplinarias en Word, y recibir asesoría legal asistida por inteligencia artificial.

Diseñado como **SaaS multi-tenant**, aísla los datos de cada establecimiento educacional mediante **RLS policies** y autenticación JWT con Supabase Auth.

---

## Características principales

- **Gestión de casos disciplinarios** con 39 estados organizados en 5 fases: Recepción, Investigación, Resolución, Apelación y Seguimiento.
- **Anotaciones RICE** con clasificación de severidad, adjuntos PDF y análisis automatizado.
- **Bitácora y checklist de debido proceso** para garantizar el cumplimiento legal en cada etapa.
- **Generación de documentos disciplinarios** (amonestación escrita, carta de compromiso, derivación) en formato Word.
- **Asistencia legal con IA** vía OpenRouter (`llama-3.1-8b-instruct`) para redacción, mejora de textos y revisión de procesos.
- **Multi-tenant** con aislamiento de datos por establecimiento mediante `tenant_id` + RLS.
- **Roles y permisos** (`admin`, `direccion`, `convivencia`, `inspectoria`, `profesor_jefe`, `teacher`, etc.).
- **Dashboard analítico** y reportes de convivencia escolar.
- **Interfaz responsive y accesible** (WCAG 2.1 AA), en español chileno.

---

## Stack tecnológico

| Capa          | Tecnología                  | Versión        |
| ------------- | --------------------------- | -------------- |
| Frontend      | React + TypeScript          | 19.0.1 / 5.8.2 |
| Build         | Vite                        | 6.4.3          |
| CSS           | Tailwind CSS v4             | 4.1.14         |
| Estado global | Zustand                     | 5.0.14         |
| Server state  | TanStack React Query        | 5.101.2        |
| Formularios   | react-hook-form + Zod       | 7.82.0 / 4.4.3 |
| Backend dev   | Express + tsx               | 4.21.2         |
| Backend prod  | Vercel Serverless (esbuild) | —              |
| Base de datos | Supabase PostgreSQL         | 17.6.1         |
| Autenticación | Supabase Auth               | —              |
| IA            | OpenRouter (Llama 3.1)      | —              |
| Documentos    | docx / pdfjs-dist           | —              |
| Monitoring    | Sentry + PostHog            | —              |
| Tests         | node:test + Playwright      | —              |

---

## Arquitectura

El proyecto sigue una arquitectura moderna con dos entry points de servidor:

- **`server/index.ts`** — Servidor de desarrollo local con Express + Vite HMR.
- **`api/index.js`** — Función serverless de Vercel para producción.

> ⚠️ Al modificar rutas API, actualizar **ambos entry points**.

El cliente está organizado bajo **Feature-Sliced Design (FSD)**:

- `app/` — Inicialización, routing y providers.
- `features/` — Funcionalidades completas (causas, anotaciones, documentos).
- `widgets/` — Widgets reutilizables.
- `shared/` — Stores, hooks, servicios, schemas Zod y tipos.
- `components/` — Componentes legacy con barrels de retrocompatibilidad.

Para más detalles, revisa:

- `docs/architecture/project-overview.md`
- `docs/CONSTITUTION.md`
- `docs/engineering/HANDBOOK.md`

---

## Requisitos previos

- **Node.js 22** (ver `.nvmrc`)
- Cuenta en **Supabase**
- API key de **OpenRouter** y **Gemini**
- (Opcional) Cuenta en **Vercel** para deploy

---

## Instalación local

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-org/sistema-integral-convivencia-escolar.git
cd sistema-integral-convivencia-escolar

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales reales

# 4. Ejecutar en modo desarrollo
npm run dev
```

La aplicación estará disponible en:

- App: `http://localhost:3000`
- Servidor Express: `http://localhost:3001`

---

## Variables de entorno

Las siguientes variables son **obligatorias** para el funcionamiento local:

| Variable                    | Descripción                                             |
| --------------------------- | ------------------------------------------------------- |
| `VITE_SUPABASE_URL`         | URL del proyecto Supabase                               |
| `VITE_SUPABASE_ANON_KEY`    | Anon key pública de Supabase                            |
| `SUPABASE_JWT_SECRET`       | JWT secret para verificación de tokens en API routes    |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key para operaciones privilegiadas desde servidor |
| `OPENROUTER_API_KEY`        | API key de OpenRouter (IA)                              |
| `GEMINI_API_KEY`            | API key de Gemini para informes y documentos            |

Variables opcionales:

| Variable                                              | Descripción                             |
| ----------------------------------------------------- | --------------------------------------- |
| `VITE_ALLOW_LOCAL_DEMO`                               | Demo sin login (solo desarrollo)        |
| `VITE_SENTRY_DSN`                                     | Error tracking                          |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST`              | Analytics                               |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limiting persistente en serverless |

> 🔒 **Nunca commitear** `.env.local` ni `.env.production`. Ver `docs/CONSTITUTION.md`.

---

## Comandos disponibles

| Comando                  | Descripción                                            |
| ------------------------ | ------------------------------------------------------ |
| `npm run dev`            | Servidor Express + Vite HMR (puertos 3001 / 3002)      |
| `npm run build`          | Build completo: cliente Vite + servidor esbuild        |
| `npm run build:web`      | Build solo del cliente                                 |
| `npm run start`          | Iniciar servidor de producción desde `dist/server.cjs` |
| `npm run lint`           | TypeScript check + ESLint                              |
| `npm run typecheck`      | Verificación estricta de tipos (`tsc --noEmit`)        |
| `npm run test`           | Tests unitarios con el runner nativo de Node           |
| `npm run test:coverage`  | Tests unitarios con cobertura nativa de Node           |
| `npm run test:e2e`       | Tests end-to-end con Playwright                        |
| `npm run format`         | Formatear código con Prettier                          |
| `npm run security-audit` | Auditoría de dependencias (`npm audit`)                |
| `npm run ci`             | Lint + test + build:web + security audit               |

---

## Testing

El proyecto incluye tests unitarios con **node:test** y tests E2E con **Playwright**.

```bash
# Tests unitarios
npm run test

# Tests con Vitest
npm run test

# Tests E2E
npm run test:e2e

# Cobertura
npm run test:coverage
```

> Antes de commitear, ejecutar siempre: `npm run lint && npm run test && npm run build:web`.

---

## Deploy

### Vercel

```bash
npx vercel login
npx vercel        # Preview
npx vercel --prod # Producción
```

Configurar en el dashboard de Vercel las variables de entorno requeridas:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_JWT_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY`
- `GEMINI_API_KEY`

### Supabase Migrations

Las migraciones se encuentran en `supabase/migrations/`:

- `20260717001_add_tenant_rls.sql`
- `20260717002_jwt_tenant_claim.sql`
- `20260717003_performance_indexes.sql`

Aplicar con Supabase CLI:

```bash
supabase db push
```

Más detalles en `docs/DEPLOY.md`.

---

## Seguridad y cumplimiento

Este proyecto maneja **datos de estudiantes (NNA)**, por lo que la seguridad es prioridad absoluta:

- **RLS policies** multi-tenant por rol y establecimiento.
- **JWT verification** en todas las rutas API sensibles.
- **Anonimización de datos personales** antes de enviar a APIs de IA.
- **Sanitización de inputs** de usuario para prevenir XSS e inyección de prompts.
- **Service role key nunca expuesta al cliente**.
- **UUIDs obligatorios** para estudiantes y causas.
- Cumplimiento normativo con **Circular 482** y **Ley 21.809**.

Consulta las reglas inmutables en `docs/CONSTITUTION.md` y la revisión de seguridad en `docs/reviews/security-review.md`.

---

## Roadmap

### Corto plazo (1-3 meses)

- Unificación de test runners (Vitest)
- CI/CD con GitHub Actions
- React Router para deep linking
- Refactor de componentes legacy

### Mediano plazo (3-6 meses)

- Unificación de server entry points
- Edge Functions de Supabase
- Dashboard analítico avanzado
- Notificaciones en tiempo real

### Largo plazo (6-12 meses)

- Módulo PIE
- Módulo UTP
- Portal de apoderados
- Aplicación móvil

Más información en `docs/architecture/14-roadmap.md`.

---

## Contribución

1. Lee `docs/CONSTITUTION.md` y `docs/engineering/HANDBOOK.md`.
2. Crea una rama desde `main`.
3. Escribe código siguiendo las convenciones del proyecto (TypeScript estricto, UI en español chileno, tests co-located).
4. Ejecuta `npm run lint && npm run test && npm run build:web` antes de enviar tu PR.
5. Describe tu cambio en español con un mensaje de commit claro.

---

## Licencia

```text
SPDX-License-Identifier: Apache-2.0
```

Este proyecto está licenciado bajo la **Apache License 2.0**.

---

<div align="center">
  <p><em>Construido para proteger el debido proceso y mejorar la convivencia escolar en Chile.</em></p>
</div>
