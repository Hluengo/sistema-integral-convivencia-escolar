-- @license SPDX-License-Identifier: Apache-2.0
-- Resumen consolidado, de solo lectura, para reconciliar Supabase.

with expected_tables(table_name) as (
  values
    ('applications'),
    ('app_memberships'),
    ('audit_events'),
    ('membership_invitations'),
    ('notifications'),
    ('report_history')
),
expected_columns(table_name, column_name) as (
  values
    ('app_memberships', 'tenant_id'),
    ('app_memberships', 'user_id'),
    ('app_memberships', 'application_code'),
    ('app_memberships', 'role'),
    ('app_memberships', 'is_active'),
    ('audit_events', 'tenant_id'),
    ('audit_events', 'actor_user_id'),
    ('audit_events', 'action'),
    ('audit_events', 'entity_type'),
    ('audit_events', 'entity_id'),
    ('audit_events', 'previous_values'),
    ('audit_events', 'new_values'),
    ('audit_events', 'occurred_at'),
    ('membership_invitations', 'tenant_id'),
    ('membership_invitations', 'email'),
    ('membership_invitations', 'role'),
    ('membership_invitations', 'status'),
    ('membership_invitations', 'invited_by'),
    ('notifications', 'tenant_id'),
    ('notifications', 'user_id'),
    ('notifications', 'notification_key'),
    ('notifications', 'read_at'),
    ('notifications', 'expires_at'),
    ('report_history', 'tenant_id'),
    ('report_history', 'created_by'),
    ('report_history', 'report_type'),
    ('report_history', 'filters'),
    ('report_history', 'status')
),
table_summary as (
  select jsonb_agg(
    jsonb_build_object(
      'table_name', table_name,
      'exists', to_regclass('public.' || table_name) is not null
    ) order by table_name
  ) as value
  from expected_tables
),
column_summary as (
  select jsonb_agg(
    jsonb_build_object(
      'table_name', e.table_name,
      'column_name', e.column_name,
      'exists', c.column_name is not null,
      'data_type', c.data_type,
      'is_nullable', c.is_nullable
    ) order by e.table_name, e.column_name
  ) as value
  from expected_columns e
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = e.table_name
   and c.column_name = e.column_name
),
policy_summary as (
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'table_name', tablename,
      'policy_name', policyname,
      'command', cmd,
      'roles', roles
    ) order by tablename, policyname
  ), '[]'::jsonb) as value
  from pg_policies
  where schemaname = 'public'
    and tablename in (select table_name from expected_tables)
),
trigger_summary as (
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'table_name', c.relname,
      'trigger_name', t.tgname,
      'definition', pg_get_triggerdef(t.oid)
    ) order by c.relname, t.tgname
  ), '[]'::jsonb) as value
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where not t.tgisinternal
    and n.nspname = 'public'
    and c.relname in ('audit_events', 'profiles')
),
migration_summary as (
  select coalesce(jsonb_agg(version order by version), '[]'::jsonb) as value
  from supabase_migrations.schema_migrations
)
select jsonb_build_object(
  'migrations', migration_summary.value,
  'tables', table_summary.value,
  'columns', column_summary.value,
  'policies', policy_summary.value,
  'triggers', trigger_summary.value
) as reconciliation_summary
from migration_summary, table_summary, column_summary, policy_summary, trigger_summary;
