-- @license SPDX-License-Identifier: Apache-2.0
-- Diagnóstico de solo lectura del ledger de Supabase.
-- Ejecutar en Supabase Dashboard > SQL Editor.
-- Este archivo NO modifica el esquema ni la tabla de migraciones.

select
  version,
  row_number() over (order by version) as execution_order
from supabase_migrations.schema_migrations
order by version;

select jsonb_build_object(
  'registered_migrations', coalesce((
    select jsonb_agg(version order by version)
    from supabase_migrations.schema_migrations
  ), '[]'::jsonb),
  'institutional_tables', jsonb_build_object(
    'institution_settings', to_regclass('public.institution_settings') is not null,
    'institution_rule_versions', to_regclass('public.institution_rule_versions') is not null
  ),
  'notification_realtime', exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ),
  'legacy_objects_present', jsonb_build_object(
    'applications', to_regclass('public.applications') is not null,
    'app_memberships', to_regclass('public.app_memberships') is not null,
    'audit_events', to_regclass('public.audit_events') is not null,
    'membership_invitations', to_regclass('public.membership_invitations') is not null,
    'notifications', to_regclass('public.notifications') is not null,
    'report_history', to_regclass('public.report_history') is not null
  )
) as reconciliation_snapshot;
