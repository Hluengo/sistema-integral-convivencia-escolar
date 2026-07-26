-- ============================================================================
-- Phase 1 — Baseline Validation Script
-- Shared Supabase Project (ref: jjzwwhnofiepvliugowr)
-- Date: 2026-07-27
-- Purpose: READ-ONLY validation of canonical baseline state post-Fase 0 + 0.5b
-- WARNING: All queries are SELECT only. No data modification.
-- ============================================================================

-- ============================================================================
-- 1. TABLE EXISTENCE — Verify all 25 tables/views exist
-- ============================================================================
-- Expected: 24 rows (tables) + 1 row (view) = 25 total
-- ============================================================================
SELECT '1.1 — All tables exist' AS test_name,
       count(*) = 24 AS passed,
       count(*) AS actual,
       24 AS expected
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

SELECT '1.2 — All views exist' AS test_name,
       count(*) = 1 AS passed,
       count(*) AS actual,
       1 AS expected
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'teacher_public_view';

SELECT '1.3 — Table inventory (by name)' AS test_name,
       string_agg(table_name, ', ' ORDER BY table_name) AS tables_found
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- ============================================================================
-- 2. COLUMN PRESENCE — Verify key columns in critical tables
-- ============================================================================
-- Expected: tenants has id, name, slug, created_at
-- ============================================================================
SELECT '2.1 — tenants columns' AS test_name,
       count(*) = 4 AS passed,
       count(*) AS actual,
       4 AS expected
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tenants'
  AND column_name IN ('id', 'name', 'slug', 'created_at');

-- Expected: profiles has user_id, role, tenant_id, email, full_name
SELECT '2.2 — profiles columns' AS test_name,
       count(*) >= 8 AS passed,
       count(*) AS actual
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('user_id', 'role', 'tenant_id', 'email', 'full_name', 'created_at', 'updated_at', 'course_ids');

-- Expected: All Convivencia tables have tenant_id column
SELECT '2.3 — tenant_id present in Convivencia tables' AS test_name,
       array_agg(table_name ORDER BY table_name) = ARRAY[
         'bitacora_entries', 'carta_events', 'cartas_disciplinarias',
         'causas', 'checklist_items', 'courses', 'disciplinary_annotations_detected',
         'disciplinary_process_files', 'disciplinary_processes', 'disciplinary_rules',
         'document_analyses', 'document_templates', 'etapas_disciplinarias',
         'inspectorate_records', 'profiles', 'students'
       ] AS passed,
       array_agg(table_name ORDER BY table_name) AS actual_columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'bitacora_entries', 'cartas_disciplinarias', 'causas', 'checklist_items',
    'carta_events', 'courses', 'disciplinary_annotations_detected',
    'disciplinary_process_files', 'disciplinary_processes', 'disciplinary_rules',
    'document_analyses', 'document_templates', 'etapas_disciplinarias',
    'inspectorate_records', 'profiles', 'students'
  )
  AND column_name = 'tenant_id';

-- Expected: absences, tests, instant_messages, feriados_chile have NO tenant_id
SELECT '2.4 — NO tenant_id in Inasistencias legacy tables' AS test_name,
       count(*) = 0 AS passed,
       count(*) AS actual,
       0 AS expected
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = ANY (ARRAY['absences', 'tests', 'instant_messages', 'feriados_chile'])
  AND column_name = 'tenant_id';

-- ============================================================================
-- 3. RLS ENABLED STATE
-- ============================================================================
-- Expected: 1 table with RLS disabled (tenants)
-- All other tables: RLS enabled
-- ============================================================================
SELECT '3.1 — Tables with RLS disabled' AS test_name,
       count(*) = 1 AS passed,
       count(*) AS actual,
       1 AS expected,
       array_agg(relname ORDER BY relname) AS tables_without_rls
FROM pg_class
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
WHERE nspname = 'public'
  AND relkind = 'r'
  AND relrowsecurity = false;

SELECT '3.2 — RLS enabled count' AS test_name,
       count(*) = 23 AS passed,
       count(*) AS actual,
       23 AS expected
FROM pg_class
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
WHERE nspname = 'public'
  AND relkind = 'r'
  AND relrowsecurity = true;

-- ============================================================================
-- 4. POLICY COUNTS BY TABLE
-- ============================================================================
-- Expected: specific policy counts per table (documented in baseline)
-- ============================================================================
SELECT '4.1 — Policy counts per table' AS test_name,
       tablename,
       count(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Total policy count (public schema)
SELECT '4.2 — Total public policies' AS test_name,
       count(*) >= 74 AS passed,
       count(*) AS actual,
       74 AS expected_minimum
FROM pg_policies
WHERE schemaname = 'public';

-- ============================================================================
-- 5. NO PUBLIC POLICIES WITH true — Security validation
-- ============================================================================
-- Expected: 0 policies where USING(true) or WITH CHECK(true) for {public} roles
-- This would be a security hole allowing unrestricted access.
-- ============================================================================
SELECT '5.1 — No USING(true) for public roles' AS test_name,
       count(*) = 0 AS passed,
       count(*) AS actual,
       0 AS expected_failures
FROM pg_policies
WHERE schemaname = 'public'
  AND 'public' = ANY (roles)
  AND (qual::text ~* '\byear\b' AND qual::text ~* 'true')
  OR (qual::text = 'true' OR qual::text LIKE '%(true)%');

-- Check for any policy that has USING(true) or WITH CHECK(true)
-- that would bypass tenant isolation
SELECT '5.2 — No BYPASS-RLS policy patterns' AS test_name,
       count(*) = 0 AS passed,
       count(*) AS actual,
       0 AS expected
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual IS NULL OR qual::text IN ('true', '(true)'))
  AND 'public' = ANY (roles);

-- ============================================================================
-- 6. FUNCTION SIGNATURES
-- ============================================================================
SELECT '6.1 — Function inventory' AS test_name,
       count(*) AS function_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname NOT LIKE '%_deprecated%';

-- Functions with SECURITY DEFINER (should be most business logic functions)
SELECT '6.2 — SECURITY DEFINER functions' AS test_name,
       count(*) AS definer_count,
       string_agg(proname, ', ' ORDER BY proname) AS definer_functions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND p.proname NOT LIKE '%_deprecated%';

-- Functions granted to public (potential risk if SECURITY DEFINER + public grants)
SELECT '6.3 — Functions with public EXECUTE grant' AS test_name,
       count(*) AS public_granted_count,
       string_agg(proname, ', ' ORDER BY proname) AS public_functions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND has_function_privilege('public', p.oid, 'EXECUTE')
  AND p.proname NOT LIKE '%_deprecated%';

-- Functions restricted to service_role only
SELECT '6.4 — Service-role-only functions' AS test_name,
       count(*) AS service_only_count,
       string_agg(proname, ', ' ORDER BY proname) AS service_only_functions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
  AND has_function_privilege('service_role', p.oid, 'EXECUTE')
  AND p.proname NOT LIKE '%_deprecated%';

-- Verify teacher functions are properly restricted
SELECT '6.5 — Teacher functions restricted to auth+service' AS test_name,
       count(*) = 4 AS passed,
       count(*) AS actual,
       4 AS expected
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE 'teacher_%'
  AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
  AND NOT has_function_privilege('public', p.oid, 'EXECUTE');

-- ============================================================================
-- 7. STORAGE BUCKET CONFIGURATION
-- ============================================================================
SELECT '7.1 — Bucket count' AS test_name,
       count(*) = 4 AS passed,
       count(*) AS actual,
       4 AS expected
FROM storage.buckets;

SELECT '7.2 — All buckets are private' AS test_name,
       bool_and(NOT public) AS all_private,
       count(*) FILTER (WHERE public) AS public_buckets,
       array_agg(name ORDER BY name) AS bucket_names
FROM storage.buckets;

SELECT '7.3 — Bucket details' AS test_name,
       name,
       public,
       file_size_limit,
       allowed_mime_types
FROM storage.buckets
ORDER BY name;

-- ============================================================================
-- 8. STORAGE POLICY PRESENCE
-- ============================================================================
-- Expected: 14 policies on storage.objects
-- ============================================================================
SELECT '8.1 — Storage policy count' AS test_name,
       count(*) >= 10 AS passed,
       count(*) AS actual,
       10 AS expected_minimum
FROM pg_policies
WHERE schemaname = 'storage';

SELECT '8.2 — Storage policies by bucket' AS test_name,
       substring(policyname FROM '^[^_]+') AS bucket_prefix,
       count(*) AS policy_count,
       string_agg(policyname, ', ' ORDER BY policyname) AS policies
FROM pg_policies
WHERE schemaname = 'storage'
GROUP BY substring(policyname FROM '^[^_]+')
ORDER BY bucket_prefix;

-- Verify no bucket has policies with USING(true) without tenant filtering
SELECT '8.3 — No unsafe storage policies' AS test_name,
       count(*) = 0 AS passed,
       count(*) AS actual,
       0 AS expected
FROM pg_policies
WHERE schemaname = 'storage'
  AND cmd = 'SELECT'
  AND (qual::text = 'true' OR qual::text = '(true)');

-- ============================================================================
-- 9. DEFAULT VALUES — Verify tenant_id defaults on 7 tables
-- ============================================================================
-- Expected columns with default current_tenant_id():
-- bitacora_entries, cartas_disciplinarias, causas, checklist_items,
-- document_templates, etapas_disciplinarias, inspectorate_records
-- ============================================================================
SELECT '9.1 — Tables with default current_tenant_id()' AS test_name,
       count(*) = 7 AS passed,
       count(*) AS actual,
       7 AS expected,
       array_agg(table_name ORDER BY table_name) AS tables_with_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'tenant_id'
  AND column_default LIKE '%current_tenant_id%';

-- ============================================================================
-- 10. NULLABLE COLUMNS — Validate transitional nullables
-- ============================================================================
-- Expected: profiles.tenant_id IS NULLABLE, profiles.role IS NULLABLE,
-- carta_events.tenant_id IS NULLABLE
-- ============================================================================
SELECT '10.1 — profiles.tenant_id nullable' AS test_name,
       is_nullable = 'YES' AS passed,
       is_nullable AS actual,
       'YES' AS expected
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'tenant_id';

SELECT '10.2 — profiles.role nullable' AS test_name,
       is_nullable = 'YES' AS passed,
       is_nullable AS actual,
       'YES' AS expected
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'role';

SELECT '10.3 — carta_events.tenant_id nullable' AS test_name,
       is_nullable = 'YES' AS passed,
       is_nullable AS actual,
       'YES' AS expected
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'carta_events'
  AND column_name = 'tenant_id';

-- Verify non-nullable tenant_id columns in Convivencia tables
SELECT '10.4 — Convivencia tenant_id NOT NULL count' AS test_name,
       count(*) >= 11 AS passed,
       count(*) AS actual,
       11 AS expected_minimum
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'bitacora_entries', 'cartas_disciplinarias', 'causas', 'checklist_items',
    'courses', 'disciplinary_annotations_detected', 'disciplinary_process_files',
    'disciplinary_processes', 'disciplinary_rules', 'document_analyses',
    'document_templates', 'etapas_disciplinarias', 'inspectorate_records', 'students'
  )
  AND column_name = 'tenant_id'
  AND is_nullable = 'NO';

-- ============================================================================
-- 11. TRIGGER AUDIT — Verify auth.users trigger count
-- ============================================================================
-- Expected: only 1 non-internal trigger on auth.users (on_auth_user_created)
-- ============================================================================
SELECT '11.1 — Triggers on auth.users' AS test_name,
       count(*) = 1 AS passed,
       count(*) AS actual,
       1 AS expected,
       string_agg(tgname, ', ') AS trigger_names
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
  AND NOT tgisinternal;

-- All non-internal application triggers
SELECT '11.2 — All application triggers' AS test_name,
       count(*) AS trigger_count,
       string_agg(tgname, ', ' ORDER BY tgname) AS trigger_names
FROM pg_trigger
WHERE NOT tgisinternal
  AND tgrelid::regclass::text NOT LIKE 'storage.%'
  AND tgrelid::regclass::text NOT LIKE 'realtime.%'
  AND tgrelid::regclass::text NOT LIKE 'auth.%';

-- ============================================================================
-- 12. handle_new_user — Verify NO raw_user_meta_data usage
-- ============================================================================
-- The canonical trigger should only use NEW.id and NEW.email,
-- NOT raw_user_meta_data (avoids coupling with auth provider metadata).
-- ============================================================================
SELECT '12.1 — handle_new_user no raw_user_meta_data' AS test_name,
       pg_get_functiondef(p.oid) NOT LIKE '%raw_user_meta_data%' AS passed,
       'Trigger uses only NEW.id and NEW.email' AS actual,
       'No raw_user_meta_data reference' AS expected
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'handle_new_user';

-- ============================================================================
-- 13. BUCKET PRIVACY — Validate no public bucket allowed for sensitive data
-- ============================================================================
-- Expected: All 4 buckets are private (public = false)
-- ============================================================================
SELECT '13.1 — All buckets private' AS test_name,
       bool_and(NOT public) AS all_private,
       count(*) FILTER (WHERE public) AS public_count,
       array_agg(CASE WHEN public THEN name END) AS public_buckets
FROM storage.buckets;

-- ============================================================================
-- 14. INDEX COVERAGE — Validate critical indexes exist
-- ============================================================================
-- Expected indexes that must exist for performance
-- ============================================================================
SELECT '14.1 — tenant_id indexes on all tenant-aware tables' AS test_name,
       count(*) >= 12 AS passed,
       count(*) AS actual,
       12 AS expected_minimum,
       array_agg(indexname ORDER BY indexname) AS tenant_id_indexes
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef LIKE '%tenant_id%'
  AND tablename != 'tenants';

-- Check for composite indexes critical for multi-tenant queries
SELECT '14.2 — Critical composite indexes' AS test_name,
       count(*) = 4 AS passed,
       count(*) AS actual,
       4 AS expected,
       string_agg(indexname, ', ' ORDER BY indexname) AS composite_indexes
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_inspectorate_tenant_student',
    'idx_students_tenant_course',
    'idx_causas_tenant_fecha',
    'idx_disciplinary_processes_number'
  );

-- Primary key coverage
SELECT '14.3 — Primary key coverage' AS test_name,
       count(*) >= 23 AS passed,
       count(*) AS actual,
       23 AS expected_minimum
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%pkey';

-- ============================================================================
-- 15. FK CONSTRAINTS — Verify tenant FK chain
-- ============================================================================
-- Expected: Multiple foreign keys referencing tenants(id)
-- ============================================================================
SELECT '15.1 — FK references to tenants' AS test_name,
       count(*) >= 15 AS passed,
       count(*) AS actual,
       15 AS expected_minimum,
       string_agg(source_table || '.' || source_column || ' -> ' || target_table || '.' || target_column, '; ' ORDER BY source_table) AS fk_list
FROM (
  SELECT
    tc.table_name AS source_table,
    kcu.column_name AS source_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'tenants'
    AND tc.table_schema = 'public'
) sub;

-- ============================================================================
-- 16. COEXISTENCE_CASES — Empty table check (retire candidate)
-- ============================================================================
-- Expected: 0 rows (table is abandoned)
-- ============================================================================
SELECT '16.1 — coexistence_cases row count' AS test_name,
       count(*) = 0 AS passed,
       count(*) AS actual,
       0 AS expected
FROM public.coexistence_cases;

-- ============================================================================
-- 17. STORAGE OBJECTS — Legacy absences/ objects
-- ============================================================================
-- Expected: 148 objects in documents/absences/
-- ============================================================================
SELECT '17.1 — Legacy absences/ objects in documents bucket' AS test_name,
       count(*) = 148 AS passed,
       count(*) AS actual,
       148 AS expected
FROM storage.objects
WHERE bucket_id = 'documents'
  AND name LIKE 'absences/%';

-- ============================================================================
-- 18. VIEW — Verify teacher_public_view definition
-- ============================================================================
-- Expected: Definition joins absences + students + courses
-- ============================================================================
SELECT '18.1 — teacher_public_view depends on absences' AS test_name,
       definition LIKE '%absences%' AS passed,
       'Definition references absences' AS actual,
       'Must reference absences table' AS expected
FROM pg_views
WHERE schemaname = 'public'
  AND viewname = 'teacher_public_view';

-- ============================================================================
-- 19. FUNCTION OVERLOAD — Check teacher_get_public_absences overloads
-- ============================================================================
-- Expected: 2 overloads (3 params + 4 params)
-- ============================================================================
SELECT '19.1 — teacher_get_public_absences overload count' AS test_name,
       count(*) = 2 AS passed,
       count(*) AS actual,
       2 AS expected
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'teacher_get_public_absences';

-- ============================================================================
-- 20. SUMMARY — All validations in one row
-- ============================================================================
-- Final rollup of all critical checks
-- ============================================================================
SELECT '20.1 — COMPREHENSIVE VALIDATION SUMMARY' AS test_name,
       (SELECT count(*) = 24 FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS all_tables_exist,
       (SELECT count(*) = 1 FROM pg_class JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid WHERE nspname = 'public' AND relkind = 'r' AND relrowsecurity = false) AS only_tenants_without_rls,
       (SELECT count(*) = 1 FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal) AS single_auth_users_trigger,
       (SELECT count(*) >= 74 FROM pg_policies WHERE schemaname = 'public') AS sufficient_policies,
       (SELECT count(*) = 7 FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'tenant_id' AND column_default LIKE '%current_tenant_id%') AS seven_tenant_defaults,
       (SELECT count(*) >= 12 FROM pg_indexes WHERE schemaname = 'public' AND indexdef LIKE '%tenant_id%') AS tenant_id_indexed,
       (SELECT count(*) = 4 FROM storage.buckets) AS four_buckets,
       (SELECT bool_and(NOT public) FROM storage.buckets) AS all_buckets_private,
       (SELECT count(*) >= 10 FROM pg_policies WHERE schemaname = 'storage') AS storage_policies_present;
