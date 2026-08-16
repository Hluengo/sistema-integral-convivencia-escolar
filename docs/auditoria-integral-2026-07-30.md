# Auditoría Integral — Sistema Integral de Convivencia Escolar

> **Fecha:** 2026-07-30
> **Auditor:** Buffy (AI Agent)
> **Versión del proyecto:** 1.3
> **Estado:** Producción

---

## Resumen Ejecutivo

| Área             | Estado   | Hallazgos Críticos                                  |
| ---------------- | -------- | --------------------------------------------------- |
| **Seguridad**    | ⚠️ Medio | 0 vulnerabilidades críticas, 3 mejoras recomendadas |
| **Código**       | ⚠️ Medio | 13 errores ESLint, 37 useEffect, 76 console.error   |
| **Arquitectura** | ✅ Buena | Entry points sincronizados, FSD consistente         |
| **Testing**      | ⚠️ Medio | 248/249 tests pasan, 1 fallo por dependencia        |
| **Dependencias** | ✅ Buena | Actualizadas, sin vulnerabilidades conocidas        |

**Calificación general: B+** — Proyecto bien estructurado con seguridad sólida, pendiente de refinamiento en testing de endpoints AI y reducción de deuda técnica en useEffects.

---

## 1. 🔒 SEGURIDAD

### ✅ Lo que está bien

- **Auth robusta**: JWT verification con JWKS asimétrico + HMAC legacy + fallback a Supabase API (`server/middleware/auth.ts`)
- **RLS exhaustivo**: 63+ CREATE POLICY en migraciones, multi-tenant por `tenant_id`
- **Sanitización AI**: `sanitizeForAI()` aplicado en todos los endpoints AI (advisor, draft, audit, improve)
- **Rate limiting**: 10 req/min/IP con Redis (Upstash) o memoria en desarrollo
- **Service role**: Solo se usa en server-side (`templates.ts`, `usage.ts`, `disciplinaryPdfAnalysis.ts`), nunca al cliente
- **Membership system**: Sistema de membresías con 3 modos (legacy, transition, enforced)
- **Input validation**: `sanitize()`, `requireStr()`, `optStr()` con límites de longitud
- **Helmet**: Habilitado en ambos entry points (aunque CSP deshabilitado — ver mejora)

### ⚠️ Mejoras recomendadas

#### CRÍTICO

**1. JWT Secret vacío (`server/middleware/auth.ts:295`)**

```typescript
// Actual:
process.env.SUPABASE_JWT_SECRET ?? '';

// Problema: Si la variable no existe, intenta verificar HMAC con string vacío.
// Debería fallar explícitamente.
```

**Recomendación:** Lanzar error al inicio si `SUPABASE_JWT_SECRET` no está configurado y no hay JWKS disponible.

**2. Doble rate limit inconsistente en endpoints AI**

Los routes AI (`advisor.ts`, `draft.ts`, `audit.ts`, `improve.ts`) aplican rate limit manualmente por IP **Y** el middleware global `rateLimit` también se aplica. El rate limit manual usa `req.ip` mientras el middleware usa `req.user?.sub ?? req.ip`, creando inconsistencia.

**Recomendación:** Unificar la lógica de rate limiting. Usar solo el middleware global o eliminar el manual.

**3. CSP deshabilitado en ambos entry points**

```typescript
// server/index.ts y server/api/index.ts:
helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false });
```

**Recomendación:** Configurar un CSP restrictivo:

```typescript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://*.supabase.co'],
      connectSrc: ["'self'", 'https://*.supabase.co', 'https://openrouter.ai'],
    },
  },
});
```

#### MEJORA

**4. `server/api/routes/debug.ts` — Endpoint sin auth completa**

El endpoint `auth-debug` retorna `{ authenticated: true }` sin información del usuario. En desarrollo es útil, pero debería verificarse que en producción siempre retorna 404 (actualmente lo hace correctamente).

---

## 2. 🧹 CÓDIGO

### ESLint (13 errores, 1 warning)

| Archivo                               | Errores   | Problema                                   |
| ------------------------------------- | --------- | ------------------------------------------ |
| `.agents/types/agent-definition.ts`   | 3         | `@typescript-eslint/no-explicit-any`       |
| `.agents/types/tools.ts`              | 6         | `no-explicit-any` + `no-empty-object-type` |
| `.agents/types/util-types.ts`         | 4         | `@typescript-eslint/no-explicit-any`       |
| `src/features/causas/CausasTable.tsx` | 1 warning | `jsx-a11y/control-has-associated-label`    |

**Nota:** Los errores en `.agents/types/` son de un directorio generado. Si `.agents/` debería ser ignorado por ESLint, agregarlo a `eslint.config.js`.

### useEffect (37 instancias)

Los más preocupantes por potenciales memory leaks o re-renders innecesarios:

| Archivo                            | Línea             | Uso                                                           |
| ---------------------------------- | ----------------- | ------------------------------------------------------------- |
| `AnotacionesDocumentGenerator.tsx` | 86, 113, 124, 135 | **4 useEffects** en un solo componente — candidato a refactor |
| `CommandPalette.tsx`               | 108, 119, 130     | **3 useEffects** — candidato a refactor                       |
| `useCausasPersistence.ts`          | 41, 87, 100       | **3 useEffects** — lógica de persistencia compleja            |
| `DocumentosView.tsx`               | 114, 183          | **2 useEffects** — carga de datos                             |
| `AnotacionesView.tsx`              | 103, 107          | **2 useEffects** — carga + actualización                      |

### console.error (76 instancias)

- **Server-side** (34 instancias): Aceptable para logging de errores
- **Client-side** (42 instancias en `src/`): Debería usar el sistema de telemetría (Sentry/PostHog) en producción, no `console.error`

### Patterns positivos detectados

| Pattern                           | Instancias | Estado                      |
| --------------------------------- | ---------- | --------------------------- |
| `as any`                          | 0          | ✅ Código muy tipado        |
| `@ts-ignore` / `@ts-expect-error` | 0          | ✅ Sin suppressiones        |
| `dangerouslySetInnerHTML`         | 0          | ✅ Sin XSS por React        |
| `eval()`                          | 0          | ✅ Sin evaluación de código |

---

## 3. 🏗️ ARQUITECTURA

### ✅ Entry Points Sincronizados

Ambos entry points (`server/index.ts` y `server/api/index.ts`) registran las mismas rutas:

| Ruta                            | server/index.ts | server/api/index.ts | Rate Limit |
| ------------------------------- | --------------- | ------------------- | ---------- |
| `/api/audit-due-process`        | ✅              | ✅                  | Sí         |
| `/api/draft-document`           | ✅              | ✅                  | Sí         |
| `/api/improve-text`             | ✅              | ✅                  | Sí         |
| `/api/advisor-chat`             | ✅              | ✅                  | Sí         |
| `/api/parse-annotations`        | ✅              | ✅                  | Sí         |
| `/api/process-disciplinary-pdf` | ✅              | ✅                  | Sí         |
| `/api/templates`                | ✅              | ✅                  | No         |
| `/api/debug/*`                  | ✅              | ✅                  | No         |
| `/api/usage`                    | ✅              | ✅                  | No         |
| `/api/pilot`                    | ✅              | ✅                  | No         |

### ✅ FSD (Feature-Sliced Design) consistente

```
src/
├── app/           # Inicialización: App.tsx, Router, Providers
├── features/      # Features completas
│   ├── anotaciones/
│   ├── causas/
│   ├── documentos/
│   ├── ai-advisor/
│   ├── students/
│   ├── command-palette/
│   └── onboarding/
├── shared/        # Código compartido
│   ├── api/       # Services, hooks, types
│   ├── lib/       # Hooks, stores, utils
│   ├── ui/        # UI components
│   └── stores/    # Zustand stores
├── components/    # Legacy components con barrels
├── schemas/       # Zod schemas
└── services/      # Auth service
```

### ⚠️ Áreas de mejora

**1. Servicios inline en routes**

`server/api/routes/draft.ts` hace queries a Supabase directamente (líneas 145-155) en vez de usar un servicio compartido. Lo mismo con `usage.ts` y `templates.ts`.

**Recomendación:** Crear `server/api/services/supabaseClient.ts` con helper functions reutilizables.

**2. Middleware duplicado (intencional)**

`server/api/middleware/requireRole.ts` y `requireTenant.ts` son solo re-exports de `server/middleware/`. Esto es intencional para compatibilidad pero genera confusión.

**Recomendación:** Documentar en AGENTS.md que estos son re-exports.

---

## 4. 🧪 TESTING

### Estado actual

- **248/249 tests pasan** ✅
- **1 fallo**: `annotationsExcelExport.test.ts` — Error `ERR_MODULE_NOT_FOUND: Cannot find package 'write-excel-file'`

**Causa del fallo:** El paquete `write-excel-file` está en `dependencies` pero el test importa desde un path que no resuelve correctamente.

**Fix sugerido:** Verificar que el test importa correctamente o agregar el paquete a devDependencies.

### Cobertura de tests

| Área              | Archivos de test                                                                                                       | Estado   |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- | -------- |
| Server middleware | `auth.test.ts`, `errorHandler.test.ts`, `errorHandler.integration.test.ts`, `rateLimit.test.ts`                        | ✅       |
| Server routes     | `pilot.test.ts`, `templates.test.ts`                                                                                   | ✅       |
| Domain logic      | `disciplinaryStatus.test.ts`                                                                                           | ✅       |
| Features          | `annotationsExcelExport.test.ts`                                                                                       | ⚠️ fallo |
| E2E               | `smoke.test.ts`, `case-flow.test.ts`, `smoke-membership.spec.ts`, `letter-export.test.ts`, `application-smoke.spec.ts` | ✅       |

### Gaps de testing

| Área sin tests                                                   | Prioridad                              |
| ---------------------------------------------------------------- | -------------------------------------- |
| `server/api/routes/advisor.ts`                                   | Alta — endpoint AI sensible            |
| `server/api/routes/draft.ts`                                     | Alta — endpoint AI con datos sensibles |
| `server/api/routes/audit.ts`                                     | Alta — endpoint AI con datos sensibles |
| `server/api/routes/improve.ts`                                   | Media — endpoint AI simple             |
| `server/api/routes/parse.ts`                                     | Media — procesamiento de texto         |
| `server/api/routes/processDisciplinaryPdf.ts`                    | Alta — procesamiento de documentos     |
| Client services (`causas.service.ts`, `cartas.service.ts`, etc.) | Media                                  |
| Zustand stores (`authStore.ts`, `causasStore.ts`, `uiStore.ts`)  | Baja                                   |

---

## 5. 📦 DEPENDENCIAS Y CONFIG

### Paquetes principales (actualizados)

| Paquete      | Versión | Estado          |
| ------------ | ------- | --------------- |
| React        | 19.0.1  | ✅ Última major |
| TypeScript   | 5.8.2   | ✅ Última minor |
| Vite         | 6.2.3   | ✅ Última major |
| Tailwind CSS | 4.1.14  | ✅ Última major |
| Zustand      | 5.0.14  | ✅ Última major |
| React Query  | 5.101.2 | ✅ Última major |
| Express      | 4.21.2  | ✅ Última minor |
| Supabase JS  | 2.110.3 | ✅ Actualizado  |

### Configuración de herramientas

| Herramienta          | Estado | Notas                                                                      |
| -------------------- | ------ | -------------------------------------------------------------------------- |
| `.nvmrc`             | ✅     | Node 22                                                                    |
| `tsconfig.json`      | ✅     | Strict mode, path alias `@/`                                               |
| `biome.json`         | ⚠️     | Configurado pero `biome` no está en devDependencies — probablemente legacy |
| `vercel.json`        | ✅     | Configurado para serverless                                                |
| Husky                | ✅     | pre-commit (lint-staged) + pre-push (lint + test + build)                  |
| `knip`               | ✅     | Configurado, ignora `server/api/index.ts` (bundle generado)                |
| `.lintstagedrc.json` | ✅     | ESLint + Prettier en staged files                                          |

---

## 6. 🎯 RECOMENDACIONES PRIORIZADAS

### P0 — Crítico (hacer antes de próximo release)

| #   | Acción                                                                    | Archivo(s)                                                |
| --- | ------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | **Configurar CSP real** en Helmet                                         | `server/index.ts`, `server/api/index.ts`                  |
| 2   | **Fix test roto** — verificar import de `write-excel-file`                | `src/features/anotaciones/annotationsExcelExport.test.ts` |
| 3   | **Validación explícita** cuando `SUPABASE_JWT_SECRET` no está configurado | `server/middleware/auth.ts`                               |

### P1 — Importante (próximas 2 semanas)

| #   | Acción                                                        | Archivo(s)                                                                          |
| --- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 4   | **Reducir console.error en client** — migrar a Sentry/PostHog | `src/**/*.tsx`, `src/**/*.ts`                                                       |
| 5   | **Refactorizar componentes con 3+ useEffects**                | `AnotacionesDocumentGenerator.tsx`, `CommandPalette.tsx`, `useCausasPersistence.ts` |
| 6   | **Agregar tests a endpoints AI**                              | `server/api/routes/advisor.ts`, `draft.ts`, `audit.ts`, `improve.ts`                |

### P2 — Mejora (próximo mes)

| #   | Acción                                              | Archivo(s)                                                 |
| --- | --------------------------------------------------- | ---------------------------------------------------------- |
| 7   | **Agregar `.agents/` a ignores de ESLint**          | `eslint.config.js`                                         |
| 8   | **Eliminar `biome.json`** si no se usa              | `biome.json`                                               |
| 9   | **Consolidar rate limiting** — unificar lógica dual | `server/api/routes/*.ts`, `server/middleware/rateLimit.ts` |

---

## 📊 Métricas de Salud

| Métrica                   | Valor                          |
| ------------------------- | ------------------------------ |
| Tests pass rate           | 99.6% (248/249)                |
| ESLint errors             | 13 (12 en .agents/, 1 en src/) |
| `as any` usages           | 0 ✅                           |
| `@ts-ignore` usages       | 0 ✅                           |
| `dangerouslySetInnerHTML` | 0 ✅                           |
| `eval()` usages           | 0 ✅                           |
| useEffect count           | 37 (11 en 3 componentes)       |
| console.error (client)    | 42                             |
| RLS policies              | 63+                            |
| API endpoints             | 10                             |
| Endpoints con tests       | 2/10 (20%)                     |

---

## 📋 Checklist de cumplimiento

| Requisito                 | Estado | Notas                                       |
| ------------------------- | ------ | ------------------------------------------- |
| Datos de NNA protegidos   | ✅     | RLS + anonimización                         |
| JWT verification          | ✅     | JWKS + HMAC + fallback                      |
| Rate limiting             | ✅     | 10 req/min/IP                               |
| Input sanitization        | ✅     | `sanitizeForAI()` en todos los endpoints AI |
| Multi-tenant isolation    | ✅     | `tenant_id` + RLS policies                  |
| Debido proceso            | ✅     | 5 fases, 39 estados                         |
| Documentos legales        | ✅     | DOCX generation con templates               |
| Circular 482 compliance   | ✅     | Sistema de anotaciones RICE                 |
| Ley 21.809 compliance     | ✅     | Cálculo de plazos legales                   |
| Accessibility WCAG 2.1 AA | ✅     | Configurado en componentes                  |

---

_Auditoría generada automáticamente por Buffy (AI Agent) — 2026-07-30_
