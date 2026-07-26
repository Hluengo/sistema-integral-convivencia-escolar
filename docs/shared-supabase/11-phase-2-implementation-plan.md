# Implementation Plan — Phase 2: Applications & Memberships

> **Status:** ✅ Fase 2 completada — migraciones aplicadas y reconciliadas  
> **Fecha:** 2026-07-28  
> **Migraciones:** 9 aplicadas (00001–00009)  
> **Feature flag:** `VITE_APP_MEMBERSHIPS_ENABLED=false`  
> **Cierre:** Ver `12-phase-2-closure.md`

---

## 1. Objetivo

Introducir `applications` y `app_memberships` como nuevo source of truth de autorización, manteniendo `profiles.role` como fallback temporal mientras la feature flag está desactivada.

## 2. Orden de aplicación manual

### Paso 0: Validación pre-migración

```bash
# Ejecutar en SQL Editor (service_role):
# 1. Abrir supabase/validation/phase-2-pre-application-validation.sql
# 2. Ejecutar cada sección
# 3. Verificar:
#    - applications y app_memberships NO existen
#    - Conteo de perfiles coincide con lo esperado
#    - Tenants existe con 1 fila
```

### Paso 1: Migración 00001 — Tabla applications

Archivo: `20260728000001_create_applications.sql`

```bash
# Consultas POST:
SELECT * FROM public.applications;
# Expected: 0 rows (seed en paso 3)
```

### Paso 2: Migración 00009 — Revocar privilegios heredados (CORRECTIVA)

Archivo: `20260728000009_revoke_applications_default_privileges.sql`

```bash
# Consultas POST:
SELECT grantee, privilege_type FROM information_schema.role_table_grants
  WHERE table_name='applications' AND grantee IN ('authenticated','anon','service_role');
# Expected: anon=nothing, authenticated=SELECT, service_role=SELECT/INSERT/UPDATE/DELETE
```

> **Nota:** Esta migración fue aplicada como segunda en el orden real de remoto, inmediatamente después de00001. Revoca privilegios heredados de Supabase y restaura least-privilege.

### Paso 3: Migración 00002 — Tabla app_memberships

Archivo: `20260728000002_create_app_memberships.sql`

```bash
# Consultas POST:
SELECT * FROM public.app_memberships;
# Expected: 0 rows
\d public.app_memberships
# Expected: PK, FK, UNIQUE, indexes, trigger
```

### Paso 4: Migración 00003 — Seed applications

Archivo: `20260728000003_seed_applications.sql`

```bash
# Consultas POST:
SELECT * FROM public.applications;
# Expected: 2 rows (convivencia, inasistencias)
```

### Paso 5: Migración 00004 — Vista de readiness

Archivo: `20260728000004_prepare_membership_backfill.sql`

```bash
# Consultas POST (service_role):
SELECT * FROM public.membership_readiness;
# Expected: clasificación de cada perfil

# Verificar que authenticated NO puede acceder:
# (ejecutar como authenticated)
SELECT * FROM public.membership_readiness;
# Expected: ERROR (permission denied)
```

### Paso 6: Migración 00005 — Backfill Inasistencias

Archivo: `20260728000005_create_initial_memberships_inasistencias.sql`

```bash
# Consultas POST:
SELECT application_code, COUNT(*) FROM public.app_memberships GROUP BY application_code;
# Expected: 1 row (inasistencias)

SELECT m.role, p.role AS profile_role
FROM public.app_memberships m
JOIN public.profiles p ON p.user_id = m.user_id
WHERE m.application_code = 'inasistencias';
# Expected: only teacher profiles
```

### Paso 7: Migración 00006 — Backfill Convivencia

Archivo: `20260728000006_create_initial_memberships_convivencia.sql`

```bash
# Consultas POST:
SELECT application_code, COUNT(*) FROM public.app_memberships GROUP BY application_code;
# Expected: 0 rows for convivencia (no direccion/convivencia profiles exist)

# Verify staff excluded:
SELECT COUNT(*) FROM public.app_memberships m
JOIN public.profiles p ON p.user_id = m.user_id
WHERE p.role = 'staff';
# Expected: 0
```

### Paso 8: Migración 00007 — RLS hardening

Archivo: `20260728000007_enable_membership_tables_and_tenants_rls.sql`

```bash
# Verificar RLS policies:
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('applications', 'app_memberships', 'tenants')
ORDER BY tablename, policyname;
```

### Paso 9: Migración 00008 — Helpers

Archivo: `20260728000008_create_membership_helpers.sql`

```bash
# Verificar funciones:
SELECT proname, prosecdef, volatilty
FROM pg_proc
WHERE proname IN ('current_user_memberships', 'has_app_access');

# Probar helpers (service_role):
SELECT * FROM public.current_user_memberships();
SELECT public.has_app_access('convivencia');
SELECT public.has_app_access('inasistencias', ARRAY['teacher']);
```

### Paso 10: Validación post-migración

```bash
# Ejecutar en SQL Editor (service_role):
# supabase/validation/phase-2-post-application-validation.sql
```

### Paso 10: Validación RLS

```bash
# Ejecutar pruebas manuales desde:
# supabase/validation/phase-2-membership-rls-tests.sql
```

## 3. Feature Flag

`VITE_APP_MEMBERSHIPS_ENABLED=false` en ambos repositorios.

Mientras sea `false`:

- `profiles.role` sigue siendo el source of truth
- La función `getMyMembership()` retorna `not_available`
- `requireMembership` middleware hace fallback a `requireRole`
- No se bloquea ningún usuario existente

Para activar:

1. Aplicar migraciones 00001-00009 en Supabase (ver orden en Sección 2)
2. Cambiar `VITE_APP_MEMBERSHIPS_ENABLED=true` en ambos `.env.local`
3. Verificar que todos los usuarios tengan membresías correctas
4. Monitorear logs de acceso

## 4. Cambios en Convivencia

| Archivo                                         | Tipo       | Descripción                                                     |
| ----------------------------------------------- | ---------- | --------------------------------------------------------------- |
| `src/shared/api/types/membership.ts`            | Nuevo      | Tipos AppMembership, MembershipStatus, MembershipResult         |
| `src/shared/api/services/membership.service.ts` | Nuevo      | Servicio getMyMembership con manejo de flag y tabla inexistente |
| `src/shared/api/hooks/useMemberships.ts`        | Nuevo      | Hook React que integra con authStore                            |
| `src/shared/lib/stores/authStore.ts`            | Modificado | Estado de membresía + setMembership/clearMembership             |
| `server/middleware/requireMembership.ts`        | Nuevo      | Middleware Express (dev)                                        |
| `server/api/middleware/requireMembership.ts`    | Nuevo      | Middleware Express (Vercel)                                     |
| `.env.local`                                    | Modificado | `VITE_APP_MEMBERSHIPS_ENABLED=false`                            |

## 5. Cambios en Inasistencias

| Archivo                             | Tipo       | Descripción                                             |
| ----------------------------------- | ---------- | ------------------------------------------------------- |
| `src/types/membership.ts`           | Nuevo      | Tipos AppMembership, MembershipStatus, MembershipResult |
| `src/services/membershipService.ts` | Nuevo      | Servicio getMyMembership                                |
| `src/hooks/useAuth.ts`              | Modificado | membershipStatus + appRole en return                    |
| `.env.local`                        | Modificado | `VITE_APP_MEMBERSHIPS_ENABLED=false`                    |

## 6. Backfill exacto

| Perfil      | Rol actual | Migración | Resultado                                      |
| ----------- | ---------- | --------- | ---------------------------------------------- |
| teacher (1) | `teacher`  | 00005     | ✅ Insertado en `inasistencias` como `teacher` |
| staff (1)   | `staff`    | Ninguna   | ❌ Excluido. Documentado para revisión manual  |
| Convivencia | —          | 00006     | ℹ️ No-op (sin perfiles direccion/convivencia)  |
