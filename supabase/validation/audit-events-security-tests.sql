-- @license SPDX-License-Identifier: Apache-2.0
-- Security validation for 20260731200000_create_immutable_audit_events.sql.
-- Run against the target database with a role allowed to inspect catalogs.

-- 1. Schema and required indexes.
select 'schema' as test_name,
  to_regclass('public.audit_events') is not null as passed;

select 'required_columns' as test_name,
  count(*) = 9 as passed
from information_schema.columns
where table_schema = 'public'
  and table_name = 'audit_events'
  and column_name in (
    'id', 'tenant_id', 'actor_user_id', 'action', 'entity_type', 'entity_id',
    'previous_values', 'new_values', 'occurred_at'
  );

select 'required_indexes' as test_name,
  count(*) = 4 as passed
from pg_indexes
where schemaname = 'public'
  and tablename = 'audit_events'
  and indexname in (
    'audit_events_tenant_occurred_at_idx',
    'audit_events_actor_occurred_at_idx',
    'audit_events_entity_idx',
    'audit_events_occurred_at_idx'
  );

-- 2. RLS and append-only protections.
select 'rls_enabled' as test_name, relrowsecurity as passed
from pg_class
where oid = 'public.audit_events'::regclass;

select 'append_only_policies' as test_name,
  count(*) = 2 as passed
from pg_policies
where schemaname = 'public'
  and tablename = 'audit_events'
  and policyname in ('audit_events_update_denied', 'audit_events_delete_denied');

select 'mutation_trigger' as test_name,
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.audit_events'::regclass
      and tgname = 'audit_events_append_only'
      and not tgisinternal
  ) as passed;

-- 3. Privilege checks: authenticated can read/append only; no mutation grants.
select 'authenticated_privileges' as test_name,
  has_table_privilege('authenticated', 'public.audit_events', 'SELECT')
  and has_table_privilege('authenticated', 'public.audit_events', 'INSERT')
  and not has_table_privilege('authenticated', 'public.audit_events', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.audit_events', 'DELETE') as passed;

select 'anon_has_no_privileges' as test_name,
  not has_table_privilege('anon', 'public.audit_events', 'SELECT')
  and not has_table_privilege('anon', 'public.audit_events', 'INSERT') as passed;

-- 4. Runtime checks to execute as authenticated with a real user:
-- INSERT with another tenant_id or actor_user_id must fail (tenant isolation/spoofing).
-- UPDATE public.audit_events SET action = 'tampered' WHERE id = '<event-id>';
-- DELETE FROM public.audit_events WHERE id = '<event-id>';
-- Both mutations must fail, including for service_role because the trigger is explicit.
-- SELECT must only return rows where tenant_id = public.current_tenant_id().

