<div align="center">
  <img src="./public/logo.svg" alt="Sistema Integral de Convivencia Escolar" width="120" />
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

El **Sistema Integral de Convivencia Escolar** centraliza el trabajo de equipos de convivencia, inspectoría, dirección y administración escolar. Apoya el debido proceso disciplinario en el contexto de la **Circular 482 (2018)** y la **Ley 21.809 (2026)**. La revisión jurídica y las decisiones institucionales siguen siendo responsabilidad del establecimiento.

Permite registrar anotaciones, clasificar conductas mediante el sistema **RICE** (Leve, Grave, Muy Grave, Gravísima), gestionar expedientes con bitácora y checklist, analizar PDFs disciplinarios, generar cartas y documentos institucionales, y recibir asistencia editorial mediante inteligencia artificial.

Diseñado como **SaaS multi-tenant**, aísla los datos de cada establecimiento educacional mediante **RLS policies** y autenticación JWT con Supabase Auth.

---

## Características principales

- **Gestión de casos disciplinarios** con 39 estados organizados en 5 fases: Recepción, Investigación, Resolución, Apelación y Seguimiento.
- **Anotaciones RICE** con clasificación de severidad, filtros, ficha individual, adjuntos PDF y análisis automatizado.
- **Análisis de PDFs disciplinarios** con extracción de texto, detección de anotaciones, coincidencia con estudiantes y sugerencia de etapa/carta.
- **Bitácora y checklist de debido proceso** para garantizar el cumplimiento legal en cada etapa.
- **Cartas disciplinarias** (amonestación, compromiso y derivación) con editor, impresión, trazabilidad y registro de cartas físicas previas.
- **Asistencia legal y redacción documental con IA** vía OpenRouter y Gemini, usando plantillas y antecedentes del expediente.
- **Multi-tenant** con aislamiento de datos por establecimiento mediante `tenant_id` + RLS.
- **Roles y permisos** (`admin`, `direccion`, `convivencia`, `inspectoria`, `profesor_jefe`, `teacher`, `inspector`, `staff` y `superadmin`).
- **Administración institucional** de miembros, invitaciones, cursos, estudiantes e importación Excel.
- **Configuración institucional** de datos del establecimiento, logotipo, reglamento y documentos.
- **Plataforma multi-colegio** para superadministradores, con selección explícita del establecimiento.
- **Dashboard y centro de reportes** de convivencia escolar.
- **Interfaz responsive, con modo privacidad y navegación accesible**, en español chileno.

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
| IA            | OpenRouter + Gemini         | —              |
| Documentos    | docx / pdfjs-dist           | —              |
| Monitoring    | Sentry + PostHog            | —              |
| Tests         | node:test + Playwright      | —              |

---

## Arquitectura

El proyecto sigue una arquitectura moderna con dos entry points de servidor:

- **`server/index.ts`** — Servidor de desarrollo local con Express + Vite HMR.
- **`server/api/index.ts`** — Entrada serverless de Vercel para producción.

`api/index.js` es un artefacto generado por `npm run build`; las rutas se implementan una sola vez en `server/api/routes/`.

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
git clone https://github.com/Hluengo/sistema-integral-convivencia-escolar.git
cd sistema-integral-convivencia-escolar

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales reales

# 4. Ejecutar en modo desarrollo
npm run dev
```

La aplicación queda disponible en `http://localhost:3001`. Vite utiliza el puerto `3002` para HMR. El servidor expone `GET /api/health` para comprobar disponibilidad.

---

## Variables de entorno

Usa `.env.example` como plantilla. Las variables dependen de las funciones habilitadas:

| Variable                                                         | Descripción                                      |
| ---------------------------------------------------------------- | ------------------------------------------------ |
| `VITE_SUPABASE_URL`                                              | URL del proyecto Supabase                        |
| `VITE_SUPABASE_PUBLISHABLE_KEY`                                  | Publishable key pública de Supabase              |
| `SUPABASE_URL`                                                   | URL usada por operaciones server-side            |
| `SUPABASE_SERVICE_ROLE_KEY`                                      | Operaciones privilegiadas; solo servidor         |
| `SUPABASE_JWT_SECRET`                                            | Compatibilidad con proyectos que usan JWT HS256  |
| `OPENROUTER_API_KEY`                                             | Mejora, adaptación y asistencia de texto         |
| `GEMINI_API_KEY`                                                 | Informes y borradores documentales               |
| `DEFAULT_TENANT_ID`                                              | Tenant por defecto para operaciones configuradas |
| `ALLOWED_ORIGINS`                                                | Orígenes CORS separados por coma                 |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`            | Rate limiting persistente en serverless          |
| `VITE_ALLOW_LOCAL_DEMO`                                          | Demo sin login, solo desarrollo                  |
| `VITE_SENTRY_DSN`                                                | Error tracking                                   |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST`                         | Analytics                                        |
| `VITE_NOTIFICATIONS_REALTIME`                                    | Notificaciones Realtime                          |
| `VITE_APP_MEMBERSHIPS_ENABLED` / `VITE_APP_MEMBERSHIPS_ENFORCED` | Control de membresías                            |
| `E2E_BASE_URL`, `E2E_STAFF_*`, `E2E_SUPERADMIN_*`                | Configuración de Playwright                      |

> 🔒 **Nunca commitear** `.env.local` ni `.env.production`. Ver `docs/CONSTITUTION.md`.

Las claves `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `OPENROUTER_API_KEY` y `GEMINI_API_KEY` no deben llegar al bundle del navegador.

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
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_JWT_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY`
- `GEMINI_API_KEY`

### Supabase Migrations

Las migraciones activas se encuentran en `supabase/migrations/`. No modifiques migraciones ya aplicadas: crea una nueva migración incremental.

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

Consulta [`docs/architecture/security.md`](docs/architecture/security.md), las reglas inmutables en [`docs/CONSTITUTION.md`](docs/CONSTITUTION.md) y la revisión de seguridad en [`docs/reviews/security-review.md`](docs/reviews/security-review.md). La seguridad técnica no reemplaza las obligaciones institucionales de resguardo, revisión jurídica y gestión de accesos.

---

## Roadmap

El roadmap vivo está en [`docs/architecture/future-roadmap.md`](docs/architecture/future-roadmap.md). Entre los pendientes se encuentran React Router/deep linking, mayor cobertura de tests, exportación avanzada de reportes, modo offline y futuros módulos PIE, UTP y portal de apoderados.

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
