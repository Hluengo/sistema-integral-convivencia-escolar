# Auditoría Integral del Proyecto

**Sistema Integral de Convivencia Escolar**

**Fecha:** 30 Julio 2026
**Alcance:** Full-stack (React 19 + TypeScript 5.8 + Express 4 + Supabase + Vercel)
**Archivos analizados:** ~380 fuente, 44 migraciones, 38 tests (~278 casos)
**Auditor:** Staff Software Engineer / Software Architect / Code Reviewer / QA Engineer

---

## 1. Resumen Ejecutivo

**Estado general: SÓLIDO con deuda técnica localizada. Valoración: 7.5/10**

El proyecto está notablemente bien construido para su complejidad. La arquitectura FSD, el uso de TypeScript estricto sin `any`, la seguridad JWT multi-algoritmo, y la cobertura de tests en capas de dominio son ejemplares. Sin embargo, arrastra deuda técnica de migración desde arquitectura legacy que se manifiesta como duplicación de código entre `server/routes/` ↔ `server/api/routes/` y `src/components/` ↔ `src/features/`.

### Lo que funciona excepcionalmente

| Aspecto                    | Detalle                                                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Seguridad multi-capa**   | JWT (HMAC + JWKS ES256/RS256), rechazo `alg: none`, verificación issuer/exp/nbf/sub, sanitización de prompts IA        |
| **Multi-tenant**           | Aislamiento real via `tenant_id` en JWT `app_metadata`, RLS policies por tenant+rol, triggers de sincronización        |
| **Calidad de código**      | TypeScript strict, `consistent-type-imports`, sin `any`, sin `@ts-ignore`, sin `dangerouslySetInnerHTML`, sin `eval()` |
| **Testing de seguridad**   | `auth.test.ts` (22 tests) y `jwks.test.ts` (17 tests) de calidad profesional                                           |
| **Estado global**          | Zustand stores bien separadas y tipadas                                                                                |
| **Server state**           | TanStack React Query v5 — bien integrado                                                                               |
| **Cumplimiento normativo** | Fechas Chile (America/Santiago), Zod schemas, lógica RICE/482                                                          |
| **Documentación**          | ADRs, CONSTITUTION.md, HANDBOOK.md, security-review, diagramas                                                         |
| **CI/CD**                  | Husky pre-push (lint+test+build+audit), lint-staged                                                                    |
| **Dependencias**           | React 19, TypeScript 5.8, Vite 6, Tailwind 4, Zod 4 — todo actual                                                      |

---

## 2. Hallazgos Críticos (🔴)

### 🔴 CR-01: Falta error-handling middleware Express

| Campo                | Valor                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| **Archivo**          | `server/index.ts` (L~~50), `server/api/index.ts` (L~~35)                                          |
| **Impacto**          | Cuelga la request si un async handler lanza fuera de try/catch. En Vercel: timeout 30s silencioso |
| **Probabilidad**     | Media (handlers tienen try/catch, pero olvidar uno causa error silencioso)                        |
| **Recomendación**    | Agregar `app.use((err, req, res, next) => { ... })` en ambos entry points                         |
| **Complejidad**      | Baja (~15 líneas)                                                                                 |
| **Riesgo regresión** | Bajo — no cambia flujo exitoso                                                                    |
| **Validación**       | `curl /api/health` + test de handler con async throw                                              |

### 🔴 CR-02: `write-excel-file` no instalado

| Campo                | Valor                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------- |
| **Archivo**          | `package.json` (declarada, no instalada)                                                 |
| **Impacto**          | `annotationsExcelExport.ts` falla en producción: `Cannot find module 'write-excel-file'` |
| **Probabilidad**     | Alta (100% al ejecutar export)                                                           |
| **Recomendación**    | `npm install write-excel-file@^4.1.1`                                                    |
| **Complejidad**      | Baja (un comando)                                                                        |
| **Riesgo regresión** | Nulo                                                                                     |

### 🔴 CR-03: Drift `draft.ts` — distinto comportamento dev vs prod

| Campo                | Valor                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| **Archivo**          | `server/routes/draft.ts` vs `server/api/routes/draft.ts`                                               |
| **Impacto**          | Dev soporta 5 tipos de carta, prod solo 4. Manejo de errores distinto (500 vs 400). Prompts diferentes |
| **Probabilidad**     | Alta (afecta todos los deployments a Vercel)                                                           |
| **Recomendación**    | Unificar: prompts de dev + error handling de prod                                                      |
| **Complejidad**      | Media (~280 vs ~200 líneas)                                                                            |
| **Riesgo regresión** | Alto — cambios en prompts afectan output de IA. Validar con `letter-document.test.ts`                  |

### 🔴 CR-04: `node_modules` contaminado

| Campo                | Valor                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| **Archivo**          | `package-lock.json` / `node_modules`                                                                      |
| **Impacto**          | Paquetes extraneous (vitest, oxlint, opentelemetry, vscode-languageserver). Inconsistencia entre entornos |
| **Probabilidad**     | Alta (ya manifiesto)                                                                                      |
| **Recomendación**    | `rm -rf node_modules && npm ci`                                                                           |
| **Complejidad**      | Baja                                                                                                      |
| **Riesgo regresión** | Bajo — regenera desde lockfile                                                                            |

---

## 3. Hallazgos Importantes (🟠)

### 🟠 HI-01: Código duplicado `server/routes/` vs `server/api/routes/`

| Campo                | Valor                                                              |
| -------------------- | ------------------------------------------------------------------ |
| **Archivos**         | 9 pares de rutas + middleware duplicados                           |
| **Impacto**          | Cada cambio debe hacerse dos veces. Ya hay drift funcional (CR-03) |
| **Probabilidad**     | 100%                                                               |
| **Recomendación**    | Unificar re-exportando desde `server/routes/`                      |
| **Complejidad**      | Media (2-3h)                                                       |
| **Riesgo regresión** | Alto — tocar imports puede romper Vercel                           |

### 🟠 HI-02: `audit.ts` y `processDisciplinaryPdf.ts` con drift

| Campo             | Valor                                                                            |
| ----------------- | -------------------------------------------------------------------------------- |
| **Archivos**      | `server/routes/audit.ts:56`, `server/api/routes/audit.ts:60`                     |
| **Impacto**       | Prod tiene `isRequestValidationError` (400) y detección duplicados (409). Dev no |
| **Recomendación** | Portar mejoras de prod a dev                                                     |
| **Complejidad**   | Baja (~20 líneas c/u)                                                            |

### 🟠 HI-03: Barrel stores duplicados

| Campo             | Valor                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **Archivos**      | `src/stores/` (3 barrels re-exportando de `src/shared/lib/stores/`) |
| **Impacto**       | Dos puntos de entrada para lo mismo                                 |
| **Recomendación** | Migrar imports a `src/shared/lib/stores/`, eliminar `src/stores/`   |
| **Complejidad**   | Media (50-80 imports)                                               |

### 🟠 HI-04: ID sin sanitizar en URL REST

| Campo             | Valor                                                                 |
| ----------------- | --------------------------------------------------------------------- |
| **Archivo**       | `server/routes/templates.ts:100`, `server/api/routes/templates.ts:91` |
| **Impacto**       | Potencial inyección en filtro REST: `id=eq.${id}`                     |
| **Recomendación** | `encodeURIComponent(id)` o validar UUID                               |
| **Complejidad**   | Baja (1 línea)                                                        |

### 🟠 HI-05: `disciplinaryPdfAnalysis.ts` monolítico (1,290 líneas)

| Campo                | Valor                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Archivo**          | `server/lib/disciplinaryPdfAnalysis.ts`                                                                                  |
| **Impacto**          | Polyfills DOM + PDF parser + student matcher + annotation classifier + document creator. Ilegible, imposible de testear  |
| **Recomendación**    | Dividir en: `polyfills.ts`, `pdfTextExtractor.ts`, `studentMatcher.ts`, `annotationClassifier.ts`, `processConfirmer.ts` |
| **Complejidad**      | Alta (12-16h)                                                                                                            |
| **Riesgo regresión** | Muy alto — requiere test de integración                                                                                  |

### 🟠 HI-06: Tests de checklist insuficientes

| Campo             | Valor                                                           |
| ----------------- | --------------------------------------------------------------- |
| **Archivo**       | `src/shared/api/services/checklist.service.test.ts` (395 bytes) |
| **Impacto**       | Lógica de upsert+cleanup sin tests                              |
| **Recomendación** | Agregar tests para `saveChecklist`, `getChecklistByCausaId`     |
| **Complejidad**   | Media (2h)                                                      |

---

## 4. Oportunidades de Mejora (🟡)

### 🟡 OM-01: `VITE_SUPABASE_ANON_KEY` usado como secreto HMAC

**Archivo:** `server/middleware/auth.ts:75`
**Recomendación:** Usar `SUPABASE_JWT_SECRET` para HMAC, anon key solo client-side
**Complejidad:** Baja

### 🟡 OM-02: Componentes frontend >10KB sin división

**Archivos:** `NewDisciplinaryProcessModal.tsx` (29KB), `AnotacionesStudentTable.tsx` (22KB), `CartasTab.tsx` (16KB), `EditCausaModalForm.tsx` (15KB), `ProcessChecklist.tsx` (14KB)
**Recomendación:** Dividir en sub-componentes por responsabilidad
**Complejidad:** Media (4-6h c/u)

### 🟡 OM-03: Queries Supabase sin paginación

**Archivos:** `cartas.service.ts`, `annotations.service.ts`, `causas.service.ts`
**Recomendación:** Agregar `.limit()` / `.range()` con TanStack Query
**Complejidad:** Media (1-2h por servicio)

### 🟡 OM-04: Dynamic imports en request handlers

**Archivos:** `server/routes/improve.ts:32`, `server/routes/usage.ts:27`
**Recomendación:** Mover imports al tope del archivo
**Complejidad:** Baja

### 🟡 OM-05: Rate limiting inefectivo en serverless

**Archivo:** `server/api/services/rateLimit.ts`
**Recomendación:** Configurar Upstash Redis o documentar limitación
**Complejidad:** Baja

### 🟡 OM-06: Cache en memoria inútil en serverless

**Archivos:** `server/lib/cache.ts`, `server/lib/jwks.ts`
**Recomendación:** Usar Cache-Control headers o Redis compartido
**Complejidad:** Media

### 🟡 OM-07: Dos sistemas E2E paralelos

**Archivos:** `e2e/` (node:test) vs `tests/` (Playwright nativo)
**Recomendación:** Migrar `e2e/` a `tests/` con Playwright nativo
**Complejidad:** Media (1-2h)

### 🟡 OM-08: `req.connection` deprecated

**Archivos:** 5 archivos en server/
**Recomendación:** Reemplazar con `req.socket.remoteAddress`
**Complejidad:** Baja

### 🟡 OM-09: ESLint no cubre todos los archivos

**Archivo:** `eslint.config.js` (ignores)
**Recomendación:** Expandir scope progresivamente
**Complejidad:** Baja

---

## 5. Deuda Técnica (🟢)

### 🟢 DT-01: Barrel imports legacy `src/components/` → `src/features/`

~50 archivos de re-export. Dos copias virtuales de cada componente.
**Complejidad:** Alta (~50 archivos)

### 🟢 DT-02: `src/hooks/` y `src/services/` barrels legacy

Re-exports que añaden complejidad de navegación.

### 🟢 DT-03: `vitest.config.ts` huérfano

Proyecto usa `node:test`, no Vitest.

### 🟢 DT-04: Script `lint:types` duplicado

Idéntico a `typecheck`.

### 🟢 DT-05: Script `check` redundante

Ejecuta `lint` (ya incluye `lint:code`) + `lint:code` otra vez.

### 🟢 DT-06: `api/index.js` (build artifact) en Git

98KB trackeado en el repo. No debería estar versionado.

### 🟢 DT-07: `supabase_migration.sql` huérfano en raíz

Esquema legacy que duplica migraciones.

### 🟢 DT-08: `test-free-models.js` huérfano

Script no referenciado desde package.json.

### 🟢 DT-09: URL Supabase en `opencode.json`

URL real de proyecto hardcodeada.

### 🟢 DT-10: Sin `.prettierignore`

Prettier formatea `dist/`, `api/index.js`, etc.

### 🟢 DT-11: `src/lib/` fuera de FSD

Archivos sueltos (analytics, sentry, posthog, webVitals).

### 🟢 DT-12: `src/domain/` y `src/shared/lib/domain/` duplicados

Misma lógica. Tests duplicados.

---

## 6. Plan de Acción Priorizado

### Fase 1 — Riesgos Críticos (1-2 días)

| #   | Tarea                                       | Esfuerzo | Riesgo | Ref   |
| --- | ------------------------------------------- | -------- | ------ | ----- |
| 1.1 | `npm install write-excel-file@^4.1.1`       | 5 min    | Nulo   | CR-02 |
| 1.2 | `rm -rf node_modules && npm ci`             | 5 min    | Bajo   | CR-04 |
| 1.3 | Agregar error-handling middleware Express   | 30 min   | Bajo   | CR-01 |
| 1.4 | Unificar `draft.ts` (prompts dev + EH prod) | 2-3h     | Alto   | CR-03 |

### Fase 2 — Estabilidad (3-5 días)

| #   | Tarea                                            | Esfuerzo | Riesgo | Ref   |
| --- | ------------------------------------------------ | -------- | ------ | ----- |
| 2.1 | Portar mejoras de prod a dev (audit, processPdf) | 30 min   | Medio  | HI-02 |
| 2.2 | URL-encode ID en templates                       | 10 min   | Bajo   | HI-04 |
| 2.3 | `req.connection` → `req.socket`                  | 20 min   | Bajo   | OM-08 |
| 2.4 | Dynamic imports al tope                          | 15 min   | Bajo   | OM-04 |
| 2.5 | Tests para checklist.service                     | 2h       | Nulo   | HI-06 |
| 2.6 | Paginación queries Supabase                      | 4h       | Medio  | OM-03 |
| 2.7 | Migrar barrels stores                            | 2-3h     | Alto   | HI-03 |

### Fase 3 — Rendimiento y Arquitectura (1-2 semanas)

| #   | Tarea                                             | Esfuerzo | Riesgo   | Ref   |
| --- | ------------------------------------------------- | -------- | -------- | ----- |
| 3.1 | Refactor `disciplinaryPdfAnalysis.ts` → 5 módulos | 12-16h   | Muy alto | HI-05 |
| 3.2 | Unificar `server/routes/` y `server/api/routes/`  | 4-6h     | Alto     | HI-01 |
| 3.3 | Dividir componentes frontend >10KB                | 12-20h   | Alto     | OM-02 |
| 3.4 | Configurar Upstash Redis                          | 2h       | Bajo     | OM-05 |
| 3.5 | Cache compartido para JWKS                        | 2h       | Medio    | OM-06 |

### Fase 4 — Limpieza y Mantenibilidad (2-3 días)

| #    | Tarea                                             | Esfuerzo | Riesgo | Ref      |
| ---- | ------------------------------------------------- | -------- | ------ | -------- |
| 4.1  | Eliminar `api/index.js` de Git                    | 10 min   | Bajo   | DT-06    |
| 4.2  | Eliminar `vitest.config.ts`                       | 5 min    | Bajo   | DT-03    |
| 4.3  | Eliminar `supabase_migration.sql`                 | 5 min    | Bajo   | DT-07    |
| 4.4  | Mover `test-free-models.js` a `scripts/`          | 5 min    | Bajo   | DT-08    |
| 4.5  | Unificar scripts duplicados                       | 10 min   | Bajo   | DT-04/05 |
| 4.6  | Agregar `.prettierignore`                         | 5 min    | Bajo   | DT-10    |
| 4.7  | Migrar `src/lib/` → `src/shared/lib/`             | 1-2h     | Medio  | DT-11    |
| 4.8  | Unificar `src/domain/` → `src/shared/lib/domain/` | 1h       | Medio  | DT-12    |
| 4.9  | Migrar `e2e/` a Playwright nativo                 | 1-2h     | Bajo   | OM-07    |
| 4.10 | Remover URL Supabase de `opencode.json`           | 5 min    | Bajo   | DT-09    |

---

## 7. Quick Wins (Bajo Riesgo, Alto Impacto)

| #   | Tarea                             | Tiempo | Impacto                         |
| --- | --------------------------------- | ------ | ------------------------------- |
| 1   | `npm install write-excel-file`    | 5 min  | 🔴 Evita crash producción       |
| 2   | `rm -rf node_modules && npm ci`   | 5 min  | 🔴 Resuelve contaminación       |
| 3   | Error-handling middleware Express | 30 min | 🔴 Evita requests colgadas      |
| 4   | URL-encode ID en templates        | 10 min | 🟠 Previene inyección           |
| 5   | `req.connection` → `req.socket`   | 20 min | 🟠 Elimina deprecation warnings |
| 6   | Dynamic imports al tope           | 15 min | 🟡 Mejora performance           |
| 7   | Eliminar `api/index.js` de Git    | 10 min | 🟢 Reduce ruido diffs           |
| 8   | Eliminar scripts duplicados       | 10 min | 🟢 Simplifica package.json      |
| 9   | Agregar `.prettierignore`         | 5 min  | 🟢 Evita formateo innecesario   |
| 10  | Eliminar archivos huérfanos       | 15 min | 🟢 Reduce confusión             |

---

## 8. Cambios que NO deben realizarse

### 🔒 No tocar — riesgo extremo sin beneficio proporcional

| Componente                                                 | Razón                                                                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `server/middleware/auth.ts`                                | Complejo pero correcto. Soporta HMAC + JWKS + fallback Supabase. Cambiarlo rompe auth multi-algoritmo |
| Migraciones existentes en `supabase/migrations/`           | Regla explícita del proyecto. Crear nuevas, no modificar existentes                                   |
| RLS policies                                               | Funcionan con tenant isolation. Cambios pueden exponer datos de estudiantes                           |
| `src/shared/lib/types.ts` (EstadoCausa, FaseProcedimental) | Tipos de dominio compartidos. Cambiarlos requiere migración de datos y frontend                       |
| `src/shared/lib/dateTime.ts` (formatChileDate)             | Regla: fechas en America/Santiago. No cambiar                                                         |
| `src/index.css` (Tailwind theme)                           | Config compartida. Cambios cosméticos deben ir en componentes                                         |
| `vercel.json` (CSP, headers)                               | Seguridad validada con tests. Cambiar CSP puede romper carga de assets                                |

### ⚠️ No refactorizar sin justificación de negocio

| Componente                                    | Razón                                                                        |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `server/lib/jwks.ts`                          | Correcto, tests excelentes. Solo tocar para nuevo algoritmo JWT              |
| `index.html` CSP                              | Seguridad validada con `telemetry.test.ts`. Cambiar requiere actualizar test |
| Sistema de roles (requireRole, profiles.role) | Funciona. Cambiar requiere migración de datos                                |
| `src/features/anotaciones/docgen/`            | Recién implementado. 49 tests pasan. No tocar                                |
| `src/shared/lib/schemas/`                     | Zod completo y testeado. Cambios requieren migración                         |

---

## 9. Métricas del Proyecto

| Métrica                                 | Valor                                            |
| --------------------------------------- | ------------------------------------------------ |
| Archivos fuente (src/)                  | ~280                                             |
| Archivos servidor (server/)             | ~49                                              |
| Migraciones SQL                         | 44                                               |
| Tests unitarios                         | ~278 (38 archivos)                               |
| Dependencias                            | 22 prod + 25 dev                                 |
| Líneas más larga (server)               | `disciplinaryPdfAnalysis.ts` — 1,290 líneas      |
| Componente más grande                   | `NewDisciplinaryProcessModal.tsx` — 29KB         |
| Archivo más grande                      | `src/reglamentoData.ts` — 24KB (data, no código) |
| Severidad 0 (no `any`, no `@ts-ignore`) | ✅ Perfecto                                      |

---

## 10. Resumen de Clasificaciones

| Severidad  | Cantidad | Descripción                                                                                                                        |
| ---------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 🔴 Crítico | 4        | Error-handling middleware, dependencia faltante, drift dev/prod, node_modules                                                      |
| 🟠 Alto    | 6        | Código duplicado, auditoría, barrels, inyección REST, monolito PDF, tests checklist                                                |
| 🟡 Medio   | 9        | Anon key como secreto, componentes grandes, paginación, dynamic imports, rate limit, cache, E2E dual, req.connection, ESLint scope |
| 🟢 Bajo    | 12       | Barrels legacy, archivos huérfanos, scripts duplicados, configs                                                                    |

---

_Auditoría completada. Ningún archivo fue modificado. Esperar aprobación antes de implementar cambios._
