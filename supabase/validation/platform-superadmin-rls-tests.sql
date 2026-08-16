-- @license SPDX-License-Identifier: Apache-2.0
-- Plataforma — RLS behavior tests for `superadmin` role
-- These are NOT automated tests — they are SQL snippets to run manually
-- as specific roles to verify RLS correctness after the superadmin migration.

-- ============================================================
-- Precondición: ejecutar la migración 20260801000000_create_superadmin_role.sql
-- y que exista el perfil con email 'superusuario@colegio.cl' (backfill lo
-- promueve a role='superadmin').
-- ============================================================

-- ============================================================
-- Test 1: el constraint profiles_role_check admite 'superadmin'
-- ============================================================
-- INSERT INTO public.profiles (user_id, email, role, tenant_id)
-- VALUES ('11111111-1111-1111-1111-111111111111', 'test@colegio.cl', 'superadmin',
--         '00000000-0000-0000-0000-000000000001');
-- Expected: OK (no constraint violation)
-- Limpieza:
-- DELETE FROM public.profiles WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================
-- Test 2: el constraint rechaza roles inválidos
-- ============================================================
-- INSERT INTO public.profiles (user_id, email, role, tenant_id)
-- VALUES ('22222222-2222-2222-2222-222222222222', 'bad@colegio.cl', 'root',
--         '00000000-0000-0000-0000-000000000001');
-- Expected: ERROR (new row violates row-level security policy / check constraint)

-- ============================================================
-- Test 3: superadmin ve TODOS los tenants (lectura transversal)
-- Run AS superadmin (cambiar auth.uid() al del superusuario):
-- ============================================================
-- SELECT 'T3 superadmin all tenants' AS test, COUNT(*)::TEXT AS result FROM public.tenants;
-- Expected: >= 1 (todos los tenantsexistentes)

-- ============================================================
-- Test 4: admin regular SOLO ve su propio tenant
-- Run AS admin de un colegio:
-- ============================================================
-- SELECT 'T4 admin own tenant' AS test, COUNT(*)::TEXT AS result FROM public.tenants;
-- Expected: 1 (solo el tenant propio)

-- ============================================================
-- Test 5: superadmin puede leer perfiles cross-tenant
-- Run AS superadmin:
-- ============================================================
-- SELECT 'T5 superadmin all profiles' AS test, COUNT(*)::TEXT AS result
-- FROM public.profiles WHERE tenant_id <> public.current_tenant_id();
-- Expected: >= 0 (filas de otros tenants visibles para superadmin)

-- ============================================================
-- Test 6: admin regular NO ve perfiles de otros tenants
-- Run AS admin de un colegio:
-- ============================================================
-- SELECT 'T6 admin scoped profiles' AS test, COUNT(*)::TEXT AS result
-- FROM public.profiles WHERE tenant_id <> public.current_tenant_id();
-- Expected: 0 (RLS oculta perfiles de otros tenants)

-- ============================================================
-- Test 7: backfill idempotente — re-ejecutar no rompe
-- ============================================================
-- UPDATE public.profiles SET role = 'superadmin'
-- WHERE email = 'superusuario@colegio.cl' AND role <> 'superadmin';
-- SELECT 'T7 backfill idempotent' AS test,
--        (SELECT role FROM public.profiles WHERE email = 'superusuario@colegio.cl') AS result;
-- Expected: result = 'superadmin'