# 14 — Phase 3: Controlled Membership Enforcement

**Fecha:** 2026-07-26
**Estado:** ✅ Completado

## Resumen

Implementación del sistema de 3 modos de autenticación para el ecosistema compartido Convivencia + Inasistencias.

## Modos de autenticación

| Modo           | `MEMBERSHIPS_ENABLED` | `MEMBERSHIPS_ENFORCED` | Comportamiento                                                 |
| -------------- | --------------------- | ---------------------- | -------------------------------------------------------------- |
| **legacy**     | `false`               | *                      | Sin verificación de membresía. Usa `profiles.role`. Sin carga. |
| **transition** | `true`                | `false`                | Verifica membresía. Fallback a `profiles.role` si denied.      |
| **enforced**   | `true`                | `true`                 | Solo membresía activa. Sin fallback.                           |

## Archivos creados

### Convivencia

- `src/shared/api/lib/membershipConfig.ts` — `getMembershipAuthMode()`, `APP_ROLE_RULES`, env validation
- `src/shared/ui/MembershipLoading.tsx` — Loading state con timeout
- `src/shared/ui/MembershipAccessDenied.tsx` — Denied state con retry/logout
- `src/shared/ui/MembershipFallbackWarning.tsx` — Warning banner para transition mode
- `src/shared/ui/index.ts` — Barrel export
- `docs/shared-supabase/13-staff-membership-decision.md` — Staff membership decision doc
- `docs/shared-supabase/14-phase-3-transition-enforcement.md` — This doc

### Inasistencias

- (No archivos nuevos, solo actualizaciones)

## Archivos modificados

### Convivencia

- `src/shared/api/types/membership.ts` — Added `MembershipAuthMode`, `MembershipState`, expanded `MembershipStatus`
- `src/shared/api/services/membership.service.ts` — Added retry, cache, timeout, mode-aware behavior
- `src/shared/api/hooks/useMemberships.ts` — Integrated mode logic, fallback, cache protection
- `src/shared/lib/stores/authStore.ts` — Added membershipLoaded, legacyFallbackUsed, applicationCode, membershipError
- `src/app/App.tsx` — Integrated membership gate (loading/denied states)
- `server/middleware/requireMembership.ts` — Added 3 modes (legacy/transition/enforced)
- `server/api/middleware/requireMembership.ts` — Now re-exports from canonical middleware
- `.env.local` — Added `VITE_APP_MEMBERSHIPS_ENFORCED`, `VITE_APP_MEMBERSHIPS_ALLOW_LEGACY_FALLBACK`

### Inasistencias

- `src/types/membership.ts` — Added `MembershipAuthMode`, `MembershipState`, expanded `MembershipStatus`
- `src/services/membershipService.ts` — Added retry, cache, timeout, mode-aware behavior
- `src/hooks/useAuth.ts` — Added membership state, loadMembership, legacyFallbackUsed
- `src/App.tsx` — Integrated membership gate (loading/denied states)
- `.env.local` — Added `VITE_APP_MEMBERSHIPS_ENFORCED`, `VITE_APP_MEMBERSHIPS_ALLOW_LEGACY_FALLBACK`

## Variables de entorno nuevas

| Variable                                     | Default | Descripción                                         |
| -------------------------------------------- | ------- | --------------------------------------------------- |
| `VITE_APP_MEMBERSHIPS_ENFORCED`              | `false` | Activa modo enforced (solo membresía activa)        |
| `VITE_APP_MEMBERSHIPS_ALLOW_LEGACY_FALLBACK` | `true`  | Permite fallback a profiles.role en transition mode |

## Validación

### Convivencia

- Lint: ✅ (0 errors)
- Tests: ✅ (136/136)
- Build: ✅

### Inasistencias

- tsc: ✅ (0 errors)
- Tests: ✅ (120/120)
- Build: ✅

## Decisiones pendientes

### Staff membership

- `staff@colegio.cl` actualmente tiene `profiles.role='staff'` en Convivencia (denied) y `profiles.role='teacher'` en Inasistencias (allowed)
- En enforced mode: staff no tendría acceso a ningún repo sin membresía
- Ver `docs/shared-supabase/13-staff-membership-decision.md` para opciones

## Próximos pasos (Phase 4+)

1. Decidir staff membership (Opción A: crear membresía para Inasistencias)
2. Crear migración para insertar staff membership (si Opción A)
3. Activar `VITE_APP_MEMBERSHIPS_ENABLED=true` en desarrollo
4. Probar transition mode con usuarios existentes
5. Crear UI de gestión de membresías (admin)
6. Activar enforced mode gradualmente
7. Remover fallback a profiles.role
