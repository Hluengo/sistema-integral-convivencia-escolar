# Fase 2 — Cierre

## Estado

**FASE 2 COMPLETA — MIGRACIONES, RLS Y SMOKE TESTS APROBADOS**
**RECONCILIACIÓN POST-APLICACIÓN COMPLETADA**

---

## Supabase

**Proyecto:** `jjzwwhnofiepvliugowr`

### Objetos creados

| #   | Objeto                                       | Tipo    |
| --- | -------------------------------------------- | ------- |
| 1   | `public.applications`                        | Tabla   |
| 2   | `public.app_memberships`                     | Tabla   |
| 3   | `public.membership_readiness`                | Vista   |
| 4   | `public.current_user_memberships()`          | Función |
| 5   | `public.has_app_access(text, text[])`        | Función |
| 6   | `public.update_app_memberships_updated_at()` | Función |

### Aplicaciones registradas

| app_id          | name                      |
| --------------- | ------------------------- |
| `convivencia`   | Convivencia Escolar       |
| `inasistencias` | Registro de Inasistencias |

### Membresías activas

| Aplicación    | Rol                | Cantidad |
| ------------- | ------------------ | -------- |
| inasistencias | teacher            | 1        |
| convivencia   | _(sin membresías)_ | 0        |

> **Nota:** El perfil staff fue excluido del backfill por ambigüedad de rol. Requiere decisión manual antes de activar enforcement.

---

## Migraciones — Estado final reconciliado

### Mapeo local ↔ remoto

| # Local | Archivo local                                                 | Nombre remoto                              | Versión remota   | SHA-256       | Estado                   |
| ------- | ------------------------------------------------------------- | ------------------------------------------ | ---------------- | ------------- | ------------------------ |
| 00001   | `20260728000001_create_applications.sql`                      | `create_applications`                      | `20260726160213` | `24A60E50...` | ✅ Aplicada              |
| 00009   | `20260728000009_revoke_applications_default_privileges.sql`   | `revoke_applications_default_privileges`   | `20260726160356` | `08DD9309...` | ✅ Aplicada (correctiva) |
| 00002   | `20260728000002_create_app_memberships.sql`                   | `create_app_memberships`                   | `20260726160630` | `6EB928B2...` | ✅ Aplicada              |
| 00003   | `20260728000003_seed_applications.sql`                        | `seed_applications`                        | `20260726160831` | `168A1E3A...` | ✅ Aplicada              |
| 00004   | `20260728000004_prepare_membership_backfill.sql`              | `prepare_membership_backfill`              | `20260726160936` | `00B1193C...` | ✅ Aplicada              |
| 00007   | `20260728000007_enable_membership_tables_and_tenants_rls.sql` | `enable_membership_tables_and_tenants_rls` | `20260726161102` | `2F49E1FC...` | ✅ Aplicada              |
| 00008   | `20260728000008_create_membership_helpers.sql`                | `create_membership_helpers`                | `20260726161246` | `2FE0E634...` | ✅ Aplicada              |
| 00005   | `20260728000005_create_initial_memberships_inasistencias.sql` | `create_initial_memberships_inasistencias` | `20260726161400` | `423DE0EE...` | ✅ Aplicada              |
| 00006   | `20260728000006_create_initial_memberships_convivencia.sql`   | `create_initial_memberships_convivencia`   | `20260726161504` | `A636D976...` | ✅ Aplicada              |

> **Nota:** El orden de aplicación en remoto difiere de la numeración local. La correctiva `revoke_applications_default_privileges` (00009 local) fue aplicada como segunda migración en remoto, inmediatamente después de `create_applications`.

### Orden real de aplicación (remoto)

1. `create_applications` (20260726160213)
2. `revoke_applications_default_privileges` (20260726160356) — correctiva
3. `create_app_memberships` (20260726160630)
4. `seed_applications` (20260726160831)
5. `prepare_membership_backfill` (20260726160936)
6. `enable_membership_tables_and_tenants_rls` (20260726161102)
7. `create_membership_helpers` (20260726161246)
8. `create_initial_memberships_inasistencias` (20260726161400)
9. `create_initial_memberships_convivencia` (20260726161504)

### Migración correctiva 00009

**Nombre remoto:** `revoke_applications_default_privileges`
**Motivo:** Supabase aplica privilegios heredados por defecto a las tablas. La migración 00001 definía GRANT explícitos pero los privilegios heredados persistían. 00009 revoca todo y restaura el ACL least-privilege aprobado.
**Fecha real de aplicación:** 2026-07-26 (durante la sesión de Fase 2)
**Resultado:** ✅ Aplicada exitosamente
**Validación:** `has_table_privilege` confirma anon=sin privilegios, authenticated=SELECT, service_role=SELECT/INSERT/UPDATE/DELETE

---

## Seguridad — Estado post-aplicación

### RLS

| Tabla             | RLS Activo | Policy SELECT                                                    | Policy INSERT/UPDATE/DELETE |
| ----------------- | ---------- | ---------------------------------------------------------------- | --------------------------- |
| `applications`    | ✅         | `applications_select_authenticated` — `USING (is_active = true)` | Solo `service_role`         |
| `app_memberships` | ✅         | `app_memberships_select_own` — `USING (user_id = auth.uid())`    | Solo `service_role`         |
| `tenants`         | ✅         | `tenants_select_own` — `USING (id = current_tenant_id())`        | Solo `admin`/`direccion`    |

### ACL efectivas (verificadas con `has_table_privilege`)

**applications:**

| Rol             | SELECT | INSERT | UPDATE | DELETE |
| --------------- | ------ | ------ | ------ | ------ |
| `anon`          | ❌     | ❌     | ❌     | ❌     |
| `authenticated` | ✅     | ❌     | ❌     | ❌     |
| `service_role`  | ✅     | ✅     | ✅     | ✅     |
| `postgres`      | ✅     | ✅     | ✅     | ✅     |

### Helpers

| Función                      | SECURITY DEFINER | search_path       | EXECUTE anon | Owner    |
| ---------------------------- | ---------------- | ----------------- | ------------ | -------- |
| `current_user_memberships()` | ✅               | `public, pg_temp` | ❌           | postgres |
| `has_app_access()`           | ✅               | `public, pg_temp` | ❌           | postgres |

**EXECUTE grantees:** authenticated, service_role, postgres

### membership_readiness

- Owner: `postgres`
- security_invoker: hereda de la vista (function-based view)
- Categorías: ambiguous=1, inasistencias-only=1

### Backfill real

| Aplicación    | Rol     | Cantidad |
| ------------- | ------- | -------- |
| inasistencias | teacher | 1        |

- Sin duplicados ✅
- Sin huérfanos ✅
- Staff excluido (ambigüedad) ⚠️

---

## Smoke tests

| App           | Flag    | Resultado | Tiempo |
| ------------- | ------- | --------- | ------ |
| Convivencia   | `false` | ✅ PASSED | 7.0s   |
| Inasistencias | `false` | ✅ PASSED | 12.4s  |
| Inasistencias | `true`  | ✅ PASSED | 12.3s  |

---

## Feature flag

```
VITE_APP_MEMBERSHIPS_ENABLED=false
```

**Debe permanecer `false` en producción hasta que enforcement esté conectado y probado.**

---

## Estado de transición

La infraestructura de memberships está implementada y probada, pero **no está enforced** en el flujo de login.

Mientras la flag esté desactivada:

- `profiles.role` continúa como fallback temporal
- Ausencia de membership **no bloquea** el login
- `requireMembership` middleware no está aplicado globalmente
- Vista Docente continúa en mantenimiento (Fase 0.5b)

---

## Deuda siguiente (Fase 3)

| Ítem                  | Descripción                                              | Prioridad |
| --------------------- | -------------------------------------------------------- | --------- |
| Decision staff        | Definir membership y role del perfil staff               | Alta      |
| Enforcement dev       | Activar enforcement solo en desarrollo                   | Alta      |
| Conectar rutas        | Conectar `requireMembership` a rutas seleccionadas       | Alta      |
| Retirar profiles.role | Migrar gradualmente a membership como source of truth    | Media     |
| Rollback              | Mantener feature flag como mecanismo de rollback         | Media     |
| Regresión             | No activar producción sin pruebas de regresión completas | Alta      |

---

## Decisión

**FASE 2 RECONCILIADA — APTA PARA INICIAR FASE 3**

### Migraciones locales

9 archivos (00001–00009), todos corresponden a migraciones aplicadas en remoto.

### Commits

| Repositorio   | Hash original | Contenido                                     |
| ------------- | ------------- | --------------------------------------------- |
| Convivencia   | `24e4406`     | 00001–00008, código, docs                     |
| Inasistencias | `c112fb6`     | useAuth, membershipService, types, smoke test |

### Commit correctivo de reconciliación

| Repositorio | Contenido                                  |
| ----------- | ------------------------------------------ |
| Convivencia | 00009, docs actualizados, roadmap, memoria |

---

_Documento actualizado el 2026-07-26 durante reconciliación post-aplicación. No contiene datos personales, tokens ni credenciales._
