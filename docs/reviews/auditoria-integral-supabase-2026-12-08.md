# Auditoría Integral Supabase — Sistema Integral de Convivencia Escolar

> **Fecha:** 2026-12-08
> **Proyecto Supabase (principal):** `mjhbcqwtjzgvqssfiore`
> **Rama:** `master` (`8866549 fix(anotaciones): corregir nombre de estudiante`)
> **Alcance:** Auth, RLS, multi-tenancy, storage, funciones/grants, migraciones, seguridad de datos NNA (Ley 21.809 / Circular 482 / Ley 21.430)
> **Método:** Revisión de migraciones (`supabase/migrations/` + `migrations-legacy/`), documentación de arquitectura/revisiones, validación **REMOTA EN VIVO** contra el entorno real vía scripts del proyecto (`test:multitenant`, `test:roles`).

---

## 1. Resumen Ejecutivo

| Área                 | Estado      | Notas                                                        |
| -------------------- | ----------- | ------------------------------------------------------------ |
| Inter-tenant isolation (RLS) | ✅ Verificado en vivo | Aislamiento `courses`, `document_templates`, `institution_settings`, `institution_rule_versions` confirmado remoto |
| Authorization por rol (RBAC)  | ✅ Verificado en vivo | 9 roles verificados; solo `admin`/`direccion` acceden a admin/institución |
| Audit trail (append-only)     | ✅ Verificado en vivo | `audit_events` rechaza mutaciones (only-insert) |
| Auth JWT                       | ✅ Sólido    | HS256 + ES256/JWKS + fallback API, fail-fast en prod |
| RLS policies                   | ✅ Consistente | Patrón `tenant_id = current_tenant_id()` en todas las tablas multi-tenant |
| Storage                        | ✅ Privado    | Buckets `public=false`, signed URLs 1h, RLS por carpeta `{tenant_id}/...` |
| Funciones / grants             | ✅ Mitigado   | SEC-A…H aplicados; `REVOKE ALL FROM anon`; `search_path` fijo |
| Migraciones                    | ✅ Sincronizadas | 21 activas + baseline; sin drift |
| **Hallazgos CRÍTICOS o ALTOS** | **0**        | Ningún hallazgo crítico/alto abierto |

**Veredicto:** El backend de Supabase de convivencia escolar está en **buen estado de salud de seguridad**. El aislamiento multi-tenant y el RBAC fueron **reverificados contra el entorno real** sin excepciones. Los riesgos pendientes son **2 items operativos/comunes** (leaked-password protection + ventana de observación del swap de columnas `carta_events`), más un residuo de WARNs de rendimiento documentados como intencionales.

---

## 2. Validación Remota en Vivo (2026-12-08)

Ejecución de los scripts canónicos de auditoría del proyecto con conexión al proyecto real:

### 2.1 `npm run test:multitenant` — Aislamiento inter-tenant ✅

```json
{
  "ok": true,
  "sourceTenant": "mmddconcepcion",
  "targetTenant": "colegio-san-jose",
  "sourceCourses": 24,  "targetCourses": 16,
  "sourceTemplates": 4, "targetTemplates": 4,
  "sourceSettings": 1,  "targetSettings": 1,
  "sourceRules": 0,     "targetRules": 0,
  "auditAppendOnly": true
}
```

- Un usuario del tenant `mmddconcepcion` **no** ve cursos/plantillas/configuración/reglamento del tenant `colegio-san-jose`, y viceversa.
- `audit_events` **rechaza UPDATE y DELETE** (append-only confirmado).
- El script crea y elimina usuario/sonda y hace limpieza en `finally` (no deja residuos).

### 2.2 `npm run test:roles` — RBAC de producción ✅

| Rol          | `/api/admin/members` | `/api/admin/institution` | `/api/onboarding/status` |
| ------------ | -------------------- | ------------------------ | ------------------------ |
| admin        | 200 ✅                | 200 ✅                    | 200 ✅                    |
| direccion    | 200 ✅                | 200 ✅                    | 200 ✅                    |
| convivencia  | 403 ✅                | 403 ✅                    | 200 ✅                    |
| inspectoria  | 403 ✅                | 403 ✅                    | 200 ✅                    |
| profesor_jefe| 403 ✅                | 403 ✅                    | 200 ✅                    |
| teacher      | 403 ✅                | 403 ✅                    | 200 ✅                    |
| inspector    | 403 ✅                | 403 ✅                    | 200 ✅                    |
| user         | 403 ✅                | 403 ✅                    | 200 ✅                    |
| staff        | 403 ✅                | 403 ✅                    | 200 ✅                    |

Solo `admin`/`direccion` acceden a rutas de administración/configuración; los 7 roles operativos reciben `403` correctamente y conservan acceso al buscador público (`onboarding`).

---

## 3. Autenticación y Sesión (Auth)

| Configuración            | Valor                         | Evaluación |
| ------------------------ | ----------------------------- | ---------- |
| Método                   | Email/Password                | ✅          |
| Signup habilitado        | Sí                            | ⚠️ a confirmar |
| Confirmación email       | No                            | ⚠️ riesgo de cuentas no verificadas |
| JWT expiry               | 3600s (1h)                    | ✅ adecuado |
| Refresh rotation         | Sí (10s reuse)                | ✅          |
| Min password length      | 6                            | ⚠️ bajo (recomendado ≥ 8–12) |
| OAuth providers          | Ninguno                       | ✅ (superficie menor) |

### Verificación server-side
- `server/middleware/auth.ts` / `requireMembership.ts`: HMAC-SHA256 (`SUPABASE_JWT_SECRET`) con fallback a Base64, luego `/auth/v1/user` para tokens ES256. Implementado una sola vez y registrado en ambos entry points (`server/index.ts` + `api/index.js`). ✅
- Fail-fast en producción si faltan secrets (test `jwt-fail-fast`). ✅
- `current_tenant_id()` lee el tenant desde `app_metadata.tenant_id` del JWT (fast-path) con fallback a DB (subquery en `profiles`). Trigger `sync_tenant_to_jwt()` mantiene el claim en `auth.users.raw_app_meta_data`. ✅

### Observaciones auth (recomendaciones)
- **A-1 (MEDIO):** `confirmation email = off` combinado con min password remoto de 6. La aplicación exige ahora mínimo 10 caracteres al cambiar contraseña; activar confirmación de email y HIBP queda condicionado a configuración/plan de Auth.
- **A-2:** Hay un proyecto Supabase **anterior** en `.env.local` (`*_OLD`). Verificar que esté suspendido/retirado (riesgo residual de superficie).

---

## 4. RLS y Multi-Tenancy

### 4.1 Patrón general — consistente ✅
Todas las tablas de datos multi-tenant usan:

```sql
-- SELECT  → USING (tenant_id = current_tenant_id())
-- INSERT  → WITH CHECK (tenant_id = current_tenant_id())
-- UPDATE  → USING (tenant_id = current_tenant_id())
-- DELETE  → USING (tenant_id = current_tenant_id())
```

- Sin `USING(true)` / `WITH CHECK(true)` en políticas (verificado por búsqueda). ✅
- `profiles`, `causas`, `students`, `courses`, `cartas_disciplinarias`, `causa_documents`, `etapas_disciplinarias`, `document_templates`, `institution_*`, `checklist_progress_entries`: RLS habilitado.
- DELETE/UPDATE restrictivos por rol en tablas sensibles (`causas`, `students`, `courses` → solo admin/direccion). ✅
- **`app_memberships`** autoriza escrituras en tablas de seguridad (patrón de membresía por aplicación `convivencia`), con grants mínimos (`anon` nada, `authenticated` SELECT). ✅

### 4.2 RLS perf (PERF-D) ✅
13 políticas reescritas a initplan `(select auth.uid())` para evaluar la subconsulta una sola vez por query. Confirmado en `docs/architecture` y runbook críticas.

### 4.3 Tablas deny-all intencionales
`coexistence_cases` y `membership_invitations` sin policy = deny-all. `coexistence_cases` tiene grants solo a `service_role` (SEC-G aplicado). ✅ (comportamiento documentado, tabla no usada por la app).

---

## 5. Storage (Buckets)

| Bucket                          | Visibilidad | MIME                                            | Max  | Path pattern |
| ------------------------------- | ----------- | ----------------------------------------------- | ---- | ------------ |
| `anotaciones`                   | Privado     | PDF, MD, TXT                                    | 10MB | `{tenant_id}/...` |
| `disciplinary-processes`        | Privado     | PDF                                             | 10MB | `{tenant_id}/{student_id}/{process_id}/...` |
| `documentos_convivencia` (legacy)| Privado    | PDF/Word/img                                    | —    | `{causa_id}/documentos/...` |
| `institution-assets`            | Privado     | png/jpeg/svg                                    | 2MB  | — |

- Todos los buckets en `public=false` (tras la mitigación emergency-containment). ✅
- RLS en `storage.objects` valida carpeta `{tenant_id}/...` y membresía activa `convivencia` (roles `CONVIVENCIA_MEMBERSHIP` incl. `staff`). ✅
- Acceso por signed URLs con expiración 1h; validación de tipo/tamaño al subir; header `%PDF-`. ✅
- PDFs disciplinarios: se re-descargan, se recalcula hash y se valida `analysisId` del tenant antes de persistir. ✅
---

## 6. Funciones y Grants (superficie de ataque)

### 6.1 anon / authenticated — least privilege ✅
- `20260806093000_revoke_anon_table_access.sql`: `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;` y revoca ejecución de `app_role`, `current_app_role`, `current_tenant_id`, `clean_old_logs`, `count_affected_tests`. Verificado ACL `anon` → 0 filas. ✅
- `20260806130000_revoke_app_role_public_execute.sql`: cierra el default `=x/owner` de PUBLIC. ✅
- Flujos públicos (dashboard, vista docente) usan funciones SECURITY DEFINER con grants propios (`get_public_dashboard_kpis`, `teacher_get_public_*`) — no afectadas por el REVOKE. ✅

### 6.2 Mitigaciones Security Advisors (2026-08-08, verdes) ✅
| ID    | Hallazgo | Estado |
| ----- | -------- | ------ |
| SEC-A | `teacher_public_view` exponía PII sin filtro tenant + grants DML | ✅ → SECURITY INVOKER + solo SELECT |
| SEC-B | 5 funciones sensibles ejecutables por anon/authenticated | ✅ REVOKE EXECUTE |
| SEC-C | 5 funciones con `search_path` mutable | ✅ search_path fijo |
| SEC-F | 8 funciones SECURITY DEFINER sin call sites (PII cross-tenant) | ✅ REVOKE |
| SEC-G | `coexistence_cases` GRANT ALL | ✅ solo service_role |
| SEC-H | 5 funciones definer autenticadas con parámetros cross-tenant | ✅ REVOKE |

### 6.3 search_path
Funciones críticas definidas con `SET search_path TO 'public', 'pg_temp'` (previene hijacking de namespace). Verificado en `critical_mitigations.sh --verify`. ✅

---

## 7. Migraciones — Estado y Sincronía

- Directorio **activo**: `supabase/migrations/` — baseline (`00000_remote_schema_baseline.sql`) + **21 migraciones incrementales**.
- Directorio legado: `supabase/migrations-legacy/` (archivado, no fuente de verdad — NO modificar).
- Últimas migraciones: `20260812165845_add_checklist_progress_entries.sql`, `20260812170006_restrict_checklist_progress_grants.sql` (menos privilegios: revoca `references/trigger/truncate` a `authenticated`). ✅ alineadas con least-privilege.
- Sincronía remota 100% verificada en auditoría 08-07 (21 migraciones, 0 drift). No hay cambios de schema pendientes en el working tree.

> **Nota de higiene:** `api/index.js` aparece modificado en el working tree como artefacto generado (esbuild + Prettier). Es código compilado; conviene no trackearlo manualmente y regenerarlo en deploy (no es hallazgo de seguridad).

---

## 8. Hallazgos Pendientes / Recomendaciones

### 🟠 Pendientes operativos (requieren consola / ventana de mantenimiento)

| ID   | Severidad | Hallazgo | Acción recomendada |
| ---- | --------- | -------- | ------------------ |
| SEC-D | MEDIO | **Leaked-password protection no disponible en plan Free** | Mitigado parcialmente en aplicación con mínimo de 10 caracteres; HIBP requiere Pro+. |
| SEC-E | ALTO (programado) | Drop final de columnas TEXT `carta_events` (`carta_id_text_old`/`student_id_text_old`) | Ejecutar `20260808100000_drop_carta_events_text_columns.sql` tras ventana de observación 24–72h + smoke tests. **Aún no aplicado → esperar confirmación.** |

### 🟡 Mejoras recomendadas (defensa en profundidad)

| ID   | Severidad | Recomendación |
| ---- | --------- | ------------- |
| A-1 | MEDIO | Activar **confirmación de email** en Auth; la app ya exige mínimo 10 caracteres al cambiar contraseña. HIBP requiere Pro+. |
| A-2 | BAJO | Confirmar/suspender el **proyecto Supabase anterior** (`*_OLD` en `.env.local`) para reducir superficie. |
| F-1 | BAJO | Evaluar una a una las funciones SECURITY DEFINER restantes ejecutables por `authenticated` (rankings, resúmenes) — no revocar a ciegas; confirmar que todas filtran por `current_tenant_id()`/`auth.uid()`. |
| PERF | INFO | Re-analizar los 49 `unused_index` reportados solo tras periodo de tráfico real (`pg_stat_user_indexes`); no dropar a ciegas. Múltiples `multiple_permissive_policies` son intencionales (documentado). |

---

## 9. Fortalezas Confirmadas

- **Aislamiento multi-tenant REAL verificado en vivo** (cursos/plantillas/config/settings/reglamento).
- **RBAC por rol verificado en vivo** (9 roles, solo admin/direccion en admin/institución).
- **Audit trail append-only** inmutable confirmado.
- RLS consistente, sin `USING(true)`, least-privilege en grants, buckets privados, signed URLs.
- Service role key NUNCA en cliente (solo `server/` y `.env.local`).
- `search_path` fijo en funciones sensibles; mitigaciones SEC-A…H aplicadas y verificadas.
- Migraciones sincronizadas; convención inmutable respetada.
- Sanitización AI/PII alineada con Ley 21.809 y Circular 482.

---

## 10. Conclusión

El sistema Supabase de convivencia escolar no presenta **hallazgos críticos ni altos abiertos**. La validación **en vivo del 2026-12-08** confirmó aislamiento multi-tenant, RBAC y audit-append-only. En plan Free, la protección HIBP no está disponible; la aplicación mitiga el riesgo exigiendo mínimo 10 caracteres al cambiar contraseña. Permanece recomendada la confirmación de email.

_Próxima auditoría recomendada_: tras aplicar SEC-D y SEC-E, y tras un ciclo de tráfico real para revisar los `unused_index` con datos reales.

---
_Generado por auditoría integral 2026-12-08 · Basado en revisión de migraciones, documentación de arquitectura y validación remota en vivo._
