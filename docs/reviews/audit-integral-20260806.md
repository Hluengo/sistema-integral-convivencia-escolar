# Auditoría Integral — Sistema Integral de Convivencia Escolar

> **Fecha:** 2026-08-06
> **Rama:** `pr/test-lockfile-and-e2e-fix` (3 commits adelante de origin)
> **Modo:** Diagnóstico read-only — no se modificó código
> **Alcance:** Baseline, seguridad, Supabase/DB, rendimiento, calidad de código, tests/cobertura, consistencia docs↔código

---

## 1. Resumen Ejecutivo

| Área                              | Estado General    | Hallazgos                   |
| --------------------------------- | ----------------- | --------------------------- |
| Baseline (lint/tests/build/audit) | ✅ Saludable      | 0 bloqueantes               |
| Seguridad                         | ✅ Sólida         | 1 medio, 1 bajo             |
| Supabase/DB                       | ✅ Sólida         | 2 medios                    |
| Rendimiento                       | ✅ Bueno          | 0 altos, 4 medios, 6 bajos  |
| Calidad de código                 | ⚠️ Deuda media    | 3 altos, 2 medios, 3 bajos  |
| Tests/Cobertura                   | ⚠️ Lagunas        | 5 altos, 7 medios, 2 bajos  |
| Docs ↔ Código                     | ❌ Desincronizada | Contradicciones confirmadas |

**Total: 0 CRÍTICO · 8 ALTO · 16 MEDIO · 14 BAJO**

**Lo más importante:** la app está en **buen estado de salud general** — 449 tests pasando, 0 vulnerabilidades, RLS consistente, auth JWT robusto, sanitización AI correcta, build limpio. Los problemas están concentrados en **cobertura de tests de la capa de servicios** (el corazón del dominio de cartas/anotaciones tiene 0% de cobertura), **deuda de barrels legacy** y **documentación desactualizada**.

---

## 2. Baseline

| Verificación           | Resultado | Notas                                                           |
| ---------------------- | --------- | --------------------------------------------------------------- |
| `npm run lint`         | ✅        | ESLint + `tsc --noEmit` limpios                                 |
| `npm run test`         | ✅        | **449 tests / 89 suites / 0 fail / 0 skip**                     |
| `npm run build:web`    | ✅        | 13.94s, ~25 chunks lazy correctos                               |
| `npm audit --omit=dev` | ✅        | **0 vulnerabilidades**                                          |
| `npm run knip`         | ⚠️        | 24 exports sin usar, 3 devDeps sin usar, 9 archivos sin usar    |
| Working tree           | ✅        | Limpio (el diff pendiente fue commitado)                        |
| Dual entry point       | ✅        | 13 rutas idénticas en `server/index.ts` y `server/api/index.ts` |

### Knip — código muerto detectado

- **9 archivos sin usar:** `TimelineHeader.tsx`, `TimelineTabPanels.tsx`, `TimelineTabs.tsx`, `MetricCard.tsx`, `ShortcutsModal.tsx`, `Sidebar.tsx`, `SidebarUserMenu.tsx`, `TemplateEditor.tsx`, `Toast.tsx`
- **3 devDeps sin usar:** `@tailwindcss/language-server`, `typescript-language-server`, `vscode-langservers-extracted`
- **24 exports sin usar:** destacan `VIEW_PATHS` (routing.ts), 6 skeletons en `Skeleton.tsx`, `buildBitacoraEntryPayload`/`buildChecklistItemPayload` (re-exportados de otro lugar), `LegendPill`/`MonthlyBars`, `CausaDocumentType`

---

## 3. Seguridad (auditada directamente)

### Verificado sin hallazgos

- **Service role key:** solo en `server/` y `.env.example`, **nunca en `src/`** (2 matches en `src/` son solo strings de tests de migraciones). ✅
- **Sanitización AI:** `redactSensitiveForAI()` y `sanitizeForAI()` aplicados en **todos** los flujos AI: `advisor.ts`, `audit.ts`, `draft.ts`, `improve.ts`. Redacta RUT, correo, teléfono, nombres rotulados y patrones de prompt injection. ✅
- **Rate limiting:** rutas AI usan `rateLimit` por `user.sub` (fallback IP) + `checkRateLimitAsync` con Redis/Upstash en serverless. ✅
- **Security headers:** `vercel.json` con CSP restrictivo (script-src 'self', connect-src a Supabase/PostHog/Sentry), HSTS, X-Frame-Options DENY, nosniff, Permissions-Policy. ✅
- **Storage:** buckets `institution-assets` e `institution-documents` con `public = false` y file_size_limit. ✅
- **CORS:** solo orígenes de `ALLOWED_ORIGINS`, credentials solo si hay allowlist. ✅
- **Body limit:** `express.json({ limit: '100kb' })`. ✅
- **`/api/auth-debug`:** deshabilitado en producción (404). ✅

### SEC-01 — MEDIO — `GRANT ALL ON TABLE ... TO anon` en 57 objetos del baseline

- **Archivo:** `supabase/migrations/00000_remote_schema_baseline.sql` (líneas 3848–3993+)
- **Descripción:** El baseline otorga `GRANT ALL` al rol `anon` sobre **todas** las tablas del sistema (students, profiles, causas, cartas_disciplinarias, inspectorate_records, bitacora_entries, checklist_items, document_analyses, etapas_disciplinarias). El RLS está habilitado y no hay policies para `anon`, por lo que el aislamiento **se mantiene** — pero es una **defensa en profundidad débil**: si en el futuro alguien agrega una policy sin `TO authenticated` o deshabilita RLS temporalmente, `anon` tendría acceso total.
- **Impacto:** Riesgo residual de exposición si se desactiva RLS o se crea policy sin restringir rol.
- **Remediación:** Nueva migración con `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;` (mantener solo `GRANT USAGE ON SCHEMA public` y los grants de funciones públicas necesarias, ej. `get_public_*`). Validar con `test:roles`/`test:multitenant` antes y después.

### SEC-02 — BAJO — Revisar grants de funciones a `anon`

- **Archivo:** `supabase/migrations/00000_remote_schema_baseline.sql` (líneas 3544+)
- **Descripción:** `GRANT ALL ON FUNCTION ... TO anon` se aplica a funciones internas como `app_role()`, `clean_old_logs()`, `count_affected_tests()`, etc. Algunas son internas y no deberían ser invocables por anon.
- **Impacto:** Bajo — las funciones SECURITY DEFINER ya tienen `search_path` fijo y validación de rol, pero `app_role()` expuesta a anon es innecesaria.
- **Remediación:** En la misma migración, `REVOKE ALL ON FUNCTION public.app_role() FROM anon;` y revisar el resto de la lista.

---

## 4. Supabase / Base de Datos (auditada directamente)

### Verificado sin hallazgos

- **RLS habilitado** en todas las tablas del sistema (30+ tablas con `ENABLE ROW LEVEL SECURITY`). ✅
- **Mapa de policies consistente:** todas las tablas de datos tienen SELECT/INSERT/UPDATE/DELETE con `tenant_id = current_tenant_id()`, con restricciones de rol en DELETE/UPDATE para tablas sensibles (causas, students, courses requieren admin/direccion para DELETE). ✅
- **`profiles`:** policies por rol (`superadmin`/admin/direccion), self-select, insert self. ✅
- **Índices:** migración `20260803004959` agrega índices compuestos para los patrones de lectura (tenant, student, fechas, estado). ✅
- **RPCs snapshot:** `save_bitacora_snapshot`/`save_checklist_snapshot` con `security invoker`, tenant resuelto en DB, `EXECUTE` solo a `authenticated` + `service_role`. ✅
- **Triggers:** `sync_tenant_to_jwt()` y `sync_convivencia_membership_from_profile()` presentes en baseline. ✅
- **Buckets de storage:** privados con RLS por carpeta `{tenant_id}/...`. ✅

### DB-01 — MEDIO — `carta_events.carta_id` y `student_id` como TEXT en vez de UUID

- **Archivo:** `supabase/migrations/00000_remote_schema_baseline.sql` (líneas 1585–1586)
- **Descripción:** `carta_events.carta_id` es `text NOT NULL` y `carta_events.student_id` es `text NOT NULL`, mientras que `cartas_disciplinarias.id` y `students.id` son UUID. El código compensa con cast (`carta.id::text`, `s.id::text`). Problema ya declarado en memoria §12.2.
- **Impacto:** Inconsistencia de tipos, casts implícitos en queries (líneas 323-324, 416-417), riesgo de errores silenciosos y pobre indexing.
- **Remediación:** Migración incremental que convierta a UUID manteniendo datos (validar FKs de cartas existentes primero). Prioridad media — riesgo de data loss si no se planifica el backfill.

### DB-02 — BAJO — `tenant_id` nullable en `carta_events` (ya declarado en memoria)

- **Descripción:** Si `tenant_id` puede ser NULL, las policies `tenant_id = current_tenant_id()` hacen invisibles esas filas. Confirmar NOT NULL y backfill si hay filas huérfanas.
- **Remediación:** Migración con `ALTER TABLE carta_events ALTER COLUMN tenant_id SET NOT NULL;` tras backfill.

---

## 5. Rendimiento (agente performance-engineer)

**Veredicto general:** arquitectura bien cimentada (25+ chunks lazy, telemetría diferida con `requestIdleCallback`, selectores primitivos, autosave debounced, `pdfjs-dist` solo servidor). **Cero hallazgos ALTO.** Total bundle JS ≈ 1,74 MB min (~650 KB gzip); carga crítica entry ≈ 677 KB min.

### PERF-01 — MEDIO — Sentry 518 KB en chunk lazy

`src/lib/sentry.ts:13` — `browserTracingIntegration()` + `tracesSampleRate: 1.0` en dev. Condicionar tracing a `import.meta.env.PROD && SENTRY_DSN`.

### PERF-02 — MEDIO — N+1 en `GET /api/platform/tenants`

`server/api/routes/platform.ts:152-160` — itera todos los tenants y ejecuta `profiles.select('user_id', {count:'exact', head:true})` por cada uno. Con 200 colegios = 201 queries. Usar RPC `get_tenant_user_counts()` con `GROUP BY tenant_id`.

### PERF-03 — MEDIO — `fetchCartaTableStates` sin paginación y con `.in()` de todos los ids

`src/shared/api/services/cartas.service.ts:197-244` — trae todas las cartas y todos los `carta_events` (dos queries secuenciales). Con historial largo, payload O(cartas+eventos) y el `.in()` puede exceder el límite de PostgreSQL. Usar RPC agregada o limitar al año escolar + `limit(500)` + `Promise.all`.

### PERF-04 — MEDIO — `fetchAnnualAnnotationTrends` agrega todo el año en cliente

`src/shared/api/services/annotations.service.ts:116-149` — descarga todas las `inspectorate_records` del año (5.000+ filas) y agrega por mes en cliente. Crear RPC `get_annual_annotation_trend(year)` que devuelva solo 10–12 filas.

### PERF-05 — BAJO — Dashboard: 6 queries con staleTime 30s + `refetchOnMount: true`

Subir staleTime a 5 min para rankings y tendencias (la invalidación post-mutación ya existe).

### PERF-06 — MEDIO — Snapshot disciplinario de 9 queries sin caché

`src/features/anotaciones/AnotacionesStudentDetailModal/hooks/useDisciplinaryData.ts:31-67` — usa `useState` en vez de React Query; cada apertura del modal re-ejecuta 9 queries. Migrar a `useQuery` con `['disciplinary-snapshot', studentId]` y staleTime 5 min.

### PERF-07 — BAJO — Header recibe `causas` completa → `buildNotifications` O(n) por cambio

Derivar notificaciones con `useMemo` en App o pasar solo `notifications` a Header.

### PERF-08 — BAJO — `getRelevantLegalSources`: scoring regex sobre corpus por request

Pre-calcular índice de términos → fuentes en caché.

### PERF-09 — BAJO — Regla `documents` en `manualChunks` con deps ya eliminadas

`vite.config.ts:49-51` — agrupa `pdf-lib`/`pdfjs-dist`/`docx` que ya no se importan en cliente. Limpiar y bajar `chunkSizeWarningLimit` a ~550 KB.

### PERF-10 — BAJO — `/veritas2.webp` inexistente (404 en móvil)

`src/widgets/header/Header.tsx:12,46` — el archivo no existe en `public/`. Usar `src/assets/veritas.png` o eliminar.

---

## 6. Calidad de Código (agente reviewer)

### QC-01 — ALTO — `.select()` sin columnas (SELECT * implícito)

- **Archivo:** `src/shared/api/services/causaDocuments.service.ts:52` (`createPendingCausaDocument`)
- **Nota:** el commit `c1579df` corrigió `fetchCausaDocuments` pero **no** este `.select()`.
- **Remediación:** `.select('id, causa_id, doc_type, status, content_snapshot, created_by, emitted_by, student_name, apoderado_name, course, emission_date, notified_at, tenant_id, created_at, updated_at')`.

### QC-02 — ALTO — Fetching en `useEffect` en vez de React Query (Regla 19)

- **Archivos:** `src/shared/api/hooks/useMemberships.ts:37`, `src/features/anotaciones/AnotacionesStudentDetailModal/hooks/useDisciplinaryData.ts:31-60`
- **Remediación:** Migrar a `useQuery` con `enabled: !!userId`. Es el mismo patrón que PERF-06.

### QC-03 — ALTO — Servicios acoplados a `useAuthStore` (FSD: services → stores)

- **Archivos:** `annotations.service.ts:23`, `cartas.service.ts:15`, `causas.service.ts:6`, `disciplinary-rules.service.ts:4` usan `useAuthStore.getState()`.
- **Impacto:** dificulta tests aislados de servicios (requieren inicializar store).
- **Remediación:** pasar `tenantId`/`userId` como argumentos desde los hooks, o helper central `getTenantFromStore()`.

### QC-04 — MEDIO — 23 barrels legacy muertos en `src/components/`

- Solo 6 de 29 son consumidos (`MainContent`, `CommandPalette`, `LoginPage`, `NewCausaModal`, `DashboardStats`, `AiAdvisor`). Los demás (`Header/` completo, `InteractiveTimeline/`, `Sidebar`, `Toast`, `TemplateEditor`, etc.) son código muerto.
- **Remediación:** verificar con knip y eliminar los muertos.

### QC-05 — MEDIO — 8+ servicios sin tests co-located

- `cartas.service.ts` (~25 exports), `annotations.service.ts`, `causas.service.ts`, `reports.service.ts`, etc. (ver QA-01).

### QC-06 — BAJO — License headers SPDX faltantes

- 7 archivos sin header: `AdvisorView.tsx`, `useBreaches.ts`, `useSelectedAnnotations.ts`, `useDocumentState.ts`, 2 tests, `markdownUtils.tsx`.

### QC-07 — BAJO — Imports inconsistentes (`@/src/shared/` vs relativos)

- Unificar a alias `@/shared/...`.

### QC-08 — INFO — `import React from 'react'` innecesario

- `src/lib/markdownUtils.tsx:2` — con `react-jsx` no se necesita.

---

## 7. Tests y Cobertura (agente qa-tester)

**Cobertura real: 85.47% líneas / 85.00% branches / 85.56% funciones** (449 tests / 89 suites / 0 fail). El umbral configurado es 60%.

### QA-01 — ALTO — 14 servicios Supabase con 0% de cobertura efectiva

- `cartas.service.ts` (582 líneas), `annotations.service.ts` (245), `causas.service.ts`, `admin`, `causaDocuments`, `courses`, `disciplinary-rules`, `disciplinary-storage`, `documentTemplates`, `institution`, `notifications`, `platform`, `public-dashboard`, `reports`, `student-history`.
- **Impacto:** el corazón del dominio (cartas, workflow, anotaciones) no tiene red de seguridad.
- **Acción:** tests con supabase mockeado (patrón de `bitacora.service.test.ts`), priorizando `cartas.service.ts` y `annotations.service.ts`.

### QA-02 — ALTO — Timeline interactivo de causas sin un solo test unitario

- `src/features/timeline/` (20 archivos, ~1.500 líneas) — bitácora + checklist + ruta + IA.
- **Acción:** testear `processSections.ts` y `useBreaches.ts` (lógica pura) primero.

### QA-03 — ALTO — `auth.service.ts` con 33% de funciones cubiertas

- `signInWithEmail`, `requestPasswordReset`, `updatePassword`, `signOut` jamás se ejecutan en tests.

### QA-04 — ALTO — `test:multitenant` y `test:roles` no corren en CI

- Son los únicos validadores reales de RLS/aislamiento, pero CI solo corre unit tests + a11y.

### QA-05 — ALTO — Backend de alto riesgo con cobertura pobre

- `caseDocuments.ts` (36.7%/11.1%), `institution.ts` (46.6%/12.2%), `disciplinaryPdfAnalysis.ts` (47.2%/48.6%), `gemini.ts` (43.75%/20%).

### QA-06 — MEDIO — `authStore` y middleware `auth.ts`: ramas críticas sin cubrir

- Fallback ES256, sesión expirada, refresh de membresía (QA-06).

### QA-07 — MEDIO — E2E: 7 de 10 specs se auto-skip sin credenciales; CI solo corre a11y

- Configurar secrets `E2E_STAFF_*`/`E2E_SUPERADMIN_*` en GitHub o staging.

### QA-08 — MEDIO — Sin E2E de flujo completo de escritura (CRUD causa → cartas → PDF)

- Los E2E existentes son mayormente de lectura.

### QA-09 — MEDIO — Tests E2E con riesgos de flakiness

- `networkidle` en letter-export, `waitForTimeout(3000)` fijos en smoke-membership.

### QA-10 — MEDIO — Documentación de testing desactualizada (ver §8)

### QA-11 — MEDIO — Umbral de cobertura (60%) demasiado laxo

- Subir a 80% para proteger el valor.

### QA-12 — MEDIO — Tests "smoke/barrel" inflan el conteo

- `legacyCompatibility.test.ts` (43 tests), `letter-document.test.ts`, `ViewLoader.test.ts` — documentar como categoría "compatibilidad".

### QA-13 — BAJO — `letter-export.test.ts` no corre en CI y snapshot win32

### QA-14 — BAJO — `disciplinaryStage.ts` con 15% de ramas legales sin cubrir

---

## 8. Consistencia Docs ↔ Código

### Contradicción confirmada (DOC-01) — Memoria desactualizada en §1 y §11.4

| Declaración en `.opencode/memory/project.md`               | Realidad                                                                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Stack: `docx 9.7.1`, `pdf-lib 1.17.1` para documentos      | `package.json` NO los incluye; `src/shared/lib/docx/` NO existe; README ya dice que están fuera del bundle |
| `src/shared/api/services/etapas.service.ts` existe         | NO existe                                                                                                  |
| README: "412 pruebas / 83 suites / 85.66%"                 | Real: **449 / 89 / 85.47%**                                                                                |
| README: "`docx` y `pdf-lib` ya no forman parte del bundle" | ✅ Correcto (memoria está mal, README bien)                                                                |

### Otras discrepancias menores

- `README.md` §Tests: conteo desactualizado (412→449, 83→89, 85.66→85.47).
- Memoria §11.4 dice "test:vitest y test corren en paralelo (Baja)" — verificar si sigue vigente (package.json solo usa node:test).

---

## 9. Priorización de Remediación

### 🟥 Inmediata (próximos sprints)

1. **QA-01 + QC-05:** tests para `cartas.service.ts` y `annotations.service.ts` (0% hoy) — el mayor riesgo del producto.
2. **QA-02:** tests para `src/features/timeline/` (due process = corazón legal).
3. **QC-01:** corregir `.select()` en `causaDocuments.service.ts:52`.
4. **SEC-01:** `REVOKE ALL ... FROM anon` (defensa en profundidad).
5. **QC-02:** migrar `useMemberships` y `useDisciplinaryData` a React Query.

### 🟨 Próximo (1–2 sprints)

6. **PERF-02:** RPC `get_tenant_user_counts()` (N+1 platform).
7. **PERF-03:** límites en `fetchCartaTableStates`.
8. **PERF-06:** `useQuery` para snapshot disciplinario (9 queries → 1).
9. **QC-03:** desacoplar servicios de `useAuthStore`.
10. **QC-04:** eliminar barrels legacy muertos (knip lo confirma).
11. **QA-04/QA-07:** conectar `test:multitenant`/`test:roles`/E2E al CI.
12. **DB-01/DB-02:** migración `carta_events` UUID + NOT NULL.

### 🟢 Housekeeping (rápido)

13. **DOC-01:** actualizar memoria y README (449/89/85.47%, quitar docx/pdf-lib/etapas.service).
14. **PERF-10:** fix `/veritas2.webp` 404.
15. **QC-06/07/08:** headers SPDX, imports, import React.
16. **QA-11:** subir umbral cobertura a 80%.
17. **Knip:** eliminar 9 archivos + 3 devDeps + 24 exports muertos.

---

## 10. Fortalezas Confirmadas

- **RLS consistente** en todas las tablas con policies por tenant + rol (incluye restricciones de DELETE).
- **Auth JWT robusto:** HMAC + ES256/JWKS + fallback API, con fail-fast en producción si faltan secrets.
- **Sanitización AI completa:** PII redactada antes de cualquier llamada a LLM (cumple Ley 21.809 y Circular 482).
- **Test suite saludable:** 449 tests, asserts significativos, fechas deterministas, sin no-throw vacíos.
- **Rate limiting y security headers** correctos.
- **Lazy loading** amplio y telemetría diferida.
- **0 vulnerabilidades** en dependencias de producción.

---

## 11. Métricas Clave

| Métrica                 | Valor                             |
| ----------------------- | --------------------------------- |
| Tests                   | 449 (89 suites), 0 fail           |
| Cobertura líneas        | 85.47%                            |
| Cobertura branches      | 85.00%                            |
| Cobertura funciones     | 85.56%                            |
| Vulnerabilidades (prod) | 0                                 |
| Bundle JS total         | ~1,74 MB min (~650 KB gzip)       |
| Chunks lazy             | ~25                               |
| Código muerto (knip)    | 9 archivos, 24 exports, 3 devDeps |
