-- @license SPDX-License-Identifier: Apache-2.0
-- Validación de las migraciones posteriores al baseline.
-- Solo lectura. Ejecutar antes de cualquier reparación del ledger.

select jsonb_build_object(
  '20260801090000_scope_document_templates_by_tenant', jsonb_build_object(
    'tenant_unique_index', exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'document_templates'
        and indexname = 'document_templates_tenant_doc_type_key'
    ),
    'legacy_global_constraint_absent', not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.document_templates'::regclass
        and conname = 'document_templates_doc_type_key'
    )
  ),
  '20260801100000_add_institutional_configuration', jsonb_build_object(
    'settings_table', to_regclass('public.institution_settings') is not null,
    'rules_table', to_regclass('public.institution_rule_versions') is not null,
    'settings_rls', exists (
      select 1 from pg_class
      where oid = 'public.institution_settings'::regclass and relrowsecurity
    ),
    'rules_rls', exists (
      select 1 from pg_class
      where oid = 'public.institution_rule_versions'::regclass and relrowsecurity
    ),
    'private_bucket', exists (
      select 1 from storage.buckets
      where id = 'institution-assets' and public = false
    ),
    'storage_select_policy', exists (
      select 1 from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'institution_assets_select'
    ),
    'storage_write_policy', exists (
      select 1 from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'institution_assets_write'
    )
  ),
  '20260801120000_enable_notifications_realtime', jsonb_build_object(
    'notifications_realtime', exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    )
  )
) as migration_validation;
