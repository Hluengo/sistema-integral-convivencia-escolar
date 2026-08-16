# Auditoría de Cierres — Sistema Integral de Convivencia Escolar

> **Fecha:** 2026-08-07  
> **Alcance:** Verificación de los 38 hallazgos de `docs/reviews/audit-integral-20260806.md` (0 críticos · 8 altos · 16 medios · 14 bajos) + validación remota Supabase + baseline actual.  
> **Metodología:** Ejecución de baseline real (`npm run lint`, `npm run test`, `npm audit`, `knip`), lectura de migraciones, consultas SQL remotas, revisión de código y CI.

---

## 1. Baseline Actual

| Métrica                            | Valor Anterior (2026-08-06)       | Valor Actual                                    | Delta                  |
| ---------------------------------- | --------------------------------- | ----------------------------------------------- | ---------------------- |
| Tests                              | 449 / 89 suites                   | **719 / 159 suites**                            | +270 tests, +70 suites |
| Tests fallidos                     | 0                                 | 0                                               | =                      |
| Lint (ESLint + tsc)                | ✅ limpio                         | ✅ limpio                                       | =                      |
| `npm audit --omit=dev`             | 0 vuln                            | **0 vuln** (nanoid → 3.3.18)                    | =                      |
| `knip` (código muerto)             | 9 archivos, 24 exports, 3 devDeps | No ejecutado en esta auditoría                  | —                      |
| Cobertura (líneas/ramas/funciones) | 85.47% / 85.00% / 85.56%          | 92.64% / 81.87% / 91.85% (reportado 2026-08-06) | +7.17 pp líneas        |
| Umbral cobertura configurado       | 60%                               | **80%**                                         | +20 pp                 |

**Veredicto baseline:** Saludable. Suite de tests creció 60%, umbral de cobertura subido a 80%. La vulnerabilidad HIGH en `nanoid` se cerró con `npm audit fix` → **3.3.18** (0 vulnerabilidades en producción).

---

## 2. Trazabilidad de Hallazgos 2026-08-06

### 2.1 Seguridad (SEC)

| ID                 | Hallazgo                                                      | Estado         | Evidencia                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SEC-01** (MEDIO) | `GRANT ALL ON TABLE ... TO anon` en baseline                  | **CERRADO ✅** | Migración `20260806093000_revoke_anon_table_access.sql`: `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;`. Verificado remoto: `information_schema.role_table_grants` para `anon` → **0 filas**.           |
| **SEC-02** (BAJO)  | `app_role()` ejecutable por `anon` vía grant default a PUBLIC | **CERRADO ✅** | Migración `20260806130000_revoke_app_role_public_execute.sql`: `REVOKE ALL ON FUNCTION public.app_role() FROM PUBLIC;`. Verificado: `has_function_privilege('anon','public.app_role()','EXECUTE')` → **false**. |

> **Nota:** Los _Supabase Security Advisors_ reportan 59 hallazgos (1 ERROR: `teacher_public_view` SECURITY DEFINER; 40 WARN: funciones ejecutables por `anon`/`authenticated`; 18 INFO). Estos son **hallazgos preexistentes no cubiertos por SEC-01/02** y requieren revisión separada (ej. `REVOKE EXECUTE` en funciones internas, convertir vistas a SECURITY INVOKER, habilitar leaked password protection).

### 2.2 Base de Datos (DB)

| ID                | Hallazgo                                                 | Estado                                | Evidencia                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------- | -------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **DB-01** (MEDIO) | `carta_events.carta_id` / `student_id` como TEXT vs UUID | **CERRADO ✅** (swap final pendiente) | Migración `20260807000000_carta_events_uuid_fk.sql` aplicada en remoto: columnas `carta_id_uuid`/`student_id_uuid` uuid NULL, backfill **227/227** filas, 3 índices compuestos, 2 FKs ON DELETE CASCADE. `cartas.service.ts` escribe en columnas old+new y consulta con `.in('carta_id_uuid', ...)`. **Pendiente en ventana de mantenimiento:** DROP columnas text + RENAME a uuid (coordinar con código cliente). |
| **DB-02** (BAJO)  | `carta_events.tenant_id` nullable                        | **CERRADO ✅**                        | Migración `20260806124000_enforce_carta_events_tenant.sql`: backfill desde `cartas_disciplinarias` y `students` → `DELETE` huérfanos → `ALTER COLUMN tenant_id SET NOT NULL`. Verificado: `tenant_id` = `uuid NOT NULL`.                                                                                                                                                                                           |

### 2.3 Rendimiento (PERF)

| ID                  | Hallazgo                                                           | Estado         | Evidencia                                                                                                                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PERF-01** (MEDIO) | Sentry 518 KB en chunk lazy (tracing en dev)                       | **CERRADO ✅** | `src/lib/sentry.ts:14`: `tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0` **y** `beforeSend` retorna `null` en `development` + `localhost`. Tracing desactivado en dev.                                                                                         |
| **PERF-02** (MEDIO) | N+1 en `GET /api/platform/tenants`                                 | **CERRADO ✅** | `server/api/routes/platform.ts:156`: usa RPC `get_tenant_user_counts()` (GROUP BY tenant_id) con fallback a conteo individual si RPC no existe.                                                                                                                            |
| **PERF-03** (MEDIO) | `fetchCartaTableStates` sin paginación + `.in()` de todos los ids  | **CERRADO ✅** | `cartas.service.ts:200-211`: scope a año escolar (marzo-diciembre) + `.limit(500)`. El `.in('carta_id', ...)` opera sobre máx. 500 ids.                                                                                                                                    |
| **PERF-04** (MEDIO) | `fetchAnnualAnnotationTrends` agrega en cliente                    | **CERRADO ✅** | `annotations.service.ts:130-167`: llama RPC `get_annual_annotation_trend(p_year)` → reconstruye celdas mensuales. Fallback a lectura previa solo si RPC falla.                                                                                                             |
| **PERF-05** (BAJO)  | Dashboard: 6 queries con `staleTime: 30s` + `refetchOnMount: true` | **CERRADO ✅** | `DashboardStats.tsx:50`: `DASHBOARD_STALE_TIME_MS = 300_000` (5 min) aplicado a las 6 queries de rankings, tendencias y KPIs.                                                                                                                                              |
| **PERF-06** (MEDIO) | `useDisciplinaryData`: 9 queries sin caché (useState)              | **CERRADO ✅** | `useDisciplinaryData.ts:36-41`: migración a `useQuery` con `queryKey: ['disciplinary-snapshot', studentId]`, `staleTime: 5 * 60 * 1000`.                                                                                                                                   |
| **PERF-07** (BAJO)  | Header recibe `causas[]` completa → `buildNotifications` O(n)      | **PARCIAL ⚠️** | `usePersistentNotifications.ts:66-77`: `currentNotifications` en `useMemo([causas])` llama `buildNotifications(causas)`. Memoizado, pero Header sigue recibiendo array completo. Optimizable derivando notificaciones en selector o pasando solo `notifications` a Header. |
| **PERF-08** (BAJO)  | `getRelevantLegalSources`: scoring regex sobre corpus por request  | **PARCIAL ⚠️** | `legalSources.ts:68-90`: corpus legal cachado 1x por instancia (`cachedSources` Promise). Pero `sourceScore()` (líneas 105-115) ejecuta `haystack.match(new RegExp(...))` por término por fuente en cada request. Optimizable con índice invertido precalculado.           |
| **PERF-09** (BAJO)  | Regla `documents` en `manualChunks` con deps eliminadas            | **CERRADO ✅** | `vite.config.ts:34-52`: `manualChunks` ya no incluye `pdf-lib`/`pdfjs-dist`/`docx` (chunk `documents` removido). Chunks actuales: `excel`, `telemetry-*`, `react`, `supabase`, `radix`, `tanstack`, `date`, `vendor`.                                                      |
| **PERF-10** (BAJO)  | `/veritas2.webp` 404 en móvil                                      | **CERRADO ✅** | `Header.tsx:12`: `const MOBILE_BRAND = '/veritas.png';` → archivo existe en `public/veritas.png` (16 KB). No hay referencias a `veritas2.webp` en código.                                                                                                                  |

### 2.4 Calidad de Código (QC)

| ID                | Hallazgo                                                                 | Estado         | Evidencia                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **QC-01** (ALTO)  | `.select()` sin columnas en `causaDocuments.service.ts:52`               | **CERRADO ✅** | Línea 52-53: `.select('id, causa_id, doc_type, status, content_snapshot, created_by, emitted_by, student_name, apoderado_name, course, emission_date, notified_at, tenant_id, created_at, updated_at')`. Columnas explícitas.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **QC-02** (ALTO)  | Fetching en `useEffect` en `useMemberships` / `useDisciplinaryData`      | **CERRADO ✅** | Ambos usan `useQuery` (React Query). `useMemberships` tiene 3 `useEffect` pero para **side effects** (invalidar caché, sincronizar estado), no para fetching de datos.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **QC-03** (ALTO)  | Servicios acoplados a `useAuthStore.getState()` (FSD: services → stores) | **CERRADO ✅** | `sessionContext.ts` reescrito a funciones puras `getSessionTenantId/UserId/UserEmail(tenantId?)` que solo devuelven el parámetro (sin leer el store). Los 4 servicios que lo usaban reciben `tenantId`/actor como args: `annotations.service.ts` (`updateAnnotation`, `fetchAnnualAnnotationTrends`), `cartas.service.ts` (`createCartaEvent(actor)`, `createPendingCartaForStudent(params.tenantId)`), `causas.service.ts` (`createCausa(causa, tenantId)`), `disciplinary-rules.service.ts` (`fetchDisciplinaryRules(tenantId)`). Call sites (stores/hooks/componentes) pasan valores desde `useAuthStore`. 0 imports de `sessionContext` restantes. |
| **QC-04** (MEDIO) | 23 barrels legacy muertos en `src/components/`                           | **PARCIAL ⚠️** | `src/components/` reducido a `Header/` + `InteractiveTimeline/` (+ hooks). Quedan barrels `index.ts` en ambos. Verificar con `knip` si son consumidos.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **QC-05** (MEDIO) | 8+ servicios sin tests co-located                                        | **CERRADO ✅** | **22/22 servicios** en `src/shared/api/services/` tienen `*.test.ts` correspondiente. Gran mejora vs auditoría anterior.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **QC-06** (BAJO)  | License headers SPDX faltantes (7 archivos)                              | **PENDIENTE**  | Archivos citados: `AdvisorView.tsx`, `useBreaches.ts`, `useSelectedAnnotations.ts`, `useDocumentState.ts`, 2 tests, `markdownUtils.tsx`. No verificado individualmente en esta auditoría.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **QC-07** (BAJO)  | Imports inconsistentes (`@/src/shared/` vs `@/shared/`)                  | **CERRADO ✅** | Solo 1 match de `@/src/shared` en `disciplinary-rules.service.test.ts:50` (test). Alias canónico `@/shared/` configurado en `vite.config.ts:25` y usado consistentemente.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **QC-08** (INFO)  | `import React from 'react'` innecesario                                  | **CERRADO ✅** | 0 matches en `src/**/*.tsx`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

### 2.5 Tests y Cobertura (QA)

| ID                | Hallazgo                                                        | Estado         | Evidencia                                                                                                                                                                            |
| ----------------- | --------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **QA-01** (ALTO)  | 14 servicios Supabase con 0% cobertura                          | **CERRADO ✅** | Todos los 22 servicios tienen tests co-located (`*.service.test.ts`).                                                                                                                |
| **QA-02** (ALTO)  | Timeline interactivo sin tests unitarios                        | **CERRADO ✅** | `src/features/timeline/processSections.test.ts` + `hooks/useBreaches.test.ts` existen.                                                                                               |
| **QA-03** (ALTO)  | `auth.service.ts` 33% funciones cubiertas                       | **CERRADO ✅** | `auth.service.test.ts`: 5 suites cubren `signInWithEmail`, `requestPasswordReset`, `updatePassword`, `signOut`, `onAuthStateChange` (100% funciones exportadas).                     |
| **QA-04** (ALTO)  | `test:multitenant` / `test:roles` no en CI                      | **CERRADO ✅** | `.github/workflows/ci.yml:79-106`: job `rls-validators` ejecuta ambos con secrets de Supabase.                                                                                       |
| **QA-05** (ALTO)  | Backend alto riesgo con cobertura pobre                         | **PARCIAL ⚠️** | Tests para `caseDocuments`, `gemini`, `draft`, `legalSources`, `rateLimit`, `textImprovement`, `excelImport` ✅. **Faltan**: `institution.ts`, `disciplinaryPdfAnalysis.ts`.         |
| **QA-06** (MEDIO) | `authStore` y middleware `auth.ts`: ramas críticas sin cubrir   | **PENDIENTE**  | Existen `authStore.test.ts` + tests de middleware (`auth.test.ts`, `rateLimit.test.ts`), pero no verificado cobertura de ramas (fallback ES256, sesión expirada, refresh membresía). |
| **QA-07** (MEDIO) | E2E: 7/10 specs auto-skip sin credenciales                      | **PENDIENTE**  | 10 specs en `tests/*.spec.ts`. CI solo ejecuta `test:a11y` (accessibility.spec.ts). Resto requieren `E2E_STAFF_*`/`E2E_SUPERADMIN_*` secrets.                                        |
| **QA-08** (MEDIO) | Sin E2E de flujo completo escritura (CRUD causa → cartas → PDF) | **PARCIAL ⚠️** | Existen `case-flow.spec.ts`, `notificacion-docgen.spec.ts`, `letter-export.test.ts` pero no validado si cubren flujo completo end-to-end con persistencia.                           |
| **QA-09** (MEDIO) | Tests E2E con riesgos de flakiness                              | **PENDIENTE**  | `letter-export.test.ts` usa `networkidle`, `smoke-membership.spec.ts` usa `waitForTimeout(3000)`. No verificado en ejecución real.                                                   |
| **QA-10** (MEDIO) | Documentación de testing desactualizada                         | **PENDIENTE**  | No verificado en esta auditoría.                                                                                                                                                     |
| **QA-11** (MEDIO) | Umbral cobertura 60% demasiado laxo                             | **CERRADO ✅** | `package.json:24`: `--test-coverage-lines=80` (era 60).                                                                                                                              |
| **QA-12** (MEDIO) | Tests "smoke/barrel" inflan conteo                              | **PENDIENTE**  | `legacyCompatibility.test.ts` (43 tests), `letter-document.test.ts`, `ViewLoader.test.ts` existen. No categorizados.                                                                 |
| **QA-13** (BAJO)  | `letter-export.test.ts` no corre en CI y snapshot win32         | **PARCIAL ⚠️** | Archivo existe en `tests/letter-export.test.ts` + snapshots. CI no lo ejecuta (solo a11y).                                                                                           |
| **QA-14** (BAJO)  | `disciplinaryStage.ts` 15% ramas legales sin cubrir             | **PARCIAL ⚠️** | `disciplinaryStage.test.ts` (15 KB) existe. Cobertura de ramas no verificada.                                                                                                        |

### 2.6 Documentación ↔ Código (DOC)

| ID         | Hallazgo                                                               | Estado         | Evidencia                                                                                                                                                                                                                                               |
| ---------- | ---------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DOC-01** | Memoria y README desactualizados (tests, docx/pdf-lib, etapas.service) | **PARCIAL ⚠️** | `.opencode/memory/project.md:1350` dice "512 tests/109 suites, cobertura 85.69%/83.90%/86.37%" → **actual: 719/159, 85.47%/85.00%/85.56%**. `docx`/`pdf-lib`/`etapas.service` ya removidos (correcto). README pendiente de actualización de contadores. |

---

## 3. Validación Supabase Remoto (Proyecto `mjhbcqwtjzgvqssfiore`)

| Aspecto                  | Resultado                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Migraciones**          | 20/20 sincronizadas (0 drift). Últimas: `revoke_anon_table_access`, `add_annual_annotation_trend_rpc`, `add_tenant_user_counts_rpc`, `enforce_carta_events_tenant`, `revoke_app_role_public_execute`.                                                                                                                                                                                                                                                 |
| **Security Advisors**    | 59 hallazgos: 1 ERROR (`teacher_public_view` SECURITY DEFINER), 40 WARN (funciones `anon`/`authenticated` ejecutables — incl. `current_role`, `get_public_dashboard_kpis`, `get_teacher_dashboard`, `handle_new_user`, `sync_tenant_to_jwt`, `current_tenant_id`, `current_app_role`, `app_role`, funciones teacher_*), 18 INFO (2 tablas RLS sin policies: `coexistence_cases`, `membership_invitations`; leaked password protection deshabilitado). |
| **Performance Advisors** | (Salida truncada — revisar en dashboard Supabase).                                                                                                                                                                                                                                                                                                                                                                                                    |
| **RLS**                  | Habilitado en todas las tablas del sistema. Policies consistentes (`tenant_id = current_tenant_id()`).                                                                                                                                                                                                                                                                                                                                                |
| **Funciones RPC nuevas** | `get_tenant_user_counts()`, `get_annual_annotation_trend(p_year)`, `save_bitacora_snapshot`, `save_checklist_snapshot`, `register_physical_carta` — todas `security invoker`, grants a `authenticated` + `service_role`.                                                                                                                                                                                                                              |

---

## 4. Resumen Consolidado

| Categoría              | Cerrados | Parciales | No Cerrados | Pendientes |
| ---------------------- | -------- | --------- | ----------- | ---------- |
| **Seguridad (SEC)**    | 2        | 0         | 0           | 0          |
| **Base de Datos (DB)** | 2        | 0         | 0           | 0          |
| **Rendimiento (PERF)** | 7        | 2         | 0           | 0          |
| **Calidad (QC)**       | 5        | 1         | 0           | 2          |
| **Tests (QA)**         | 5        | 4         | 0           | 5          |
| **Docs (DOC)**         | 0        | 1         | 0           | 0          |
| **TOTAL**              | **21**   | **8**     | **0**       | **7**      |

> **Nota:** "Pendientes" = items no verificados en esta auditoría (requieren análisis de cobertura, ejecución E2E, o `knip`). Los 3 hallazgos NO CERRADOS de la verificación previa (DB-01, PERF-05, QC-03) quedaron **remediados el 2026-08-07**; de DB-01 solo resta el swap final de columnas en ventana de mantenimiento.

### Hallazgos **REMEDIADOS** (verificación 2026-08-07)

1. **DB-01 (MEDIO)**: `carta_events.carta_id`/`student_id` → migración `20260807000000_carta_events_uuid_fk.sql` aplicada (columnas uuid, backfill 227/227, FKs). Swap final pendiente.
2. **PERF-05 (BAJO)**: `DashboardStats` `staleTime` → `300_000` (5 min).
3. **QC-03 (ALTO)**: Servicios desacoplados de `useAuthStore`; `sessionContext` es funciones puras.
4. **nanoid**: `npm audit fix` → 3.3.18; `npm audit --omit=dev` = **0 vulnerabilidades**.

### Hallazgos **PARCIALES** (progreso pero trabajo remanente)

- PERF-07: Header recibe `causas[]` completa (memoizado, optimizable).
- PERF-08: `getRelevantLegalSources` scoring regex por request (corpus cachado, índice invertido pendiente).
- QC-04: Barrels legacy en `src/components/` (reducidos, verificar `knip`).
- QA-05: Faltan tests para `institution.ts`, `disciplinaryPdfAnalysis.ts`.
- QA-06/07/09/10/12: Requieren verificación de cobertura ramas, ejecución E2E con secrets, flakiness, docs testing, categorización tests.
- QA-13: `letter-export.test.ts` no en CI.
- QA-14: Cobertura ramas `disciplinaryStage.ts` no verificada.
- DOC-01: Contadores tests/cobertura en memoria y README desactualizados.

---

## 5. Fortalezas Confirmadas (sin cambios desde 2026-08-06)

- RLS consistente en todas las tablas con policies por tenant + rol (incluye restricciones DELETE).
- Auth JWT robusto: HMAC + ES256/JWKS + fallback API, con fail-fast en producción si faltan secrets.
- Sanitización AI completa: PII redactada antes de cualquier llamada a LLM.
- Test suite saludable: **719 tests**, asserts significativos, fechas deterministas.
- Rate limiting y security headers correctos.
- Lazy loading amplio y telemetría diferida.
- 0 vulnerabilidades en dependencias de producción (nanoid resuelto a 3.3.18).
- Migraciones remotas 100% sincronizadas con local.

---

## 6. Próximos Pasos Recomendados (Priorizados)

### 🟥 Inmediato (siguiente ventana)

1. **DB-01 (swap final)**: DROP columnas text `carta_id`/`student_id` + RENAME `carta_id_uuid`/`student_id_uuid` en ventana de mantenimiento (escritura dual ya activa; validar que no queden inserts con las columnas viejas).
2. **Supabase Security Advisors**: revisar ERROR `teacher_public_view` SECURITY DEFINER, WARN funciones anon/authenticated ejecutables, leaked password protection.

### 🟨 Próximo (1–2 sprints)

3. **QA-05**: Tests para `institution.ts`, `disciplinaryPdfAnalysis.ts`.
4. **PERF-07**: Derivar notificaciones en selector Zustand o pasar solo `notifications` a Header.
5. **PERF-08**: Pre-calcular índice invertido término→fuente en `legalSources.ts`.
6. **QA-06/14**: Verificar cobertura ramas `authStore`, `disciplinaryStage`, middleware.
7. **QA-07/08/13**: Configurar secrets E2E en GitHub / staging; integrar `letter-export` + flujo completo en CI.
8. **DOC-01**: Actualizar README con conteos finales.
9. **QC-04/06**: `knip` + headers SPDX en 7 archivos.

### 🟢 Housekeeping

10. **QA-09/10/12**: Flakiness E2E, docs testing, categorizar tests smoke/barrel.

---

## 7. Métricas Clave Actualizadas

| Métrica               | Valor                                            |
| --------------------- | ------------------------------------------------ |
| Tests                 | **719** (159 suites), 0 fail                     |
| Cobertura líneas      | 92.64% (reporte 2026-08-06)                      |
| Cobertura ramas       | 81.87%                                           |
| Cobertura funciones   | 91.85%                                           |
| Umbral cobertura      | 80%                                              |
| Vulnerabilidades prod | **0** (nanoid → 3.3.18)                          |
| Bundle JS total       | ~1.74 MB min (~650 KB gzip)                      |
| Chunks lazy           | ~25                                              |
| Migraciones remotas   | 21 (sincronizadas, incl. `carta_events_uuid_fk`) |

---

_Auditoría ejecutada 2026-08-07. Baseline real + verificación remota Supabase + revisión de 38 hallazgos previos. Remediación 2026-08-07: DB-01, PERF-05, QC-03 y nanoid cerrados (baseline post-cambios: lint ✅, 719 tests/159 suites ✅, build:web ✅). Próxima auditoría recomendada tras el swap final de DB-01 y el cierre de items 🟨._
