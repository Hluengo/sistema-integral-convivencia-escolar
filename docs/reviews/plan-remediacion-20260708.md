# 📋 Plan de Remediación — Auditoría Integral 2026-07-08

> **Origen:** Auditoría integral read-only del 2026-07-08 (commit `1139111`).
> **Documento de referencia:** `docs/reviews/audit-integral-20260806.md` y `docs/reviews/security-review.md`.
> **Modo de ejecución:** opencode — cada tarea se asigna al agente indicado siguiendo el routing de `AGENTS.md`.

---

## ⚠️ Pre-condiciones (obligatorias antes de empezar cada tarea)

1. Leer `docs/CONSTITUTION.md`, `.opencode/memory/project.md` y `docs/architecture/` del módulo afectado (autoload del `AGENTS.md`).
2. Ejecutar SIEMPRE `npm run lint && npm run test && npm run build:web` antes de commitear (regla de la Constitución).
3. Nunca editar migraciones existentes: cada cambio de schema es una migración nueva incremental (`<timestamp>_descripcion.sql`).
4. Tras cada fase, un agente `@documentation` actualiza la memoria solo si cambió arquitectura/modelo/API/flujo (no por cambios triviales).
5. UI y documentos en español chileno; preservar license headers SPDX.

## 🔁 Secuencia de commits recomendada (cada fase commiteable aparte)

```
1. test(cartas): completar cobertura de mutaciones del workflow   (P1-T1)
2. db: migración carta_events TEXT→UUID con FK                     (P1-T2)
3. fix(api): anonimizar PII en auditoría de debido proceso         (P1-T3)
4. db: SECURITY INVOKER / salvaguardas en RPCs de ranking          (P2-T4)
5. db: revocar anon de teacher_get_instant_messages                (P2-T5)
6. feat(ui): plazos normativos desde configuración institucional   (P2-T6)
7. refactor(frontend): router declarativo + tests timeline         (P2-T7)
8. chore(devops): Upstash + https client rate limit                (P2-T8)
9. docs: sincronizar memoria y métricas                            (P3-T9)
10. chore(devops): CSP + E2E secrets en CI                         (P3-T10)
```

---

## 🟥 FASE P1 — Prioridad Inmediata (siguiente sprint)

### TAREA 1 — [QA] Completar tests de `cartas.service.ts` (el mayor riesgo del producto)

- **Agente:** `@qa-tester`
- **Archivo a modificar:** `src/shared/api/services/cartas.service.test.ts`
- **Código bajo prueba:** `src/shared/api/services/cartas.service.ts`
- **Brecha:** hoy 45.16% de funciones cubiertas. Sin cobertura de:
  - `markCartaProcessedManually` (`cartas.service.ts:316-340`)
  - `archiveCarta` (`:342-348`)
  - `annulCarta` + `updateCartaStatus` (`:350-383`)
  - `createPendingCartaForStudent` (`:430-470+`, con `source: pdf|physical|supabase`)
  - `fetchStudentDisciplinarySnapshot` (`:577-630`)
- **Cómo:** reutilizar el patrón existente en el propio test (`MockQueryBuilder` + mock de `supabase.from`/`rpc` + `installFromMock`). Asegurar determinismo con `nowDateOnly`/`getCurrentSchoolYear` mockeados.
- **Casos a cubrir:** éxito/error, `contentSnapshot` presente/ausente, `createCartaEvent` fallando, `updateCartaStatus` fallando (no debe crear evento `annulled`), y que los conteos del snapshot ignoren anotaciones de otro año escolar.
- **Criterio done:** funciones cubiertas ≥ 85%; `npm run test` verde; `npm run test:coverage` ≥ 80%.

### TAREA 2 — [DB] Migración de `carta_events` a UUID con FK

- **Agente:** `@supabase-architect`
- **Archivo nuevo:** `supabase/migrations/<timestamp>_carta_events_uuid_fk.sql`
- **Contexto:** `carta_events.carta_id` y `carta_events.student_id` son `TEXT` (`00000_remote_schema_baseline.sql:1585-1586`) sin FK, mientras `cartas_disciplinarias.id`, `cartas_disciplinarias.student_id` y `students.id` son `uuid`.
- **Pasos (migración incremental, NUNCA editar la baseline):**
  1. `ALTER TABLE` añadir columnas temporales `carta_id_uuid` y `student_id_uuid` de tipo `uuid`.
  2. Backfill con `UPDATE ... SET carta_id_uuid = carta_id::uuid WHERE carta_id ~ uuid_re` (manejar valores no convertibles: dejar `NULL` o reportar).
  3. `ALTER TABLE DROP COLUMN carta_id` / `student_id` y `RENAME` las nuevas.
  4. Añadir `FOREIGN KEY (carta_id) REFERENCES cartas_disciplinarias(id)` y `FOREIGN KEY (student_id) REFERENCES students(id)`.
  5. Índices en ambas columnas.
  6. Actualizar cualquier código TS que asuma `string` (buscar usos de `carta_id`/`student_id` de `carta_events`).
- **Criterio done:** migración aplicable idempotente; FK y tipos correctos; `npm run test` verde tras ajustar tipos.

### TAREA 3 — [SEC] Fix de PII en el flujo de auditoría (`audit.ts`)

- **Agente:** `@backend` (o `@security` para revisión)
- **Archivo:** `server/api/routes/audit.ts:33`
- **Problema:** `knownSensitiveValues = [id, infractionType, observations]` no incluye nombres de estudiantes/apoderados/participantes; `redactSensitiveForAI` deja pasar nombres en prosa libre de la bitácora a Gemini.
- **Fix:** poblar `knownSensitiveValues` con los nombres presentes en `req.body` (p. ej. `studentName`, `fatherName`, `managerName`) y los `participantes` de cada entrada de bitácora, replicando el patrón de `server/api/routes/draft.ts:230-249`.
- **Criterio done:** la descripción de bitácora con nombres propios queda anonimizada antes de enviarse a Gemini.

## 🟨 FASE P2 — Próximo (1–2 sprints)

### TAREA 4 — [SEC] Revisar los RPCs de ranking con `SECURITY DEFINER`

- **Agente:** `@supabase-architect` + `@security`
- **Archivos:** `supabase/migrations/20260804124453*.sql:18` y `20260804135422*.sql:16,53`
- **Acción:** convertir a `SECURITY INVOKER` (recomendado) o añadir asserts de `current_tenant_id()` dentro del cuerpo + tests multitenant. Verificar que no haya escalada de privilegios cruzados entre tenants.
- **Criterio done:** RPCs sin `SECURITY DEFINER` innecesario o con salvaguardas; `npm run test:multitenant` verde.

### TAREA 5 — [SEC] Revocar grant `anon` de `teacher_get_instant_messages`

- **Agente:** `@supabase-architect`
- **Archivo:** nueva migración (la baseline `00000...:3753` tiene `GRANT ALL ... TO anon`).
- **Acción:** `REVOKE ALL ON FUNCTION teacher_get_instant_messages(...) FROM anon;` y confirmar que la UI solo la usa autenticado. Misma revisión para cualquier función no tenantizada expuesta a `anon`.
- **Criterio done:** función no ejecutable por `anon`; UI autenticada sigue funcionando.

### TAREA 6 — [FRONT] Parametrizar plazos normativos en `useNotifications`

- **Agente:** `@frontend` (con validación de `@legal`)
- **Archivo:** `src/shared/lib/hooks/useNotifications.ts:32,73`
- **Acción:** reemplazar los plazos hardcodeados (10 días Aula Segura, 60 días ordinario) por consulta a la versión activa del reglamento (`institution_rule_versions`), con fallback a los valores legales actuales si no hay versión.
- **Criterio done:** los plazos se leen de la configuración del tenant, no del código.

### TAREA 7 — [FRONT] Router declarativo + tests de timeline

- **Agente:** `@frontend` + `@qa-tester` (dos sub-tareas)
- **7a.** Migrar `src/features/causas/MainContent.tsx:90-175` de los 8 condicionales `currentView ===` a un switch/map de rutas con fuente única (o router declarativo si una versión pasa `npm run security-audit`). Actualizar `docs/architecture/routing.md:62` y los ADR.
- **7b.** Añadir tests de componente para `ProcessChecklist`, `ProcesoTab`, `AttachedDocuments` y demás componentes del timeline sin cobertura.
- **Criterio done:** `MainContent` sin condicionales triples; timeline con tests de componente; lint/test verdes.

### TAREA 8 — [SEC] Rate limit distribuido efectivo (Upstash)

- **Agente:** `@devops` (config) + `@backend` (fix `fetch`→`https` en `server/api/services/rateLimit.ts:49,56`)
- **Acción:** verificar/configurar `UPSTASH_REDIS_REST_URL`/`TOKEN` en Vercel; unificar cliente Upstash al módulo `https` en el bundle serverless.
- **Criterio done:** rate limit funcional en serverless (no solo memoria).

---

## 🟢 FASE P3 — Housekeeping

### TAREA 9 — [DOC] Sincronizar memoria y métricas

- **Agente:** `@documentation`
- **Archivos:** `.opencode/memory/project.md`, `README.md`, `docs/reviews/audit-integral-20260806.md`
- **Acción:** actualizar a **719 tests / 159 suites / 92.90% líneas**; corregir `.opencode/memory/project.md:685` (la capa `components/` ya es 100% barreras retrocompatibles, no quedan componentes reales); deprecar referencias a `docx`, `pdf-lib`, `etapas.service`.
- **Criterio done:** docs consistentes con el código real, sin contradicciones.

### TAREA 10 — [SEC] Endurecer CSP y E2E en CI

- **Agente:** `@devops` + `@qa-tester`
- **Acción:** añadir `object-src 'none'` y `frame-ancestors` al CSP de `vercel.json`; configurar credenciales `E2E_STAFF_*` como secrets de CI para habilitar E2E de escritura; eliminar `waitForTimeout(3000)` y `networkidle` en `tests/`.
- **Criterio done:** E2E de escritura corre en CI; CSP más estricto sin romper funcionalidad.

---

## 📊 Resumen de hallazgos que aborda el plan

| Área      | Severidad                                              | Tarea  | Estado    |
| --------- | ------------------------------------------------------ | ------ | --------- |
| Tests     | Alto — `cartas.service` 45% funciones                  | P1-T1  | Pendiente |
| DB        | Alto — `carta_events` TEXT sin FK                      | P1-T2  | Pendiente |
| Seguridad | Medio — PII de NNA en `audit.ts`                       | P1-T3  | Pendiente |
| DB        | Alto — RPCs ranking `SECURITY DEFINER`                 | P2-T4  | Pendiente |
| DB        | Medio — grant `anon` en `teacher_get_instant_messages` | P2-T5  | Pendiente |
| Frontend  | Alto — plazos normativos hardcodeados                  | P2-T6  | Pendiente |
| Frontend  | Alto — router declarativo / MainContent                | P2-T7  | Pendiente |
| Tests     | Alto — timeline sin tests                              | P2-T7b | Pendiente |
| Seguridad | Medio — rate limit serverless (Upstash)                | P2-T8  | Pendiente |
| Docs      | Medio — memoria desactualizada                         | P3-T9  | Pendiente |
| Seguridad | Bajo — CSP + E2E CI                                    | P3-T10 | Pendiente |

---

_Plan de remediación generado a partir de la auditoría integral del 2026-07-08. Ejecutar las fases en orden (P1 → P2 → P3), con commit por tarea y validación `lint + test + build` previa a cada commit._
