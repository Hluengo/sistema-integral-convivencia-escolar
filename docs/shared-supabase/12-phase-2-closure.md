# Fase 2 — Cierre

## Estado

**FASE 2 COMPLETA — MIGRACIONES, RLS Y SMOKE TESTS APROBADOS**

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

## Seguridad

### RLS

| Tabla             | RLS Activo | Policy SELECT                         | Policy INSERT/UPDATE/DELETE |
| ----------------- | ---------- | ------------------------------------- | --------------------------- |
| `applications`    | ✅         | `auth.uid() IS NOT NULL`              | Solo `service_role`         |
| `app_memberships` | ✅         | Solo propias (`user_id = auth.uid()`) | Solo `service_role`         |
| `tenants`         | ✅         | `current_tenant_id()`                 | Solo `admin`/`direccion`    |

### Grants

| Rol             | Permisos                                               |
| --------------- | ------------------------------------------------------ |
| `anon`          | Sin acceso a ninguna tabla membership                  |
| `authenticated` | SELECT restringido en `app_memberships` (solo propias) |
| `service_role`  | Administración completa                                |

### Helpers

| Función                      | SECURITY DEFINER | search_path       | EXECUTE anon |
| ---------------------------- | ---------------- | ----------------- | ------------ |
| `current_user_memberships()` | ✅               | `public, pg_temp` | ❌           |
| `has_app_access()`           | ✅               | `public, pg_temp` | ❌           |

### Validación de seguridad

- ✅ Sin duplicados en `app_memberships`
- ✅ Sin referencias huérfanas
- ✅ `membership_readiness` accesible solo por `service_role`/`postgres`
- ✅ Sin EXECUTE para `anon` en helpers
- ✅ `search_path` bloqueado en SECURITY DEFINER
- ✅ `updated_at` trigger funciona correctamente

---

## Smoke tests

| App           | Flag    | Resultado | Tiempo |
| ------------- | ------- | --------- | ------ |
| Convivencia   | `false` | ✅ PASSED | 7.5s   |
| Inasistencias | `false` | ✅ PASSED | 12.3s  |
| Inasistencias | `true`  | ✅ PASSED | 12.3s  |

### Cobertura de smoke tests

- Login con credenciales válidas
- Verificación de email visible en UI
- Verificación de rol visible en UI
- Verificación de ausencia de errores de membership en consola
- Logout y retorno a estado no autenticado
- Sin llamadas RPC/membership no autorizadas

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

**FASE 2 COMPLETA — APTA PARA COMMIT ESTABLE**

### Migraciones aplicadas

| #     | Migración                                                     | Propósito                                  | Estado      |
| ----- | ------------------------------------------------------------- | ------------------------------------------ | ----------- |
| 00001 | `20260728000001_create_applications.sql`                      | Tabla catálogo                             | ✅ Aplicada |
| 00002 | `20260728000002_create_app_memberships.sql`                   | Tabla membresías                           | ✅ Aplicada |
| 00003 | `20260728000003_seed_applications.sql`                        | Seed convivencia + inasistencias           | ✅ Aplicada |
| 00004 | `20260728000004_prepare_membership_backfill.sql`              | Vista readiness                            | ✅ Aplicada |
| 00005 | `20260728000005_create_initial_memberships_inasistencias.sql` | Backfill teacher→inasistencias             | ✅ Aplicada |
| 00006 | `20260728000006_create_initial_memberships_convivencia.sql`   | Backfill direccion/convivencia→convivencia | ✅ Aplicada |
| 00007 | `20260728000007_enable_membership_tables_and_tenants_rls.sql` | RLS hardening                              | ✅ Aplicada |
| 00008 | `20260728000008_create_membership_helpers.sql`                | Helpers RLS                                | ✅ Aplicada |

### Validaciones completadas

- ✅ RLS activo en `applications`, `app_memberships`, `tenants`
- ✅ `anon` sin acceso
- ✅ `authenticated` con SELECT restringido
- ✅ `authenticated` sin INSERT/UPDATE/DELETE
- ✅ `service_role` con administración backend
- ✅ `membership_readiness` solo `service_role`/`postgres`
- ✅ Helpers sin EXECUTE para `anon`
- ✅ `search_path` seguro
- ✅ Smoke tests aprobados (3/3)

---

_Documento generado el 2026-07-26. No contiene datos personales, tokens ni credenciales._
