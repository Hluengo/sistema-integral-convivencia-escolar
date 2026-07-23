# Constitución del Proyecto — Sistema Integral de Convivencia Escolar

> **Propósito:** Reglas inmutables que todo desarrollador (humano o IA) debe respetar.
> **Violar estas reglas = introducir bugs, deuda técnica o riesgos de seguridad.**

---

## NUNCA HACER

### 🔴 Datos y Seguridad

| # | Regla | Por qué |
|---|-------|---------|
| 1 | **NUNCA usar `any` en TypeScript** | Rompe type safety. Usar `unknown` + narrowing o tipos explícitos. |
| 2 | **NUNCA exponer `SUPABASE_SERVICE_ROLE_KEY` al cliente** | Es la llave maestra que bypassa RLS. Solo server-side. |
| 3 | **NUNCA hacer `SELECT *` en queries** | Siempre columnas explícitas. `SELECT *` trae datos innecesarios y rompe con cambios de schema. |
| 4 | **NUNCA commitear `.env` files** | `.env.local`, `.env.production` contienen secrets. Usar `.env.example` como template. |
| 5 | **NUNCA desactivar RLS en tablas con datos de estudiantes/NNA** | Datos sensibles protegidos por ley. RLS es la última línea de defensa. |
| 6 | **NUNCA enviar RUTs, nombres completos o datos personales a APIs de AI** | Violación de privacidad de NNA. Anonimizar antes de enviar. |
| 7 | **NUNCA confiar en input de usuario sin sanitizar** | XSS, prompt injection, SQL injection. Usar `sanitizeForAI()` para inputs a LLM. |

### 🔴 Base de Datos

| # | Regla | Por qué |
|---|-------|---------|
| 8 | **NUNCA modificar migraciones existentes** | Las migraciones son inmutables. Crear una nueva migración. |
| 9 | **NUNCA eliminar columnas de tablas en producción sin plan** | Usar soft-delete o migración progresiva. |
| 10 | **NUNCA hacer operaciones DDL sin migración** | Los cambios de schema deben ser rastreables y reversibles. |
| 11 | **NUNCA olvidar `tenant_id` en tablas multi-tenant** | Todas las tablas con datos por establecimiento deben tener `tenant_id` con FK y RLS. |

### 🔴 Arquitectura

| # | Regla | Por qué |
|---|-------|---------|
| 12 | **NUNCA duplicar componentes que ya existen en `shared/`** | Buscar antes de crear. Barrel re-exports en `components/` para backward compat. |
| 13 | **NUNCA duplicar hooks que ya existen en `shared/lib/hooks/`** | Un hook, un propósito, un lugar. |
| 14 | **NUNCA modificar solo `server/routes/` sin actualizar `server/api/routes/`** | Los dos entry points deben estar sincronizados. |
| 15 | **NUNCA romper el flujo de Due Process** | Las 5 fases (Recepción → Investigación → Resolución → Apelación → Seguimiento) son sagradas. |
| 16 | **NUNCA romper el Document Generator** | La generación de cartas disciplinarias tiene implicancias legales. |
| 17 | **NUNCA romper el Timeline de causas** | Es el corazón del caso disciplinario. Bitácora + Checklist + AI deben funcionar siempre. |
| 18 | **NUNCA cambiar IDs de estudiantes o causas a manual/auto-increment** | UUIDs son obligatorios para multi-tenant y seguridad. |

### 🔴 Código

| # | Regla | Por qué |
|---|-------|---------|
| 19 | **NUNCA usar `useEffect` para fetching de datos** | Usar React Query. useEffect para fetching causa waterfalls y race conditions. |
| 20 | **NUNCA poner toda la app en un solo store de Zustand** | Separar por dominio: authStore, causasStore, uiStore, toastStore. |
| 21 | **NUNCA hacer prop drilling > 2 niveles** | Usar Zustand o Context. |
| 22 | **NUNCA hardcodear strings de UI en inglés** | Todo el UI es en español chileno. |
| 23 | **NUNCA ignorar warnings de lint** | `tsc --noEmit` debe pasar limpio antes de commit. |

---

## SIEMPRE HACER

### ✅ Antes de Commit

| # | Regla |
|---|-------|
| 1 | **Siempre ejecutar `npm run lint`** — 0 errores |
| 2 | **Siempre ejecutar `npm run test`** — 22/22 pasando |
| 3 | **Siempre ejecutar `npm run build:web`** — Build exitoso |
| 4 | **Siempre revisar `git diff` para detectar secrets** |
| 5 | **Siempre escribir commit message descriptivo en español** |

### ✅ Al Codificar

| # | Regla |
|---|-------|
| 6 | **Siempre usar `import type` para imports type-only** |
| 7 | **Siempre tipar props de componentes con interfaces explícitas** |
| 8 | **Siempre usar Zod schemas para validación runtime** |
| 9 | **Siempre usar camelCase en TypeScript y snake_case en DB** (mappers.ts) |
| 10 | **Siempre lazy-load componentes pesados** (React.lazy + Suspense) |
| 11 | **Siempre documentar decisiones importantes** (ADR en docs/adr/) |
| 12 | **Siempre preservar license headers** `/** @license SPDX-License-Identifier: Apache-2.0 */` |

### ✅ Al Crear Features

| # | Regla |
|---|-------|
| 13 | **Siempre crear servicio en `shared/api/services/`** |
| 14 | **Siempre crear hook en `shared/lib/hooks/`** |
| 15 | **Siempre crear Zod schema en `shared/lib/schemas/`** |
| 16 | **Siempre crear tests junto al código** (`*.test.ts` co-located) |
| 17 | **Siempre agregar tenant_id con FK a tenants(id)** |
| 18 | **Siempre crear RLS policies para SELECT + INSERT + UPDATE + DELETE** |

### ✅ Al Modificar Supabase/DB

| # | Regla |
|---|-------|
| 19 | **Siempre crear nueva migración** (timestamp_descripcion.sql) |
| 20 | **Siempre agregar índices** para columnas de filtro (tenant_id, FKs, fechas) |
| 21 | **Siempre probar RLS policies** con diferentes roles |
| 22 | **Siempre actualizar seed.sql** con datos de ejemplo |

---

## CONSECUENCIAS DE VIOLACIÓN

| Violación | Consecuencia |
|-----------|-------------|
| Romper RLS | Datos de estudiantes expuestos entre tenants — CRÍTICO |
| Exponer service_role key | Acceso total a la base de datos — CRÍTICO |
| Modificar migración existente | Inconsistencia entre entornos — GRAVE |
| No sincronizar dual server | API rota en producción — GRAVE |
| Usar `any` | Deuda técnica, bugs silenciosos — MEDIO |
| No testear | Regresiones inesperadas — MEDIO |

---

*Esta constitución es un documento vivo. Para modificarla, crear un ADR explicando por qué la regla debe cambiar.*
