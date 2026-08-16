# Runbook: Aplicación de pasos pendientes — 2026-08-16

**Estado:** COMPLETADO ✅ (2026-08-16) — P2/P3/P4/P5 ejecutadas y validadas; P1 bloqueada (pendiente confirmación inasistencias).
**Commit:** `12187cd` — `fix: cerrar auditoría integral 2026-08-15 — endurecer RLS por rol, validar tenant en generate_process_number, due process y limpieza FSD`
**Push:** `c25f7b3..12187cd master -> master`
**Deploy:** producción `gestiondecasos.vercel.app` (alias) — smoke E2E 4/4 OK
**Alcance:** Pendientes operativos de la auditoría integral 2026-08-15 (migraciones 1D/1E, resolución de 1C, documentación, commit/push/deploy).
**Rama base:** master (HEAD `c25f7b35aeb519dab192fe5ff64e6fd6930f36c8`, tag `backup/aplicacion-pendientes-20260816`)
**Proyecto Supabase:** `GestionConvivencia` (`mjhbcqwtjzgvqssfiore`)
**Contexto:** DB compartida entre `convivencia` (este repo) e `inasistencias` (otro equipo/repo). No se tocan objetos `PROPIEDAD DE INASISTENCIAS`.

## 0. Objetivo

Ejecutar los pendientes operativos de la auditoría integral 2026-08-15 respetando la convivencia multi-app en la base compartida:

1. Resolver o descarrilar la Fase 1C (`usage_events.tenant_id`, objeto COMPARTIDO).
2. Aplicar las migraciones 1D (`harden_convivencia_rls_roles`) y 1E (`fix_generate_process_number_tenant`) creadas pero sin aplicar.
3. Actualizar el ledger canónico y la memoria con los cambios aplicados.
4. (Solo con autorización explícita) commit, push y deploy en Vercel con smoke test.

Cualquier cambio de esquema que afecte objetos compartidos requiere consulta previa al equipo de inasistencias.

## 1. Línea base y rollback

```bash
git status -sb
git rev-parse HEAD
git tag --list backup/aplicacion-pendientes-20260816
```

Antes de comenzar se crea el tag local `backup/aplicacion-pendientes-20260816` (apunta a `HEAD` de master). Rollback:

```bash
git status -sb
git switch master
git reset --hard backup/aplicacion-pendientes-20260816
```

No ejecutar `reset --hard` si existen cambios del usuario que deban preservarse. Para migraciones DB el rollback es la migración inversa o restaurar el backup previo de la tabla:

- **1D** (`harden_convivencia_rls_roles`): aditiva (crea policies específicas tras `drop policy` de las genéricas). Rollback = `drop policy` de las nuevas y recrear las originales (disponibles en `00000_remote_schema_baseline.sql`).
- **1E** (`fix_generate_process_number_tenant`): `create or replace function`; rollback = restaurar la versión previa desde el baseline/git.
- **1C** (si se aplica): aditiva (`ADD COLUMN` + backfill + `SET NOT NULL`); rollback = migración inversa que vuelve la columna a `NULL` y elimina la política.

## 2. Reglas de ejecución

1. **NO hacer `git commit` ni `git push` sin autorización explícita del usuario** (cada fase termina con revisión y aprobación).
2. Después de cada paso: `npm run lint` y `npm run test`. Antes de commit (si se autoriza): `npm run build && npm run security-audit`.
3. Migraciones: **nunca modificar** migraciones existentes; crear nuevas incrementales y aplicarlas con `supabase db push --linked` al proyecto `mjhbcqwtjzgvqssfiore`.
4. No tocar objetos de inasistencias (`absences`, `tests`, `instant_messages`, `feriados_chile`, `audit_logs` ni sus policies legacy).
5. Actualizar `docs/shared-supabase/04-canonical-object-ledger.md` y `.opencode/memory/project.md` al final de cada fase que toque DB.
6. Todo el UI/textos en español chileno; preservar license headers; no romper las 5 fases del debido proceso.

## 3. Fase P1 — 1C: `usage_events.tenant_id` (objeto COMPARTIDO, BLOQUEADO)

> ⚠️ **Requiere confirmación del equipo de inasistencias** antes de tocar `usage_events`.

### 3.1 Estado verificado (2026-08-16)

| Ítem | Hallazgo |
|---|---|
| Columna `usage_events.tenant_id` en remoto | **NO existe** (error `42703` al consultarla) |
| `server/api/routes/usage.ts:71` | Ya inserta `tenant_id: authReq.tenantId ?? null` (código preexistente, no introducido por la auditoría) |
| Consecuencia | `POST /usage/events` responde **503** hoy (bug vivo: el insert falla por columna inexistente) |
| Policies actuales | `usage_events_insert_own` (WITH CHECK user_id = auth.uid()), `usage_events_select_admin` (solo admin/direccion) — sin restricción de tenant |
| `usage_events` en ledger | CANÓNICO COMPARTIDO (riesgo BAJO, monitorear) |

### 3.2 Pregunta exacta a inasistencias

> ¿El proyecto `inasistencias` inserta en `usage_events` vía service_role **sin** `tenant_id`?

Evidencia para la consulta: convivencia ya envía `tenant_id` en el insert (`usage.ts:71`) y la columna no existe en remoto, por lo que hoy ese insert falla.

### 3.3 Ramas según confirmación

| Respuesta | Acción |
|---|---|
| **No insertan sin tenant** | Crear migración nueva `<ts>_usage_events_tenant_id.sql`: `ADD COLUMN tenant_id uuid NULL` + backfill `UPDATE usage_events e SET tenant_id = p.tenant_id FROM profiles p WHERE e.user_id = p.user_id` + índice `idx_usage_events_tenant_id` + `SET NOT NULL`. Políticas: `usage_events_select_admin` agrega `tenant_id = current_tenant_id()`; `usage_events_insert_own` agrega `WITH CHECK (tenant_id = current_tenant_id())`. Aplicar con `supabase db push --linked`. |
| **Sí insertan sin tenant** | No tocar `usage_events`. Documentar el 503 como hallazgo compartido y dejar la columna pendiente de coordinación multi-equipo. |

**Validación (si se aplica):** `npm run test:multitenant` (`scripts/validate-multitenant.mjs`); verificar con SQL que no hay NULLs tras backfill; probar `POST /usage/events` autenticado → 200.

## 4. Fase P2 — Aplicar migración 1D (RLS por rol)

| Paso | Archivo | Acción |
|---|---|---|
| 1 | `supabase/migrations/20260815170000_harden_convivencia_rls_roles.sql` | Aplicar con `supabase db push --linked` |

Contenido aplicado (5 bloques, solo tablas CONVIVENCIA):

1. `disciplinary_processes` — UPDATE/DELETE solo `admin`/`direccion`/`superadmin` (SELECT/INSERT tenant-only).
2. `disciplinary_rules` — INSERT/UPDATE/DELETE solo `admin`/`direccion`/`superadmin` (SELECT tenant-only).
3. `document_analyses` — DELETE solo `admin`/`direccion`/`superadmin` (SELECT/INSERT/UPDATE tenant-only).
4. `bitacora_entries`, `checklist_items`, `cartas_disciplinarias`, `etapas_disciplinarias` — DELETE solo `admin`/`direccion`/`superadmin`; INSERT/UPDATE conservan tenant-only (desviación documentada en el archivo: restringir escritura rompería la edición de bitácora para teacher/staff/inspector).
5. `carta_events` — append-only, sin cambio (documentado).

**Validación (ejecutada 2026-08-16):**

```bash
supabase migration list --linked   # ✅ 20260815170000 y 20260815173000 con columna remota poblada
npm run test:roles                 # ✅ 9/9 roles OK (admin/direccion 200, resto 403 en admin+institution)
```

Revisión manual ejecutada (staff `00000000-0000-0000-0000-000000000001`):
- **DELETE bitácora (staff)** → bloqueado por RLS (PostgREST 204 sin filas afectadas; fila intacta) ✅
- **INSERT bitácora (staff)** → OK (desviación documentada: tenant-only) ✅
- **DELETE bitácora (service_role)** → OK ✅

## 5. Fase P3 — Aplicar migración 1E (`generate_process_number`)

| Paso | Archivo | Acción |
|---|---|---|
| 1 | `supabase/migrations/20260815173000_fix_generate_process_number_tenant.sql` | Aplicar con `supabase db push --linked` (misma ventana que P2) |

Contenido aplicado:

- `generate_process_number(p_tenant_id uuid)` valida el tenant: si hay `auth.uid()`, el tenant efectivo es `current_tenant_id()` y `p_tenant_id` debe coincidir (si no → `42501`); si no hay usuario (service_role desde `confirm_disciplinary_process_atomic`), usa `p_tenant_id` tal como hoy.
- `revoke all` + `grant execute` solo a `authenticated` y `service_role`.
- Concurrencia: `COUNT(*) + 1` puede colisionar bajo escrituras simultáneas (ponytail: secuencia dedicada por tenant cuando haya volumen real).

**Validación (ejecutada 2026-08-16):**

Smoke test real:
- **Service role, tenant `6f979bb9-...`** → `DP-2026-0001` ✅
- **Authenticated staff, tenant propio `00000000-...-0001`** → `DP-2026-0165` (conteo real del tenant) ✅
- **Authenticated staff, tenant ajeno** → HTTP 403 `tenant mismatch` (42501) ✅

> 1D y 1E se aplicaron en una sola ventana con `supabase db push --linked --include-all` (la CLI pedía `--include-all` por timestamps anteriores a la última remota).

## 6. Fase P4 — Actualizar documentación

| Paso | Archivo | Acción |
|---|---|---|
| 1 | `docs/shared-supabase/04-canonical-object-ledger.md` | Marcar 1D/1E como aplicadas; actualizar fila `generate_process_number()` (ahora tenant-aware, riesgo sube a MEDIO/CRÍTICO por validación) |
| 2 | `docs/shared-supabase/05-migration-reconciliation.md` | Registrar 1D/1E/1C en la matriz de reconciliación |
| 3 | `.opencode/memory/project.md` | Actualizar sección "Pendientes": 1D/1E aplicadas; 1C resuelta o diferida |
| 4 | `README.md` | Nota de migraciones aplicadas (patrón existente de 2026-08-06) |
| 5 | `docs/operations/runbook-auditoria-integral-2026-08-15.md` | Marcar fases 1C/1D/1E con estado final |

**Validación:** `npm run lint` (documentación no afecta tipos, pero verificar formato); revisión manual de los documentos.

## 7. Fase P5 — Commit, push y deploy (SOLO con autorización explícita)

| Paso | Acción |
|---|---|
| 1 | Revisar `git diff` para detectar secrets (ya verificado limpio en la auditoría) |
| 2 | `git add` de archivos afectados (código, migraciones, docs, tests, `eslint.config.js`) |
| 3 | `git commit` descriptivo en español, p.ej.: `fix: endurecer RLS por rol, validar tenant en generate_process_number y cerrar auditoría 2026-08-15` |
| 4 | `git push origin master` |
| 5 | `vercel --prod` (proyecto `sistema-integral-convivencia-escolar`) |
| 6 | Smoke test en producción: login staff, dashboard, abrir expediente, gate de fase, exportación Excel |

**Validación pre-commit (obligatoria):** `npm run lint && npm run test && npm run build && npm run security-audit && npm run test:e2e`.

## 8. Cierre

1. Verificar `supabase migration list --linked` con TODAS las migraciones locales = remotas.
2. Confirmar estado de 1C (aplicada o diferida) y dejar constancia en ledger + memoria.
3. Actualizar este runbook a "Completado" con fecha y hash del commit.
4. Verificar deploy en Vercel (proyecto `sistema-integral-convivencia-escolar`) y smoke test en producción.

## Estado de ejecución

| Fase | Descripción | Estado |
|---|---|---|
| P1 | 1C `usage_events.tenant_id` | ⏸️ Bloqueada — espera confirmación inasistencias (endpoint `/usage/events` 503 mientras tanto) |
| P2 | Migración 1D RLS por rol | ✅ Aplicada y validada (`supabase db push --linked --include-all` 2026-08-16) |
| P3 | Migración 1E `generate_process_number` | ✅ Aplicada y validada (misma ventana; smoke 403/OK/OK) |
| P4 | Documentación (ledger, memoria, runbooks) | ✅ Completada (ledger, 05-reconciliation, memoria, README, runbook auditoría) |
| P5 | Commit, push, deploy | ✅ Ejecutada (commit `12187cd`, push master, deploy Vercel, smoke E2E 4/4 producción) |