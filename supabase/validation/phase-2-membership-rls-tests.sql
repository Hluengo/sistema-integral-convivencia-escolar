-- @license SPDX-License-Identifier: Apache-2.0
-- Phase 2 — RLS behavior tests (to be run as different roles)
-- These are NOT automated tests — they are SQL snippets to run manually
-- as specific roles to verify RLS correctness.

-- ============================================================
-- Test 1: anon has no access
-- Run AS anon:
-- ============================================================
-- SELECT 'T1 anon applications' AS test, COUNT(*)::TEXT AS result FROM public.applications;
-- Expected: ERROR or 0 rows

-- SELECT 'T1 anon app_memberships' AS test, COUNT(*)::TEXT AS result FROM public.app_memberships;
-- Expected: ERROR or 0 rows

-- SELECT 'T1 anon tenants' AS test, COUNT(*)::TEXT AS result FROM public.tenants;
-- Expected: ERROR or 0 rows

-- ============================================================
-- Test 2: authenticated can SELECT applications
-- Run AS authenticated:
-- ============================================================
-- SELECT 'T2 auth applications' AS test, COUNT(*)::TEXT AS result FROM public.applications;
-- Expected: 2 rows (convivencia, inasistencias)

-- ============================================================
-- Test 3: authenticated can ONLY see own memberships
-- Run AS authenticated (user A):
-- ============================================================
-- SELECT 'T3 auth own memberships' AS test, COUNT(*)::TEXT AS result FROM public.app_memberships;
-- Expected: only rows WHERE user_id = auth.uid()

-- ============================================================
-- Test 4: authenticated cannot INSERT into app_memberships
-- Run AS authenticated:
-- ============================================================
-- INSERT INTO public.app_memberships (tenant_id, user_id, application_code, role)
-- VALUES ('00000000-0000-0000-0000-000000000001', auth.uid(), 'convivencia', 'admin');
-- Expected: ERROR (no INSERT policy for regular authenticated)

-- ============================================================
-- Test 5: authenticated can only see OWN tenant
-- Run AS authenticated:
-- ============================================================
-- SELECT 'T5 auth own tenant' AS test, id::TEXT, name FROM public.tenants;
-- Expected: only row WHERE id = current_tenant_id()

-- ============================================================
-- Test 6: authenticated cannot UPDATE tenants
-- Run AS authenticated:
-- ============================================================
-- UPDATE public.tenants SET name = 'Hacked' WHERE id = current_tenant_id();
-- Expected: ERROR (no UPDATE policy for regular authenticated)

-- ============================================================
-- Test 7: authenticated cannot DELETE tenants
-- Run AS authenticated:
-- ============================================================
-- DELETE FROM public.tenants WHERE id = current_tenant_id();
-- Expected: ERROR

-- ============================================================
-- Test 8: service_role has full access
-- Run AS service_role:
-- ============================================================
-- SELECT 'T8 svc applications' AS test, COUNT(*)::TEXT AS result FROM public.applications;
-- Expected: 2 rows

-- SELECT 'T8 svc app_memberships' AS test, COUNT(*)::TEXT AS result FROM public.app_memberships;
-- Expected: all rows

-- SELECT 'T8 svc tenants' AS test, COUNT(*)::TEXT AS result FROM public.tenants;
-- Expected: all rows

-- ============================================================
-- Test 9: current_user_memberships() returns correct data
-- Run AS authenticated:
-- ============================================================
-- SELECT 'T9 helper memberships' AS test, application_code, role
-- FROM public.current_user_memberships();
-- Expected: only memberships WHERE user_id = auth.uid() AND tenant_id = current_tenant_id() AND is_active = true

-- ============================================================
-- Test 10: has_app_access() returns correct results
-- Run AS authenticated:
-- ============================================================
-- SELECT 'T10 has_app_access convivencia' AS test, public.has_app_access('convivencia') AS has_access;
-- Expected: depends on user's memberships

-- SELECT 'T10 has_app_access inasistencias' AS test, public.has_app_access('inasistencias', ARRAY['teacher']) AS has_access;
-- Expected: depends on user's memberships and role

-- ============================================================
-- Test 11: has_app_access() returns false for non-existent app
-- Run AS authenticated:
-- ============================================================
-- SELECT 'T11 has_app_access nonexistent' AS test, public.has_app_access('nonexistent') AS has_access;
-- Expected: false

-- ============================================================
-- Test 12: has_app_access() returns false when role doesn't match
-- Run AS authenticated (non-admin user):
-- ============================================================
-- SELECT 'T12 has_app_access wrong role' AS test, public.has_app_access('convivencia', ARRAY['admin']) AS has_access;
-- Expected: false (unless user is admin)

-- ============================================================
-- Test 13: Membership_readiness view is NOT accessible by authenticated
-- Run AS authenticated:
-- ============================================================
-- SELECT 'T13 readiness view accessible' AS test, COUNT(*)::TEXT AS result FROM public.membership_readiness;
-- Expected: ERROR (no SELECT granted to authenticated)

-- ============================================================
-- Test 14: Membership_readiness IS accessible by service_role
-- Run AS service_role:
-- ============================================================
-- SELECT 'T14 readiness view svc' AS test, membership_category, COUNT(*)::INT AS count
-- FROM public.membership_readiness
-- GROUP BY membership_category
-- ORDER BY membership_category;
-- Expected: summary of backfill categories

-- ============================================================
-- Test 15: Verify no recursive RLS (app_memberships)
-- Run AS authenticated:
-- ============================================================
-- This tests that the RLS policy doesn't cause infinite recursion
-- by checking a simple SELECT works:
-- SELECT 'T15 no recursion' AS test, COUNT(*)::TEXT AS result FROM public.app_memberships WHERE user_id = auth.uid();
-- Expected: succeeds (no recursion error)
