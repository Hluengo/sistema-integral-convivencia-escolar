-- @license SPDX-License-Identifier: Apache-2.0
-- Phase 2 — Post-application validation
-- Run AFTER applying migrations 00001-00008.
-- Verifies correct state. No personal data in output.

-- ============================================================
-- 1. Tables exist
-- ============================================================
SELECT '1.1 applications table' AS check_name,
       EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'applications')::TEXT AS status;

SELECT '1.2 app_memberships table' AS check_name,
       EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'app_memberships')::TEXT AS status;

-- ============================================================
-- 2. Seed data
-- ============================================================
SELECT '2.1 applications seeded' AS check_name, code, name
FROM public.applications
ORDER BY code;

-- ============================================================
-- 3. Constraints
-- ============================================================
SELECT '3.1 PK applications' AS check_name,
       EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_pkey' AND connamespace = 'public'::regnamespace)::TEXT AS status;

SELECT '3.2 PK app_memberships' AS check_name,
       EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_memberships_pkey' AND connamespace = 'public'::regnamespace)::TEXT AS status;

SELECT '3.3 UNIQUE (tenant_id, user_id, application_code)' AS check_name,
       EXISTS (SELECT 1 FROM pg_constraint WHERE conname LIKE 'app_memberships_%_key' AND connamespace = 'public'::regnamespace AND contype = 'u')::TEXT AS status;

SELECT '3.4 FK app_memberships → tenants' AS check_name,
       EXISTS (SELECT 1 FROM pg_constraint WHERE conname LIKE '%tenant_id%fkey' AND conrelid = 'public.app_memberships'::regclass)::TEXT AS status;

SELECT '3.5 FK app_memberships → auth.users' AS check_name,
       EXISTS (SELECT 1 FROM pg_constraint WHERE conname LIKE '%user_id%fkey' AND conrelid = 'public.app_memberships'::regclass)::TEXT AS status;

SELECT '3.6 FK app_memberships → applications' AS check_name,
       EXISTS (SELECT 1 FROM pg_constraint WHERE conname LIKE '%application_code%fkey' AND conrelid = 'public.app_memberships'::regclass)::TEXT AS status;

-- ============================================================
-- 4. Indexes
-- ============================================================
SELECT '4.1 required indexes' AS check_name, indexname::TEXT
FROM pg_indexes
WHERE tablename = 'app_memberships'
  AND indexname IN (
    'idx_app_memberships_tenant',
    'idx_app_memberships_user',
    'idx_app_memberships_application',
    'idx_app_memberships_tenant_user_active',
    'idx_app_memberships_user_app_active'
  )
ORDER BY indexname;

-- ============================================================
-- 5. RLS enabled
-- ============================================================
SELECT '5.1 RLS enabled on applications' AS check_name, relrowsecurity::TEXT AS status
FROM pg_class WHERE oid = 'public.applications'::regclass;

SELECT '5.2 RLS enabled on app_memberships' AS check_name, relrowsecurity::TEXT AS status
FROM pg_class WHERE oid = 'public.app_memberships'::regclass;

SELECT '5.3 RLS enabled on tenants' AS check_name, relrowsecurity::TEXT AS status
FROM pg_class WHERE oid = 'public.tenants'::regclass;

-- ============================================================
-- 6. RLS policies exist and have correct qualifiers
-- ============================================================
SELECT '6.1 policies on applications' AS check_name,
       policyname::TEXT,
       pg_get_expr(qual, classid::oid) AS policy_qualifier
FROM pg_policies
WHERE tablename = 'applications' AND schemaname = 'public'
ORDER BY policyname;

-- 6.1a Verify applications SELECT policy uses is_active = true (not USING true)
SELECT '6.1a applications policy uses is_active filter' AS check_name,
       CASE
         WHEN pg_get_expr(qual, classid::oid) LIKE '%is_active%' THEN 'OK'
         ELSE 'WARNING: policy does not filter by is_active'
       END AS status
FROM pg_policies
WHERE tablename = 'applications'
  AND schemaname = 'public'
  AND cmd = 'SELECT'
  AND policyname = 'applications_select_authenticated';

-- 6.1b Verify NO policy uses USING(true) on applications
SELECT '6.1b no USING(true) on applications' AS check_name,
       CASE
         WHEN EXISTS (
           SELECT 1 FROM pg_policies
           WHERE tablename = 'applications'
             AND schemaname = 'public'
             AND pg_get_expr(qual, classid::oid) = 'true'
         ) THEN 'WARNING: USING(true) found'
         ELSE 'OK'
       END AS status;

SELECT '6.2 policies on app_memberships' AS check_name, policyname::TEXT
FROM pg_policies
WHERE tablename = 'app_memberships' AND schemaname = 'public'
ORDER BY policyname;

SELECT '6.3 policies on tenants' AS check_name, policyname::TEXT
FROM pg_policies
WHERE tablename = 'tenants' AND schemaname = 'public'
ORDER BY policyname;

-- ============================================================
-- 7. Grants / ACL
-- ============================================================
SELECT '7.1 table grants' AS check_name,
       grantee::TEXT, privilege_type::TEXT, table_name::TEXT
FROM information_schema.role_table_grants
WHERE table_name IN ('applications', 'app_memberships')
  AND grantee IN ('authenticated', 'anon', 'service_role', 'postgres')
ORDER BY table_name, grantee, privilege_type;

-- 7.2 Verify service_role has SELECT, INSERT, UPDATE, DELETE on applications
SELECT '7.2 service_role privileges on applications' AS check_name,
       string_agg(privilege_type::TEXT, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_name = 'applications'
  AND grantee = 'service_role'
GROUP BY table_name, grantee;

-- 7.3 Verify authenticated has ONLY SELECT on applications
SELECT '7.3 authenticated privileges on applications' AS check_name,
       string_agg(privilege_type::TEXT, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_name = 'applications'
  AND grantee = 'authenticated'
GROUP BY table_name, grantee;

-- 7.4 Verify anon has NO privileges on applications
SELECT '7.4 anon privileges on applications' AS check_name,
       CASE
         WHEN EXISTS (
           SELECT 1 FROM information_schema.role_table_grants
           WHERE table_name = 'applications' AND grantee = 'anon'
         ) THEN 'WARNING: anon has privileges'
         ELSE 'OK (no privileges)'
       END AS status;

-- ============================================================
-- 8. Functions exist and have correct grants
-- ============================================================
SELECT '8.1 current_user_memberships exists' AS check_name,
       EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_user_memberships' AND pronamespace = 'public'::regnamespace)::TEXT AS status;

SELECT '8.2 has_app_access exists' AS check_name,
       EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_app_access' AND pronamespace = 'public'::regnamespace)::TEXT AS status;

-- ============================================================
-- 9. Backfill results - membership counts by application
-- ============================================================
SELECT '9.1 memberships by app' AS check_name, application_code, COUNT(*)::INT AS count
FROM public.app_memberships
GROUP BY application_code
ORDER BY application_code;

-- ============================================================
-- 10. Data integrity
-- ============================================================
SELECT '10.1 orphan memberships (no matching profile)' AS check_name, COUNT(*)::INT AS count
FROM public.app_memberships m
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = m.user_id);

SELECT '10.2 orphan memberships (no matching tenant)' AS check_name, COUNT(*)::INT AS count
FROM public.app_memberships m
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = m.tenant_id);

SELECT '10.3 duplicate memberships (same tenant+user+app)' AS check_name, COUNT(*)::INT AS count
FROM (
  SELECT tenant_id, user_id, application_code, COUNT(*) AS cnt
  FROM public.app_memberships
  GROUP BY tenant_id, user_id, application_code
  HAVING COUNT(*) > 1
) dupes;

-- ============================================================
-- 11. Verify backfill specific results
-- ============================================================
SELECT '11.1 teacher membership exists' AS check_name,
       EXISTS (
         SELECT 1 FROM public.app_memberships m
         JOIN public.profiles p ON p.user_id = m.user_id
         WHERE p.role = 'teacher' AND m.application_code = 'inasistencias'
       )::TEXT AS status;

SELECT '11.2 staff NOT in memberships' AS check_name,
       NOT EXISTS (
         SELECT 1 FROM public.app_memberships m
         JOIN public.profiles p ON p.user_id = m.user_id
         WHERE p.role = 'staff'
       )::TEXT AS status;
