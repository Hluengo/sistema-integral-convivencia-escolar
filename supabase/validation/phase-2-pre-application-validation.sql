-- @license SPDX-License-Identifier: Apache-2.0
-- Phase 2 — Pre-application validation
-- Run BEFORE applying migrations 00001-00008.
-- Verifies current state without modifying anything.

-- ============================================================
-- 1. Verify tables do NOT exist yet (idempotency check)
-- ============================================================
SELECT '1.1 applications table' AS check_name,
       EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'applications') AS exists_already;

SELECT '1.2 app_memberships table' AS check_name,
       EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'app_memberships') AS exists_already;

-- ============================================================
-- 2. Verify profiles state (counts only, no personal data)
-- ============================================================
SELECT '2.1 total profiles' AS check_name, COUNT(*)::INT AS value FROM public.profiles;

SELECT '2.2 profiles by role' AS check_name, role, COUNT(*)::INT AS count
FROM public.profiles
GROUP BY role
ORDER BY role;

SELECT '2.3 profiles without tenant' AS check_name, COUNT(*)::INT AS count
FROM public.profiles
WHERE tenant_id IS NULL;

SELECT '2.4 profiles without role' AS check_name, COUNT(*)::INT AS count
FROM public.profiles
WHERE role IS NULL;

-- ============================================================
-- 3. Verify tenants state
-- ============================================================
SELECT '3.1 total tenants' AS check_name, COUNT(*)::INT AS value FROM public.tenants;

SELECT '3.2 tenants RLS enabled' AS check_name,
       COUNT(*) FILTER (WHERE relrowsecurity = true)::INT AS rls_enabled,
       COUNT(*) FILTER (WHERE relrowsecurity = false)::INT AS rls_disabled
FROM pg_class
WHERE oid = 'public.tenants'::regclass;

-- ============================================================
-- 4. Verify RLS state of existing tables
-- ============================================================
SELECT '4.1 tables without RLS' AS check_name, relname::TEXT
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = false
ORDER BY c.relname;

-- ============================================================
-- 5. Backfill prediction (counts only)
-- ============================================================
SELECT '5.1 teacher (→ inasistencias)' AS check_name, COUNT(*)::INT AS count
FROM public.profiles
WHERE tenant_id IS NOT NULL AND role = 'teacher';

SELECT '5.2 direccion, convivencia (→ convivencia)' AS check_name, COUNT(*)::INT AS count
FROM public.profiles
WHERE tenant_id IS NOT NULL AND role IN ('direccion', 'convivencia');

SELECT '5.3 ambiguous roles (excluded)' AS check_name, COUNT(*)::INT AS count
FROM public.profiles
WHERE tenant_id IS NOT NULL AND role IN ('admin', 'profesor_jefe', 'inspectoria', 'inspector', 'staff', 'user', 'superuser');

SELECT '5.4 profiles excluded (no tenant or no role)' AS check_name, COUNT(*)::INT AS count
FROM public.profiles
WHERE tenant_id IS NULL OR role IS NULL;

-- ============================================================
-- 6. Verify functions exist
-- ============================================================
SELECT '6.1 current_tenant_id exists' AS check_name,
       EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_tenant_id' AND pronamespace = 'public'::regnamespace) AS exists_ok;

SELECT '6.2 current_app_role exists' AS check_name,
       EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_app_role' AND pronamespace = 'public'::regnamespace) AS exists_ok;
