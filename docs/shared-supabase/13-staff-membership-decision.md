# 13 — Staff Membership Decision (Fase 3)

**Fecha:** 2026-07-26
**Estado:** Pendiente de decisión

## Contexto

En el ecosistema compartido Convivencia + Inasistencias, el usuario `staff@colegio.cl` actualmente tiene:

- Convivencia: `profiles.role = 'staff'` → acceso denied por `requireAuth`
- Inasistencias: `profiles.role = 'teacher'` → acceso permitido

El sistema de membresías requiere decidir qué hacer con este usuario.

## Opciones

### Opción A: Crear membresía staff (RECOMENDADO)

- Crear `app_memberships` para `staff@colegio.cl` en `inasistencias` con `role='staff'`
- Mantener `profiles.role='staff'` en ambos repos (no tocar)
- Convivencia: staff queda sin membresía → acceso denied en enforced mode
- Inasistencias: staff tiene membresía activa → acceso permitido

### Opción B: Renombrar a teacher

- Cambiar `profiles.role` de `staff` a `teacher` en Supabase
- **NO RECOMENDADO**: modifica Supabase (prohibido en Phase 3)

### Opción C: Dejar como está

- Staff queda sin membresía en ambos repos
- En enforced mode: staff no puede acceder a ningún repo
- En legacy/transition: staff puede acceder a Inasistencias por `profiles.role`

## Recomendación

**Opción A** — Crear membresía para Inasistencias con `role='staff'`. Mantener Convivencia deny.

## Próximos pasos

1. Decidir opción
2. Crear migración para insertar membresía (si Opción A)
3. O documentar como decisión pendiente (si Opción C)
