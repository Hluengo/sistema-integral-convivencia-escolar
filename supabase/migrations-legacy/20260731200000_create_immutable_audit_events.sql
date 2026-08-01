-- @license SPDX-License-Identifier: Apache-2.0
-- Technical audit trail. This is intentionally separate from audit-due-process,
-- which produces an AI-assisted report and is not an immutable event log.

begin;

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  actor_user_id uuid not null default auth.uid(),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  previous_values jsonb,
  new_values jsonb,
  occurred_at timestamptz not null default now(),
  constraint audit_events_action_not_empty check (char_length(btrim(action)) between 1 and 120),
  constraint audit_events_entity_type_not_empty check (char_length(btrim(entity_type)) between 1 and 120),
  constraint audit_events_entity_id_not_empty check (char_length(btrim(entity_id)) between 1 and 200)
);

comment on table public.audit_events is
  'Technical immutable audit trail. Separate from the AI-assisted audit-due-process report.';
comment on column public.audit_events.actor_user_id is
  'Authenticated user responsible for the action. No FK is used so events survive account removal.';
comment on column public.audit_events.previous_values is
  'Values before the action, when applicable.';
comment on column public.audit_events.new_values is
  'Values after the action, when applicable.';

create index audit_events_tenant_occurred_at_idx
  on public.audit_events (tenant_id, occurred_at desc);
create index audit_events_actor_occurred_at_idx
  on public.audit_events (actor_user_id, occurred_at desc);
create index audit_events_entity_idx
  on public.audit_events (tenant_id, entity_type, entity_id);
create index audit_events_occurred_at_idx
  on public.audit_events (occurred_at desc);

create or replace function public.reject_audit_event_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'audit_events is append-only: UPDATE and DELETE are forbidden';
end;
$$;

revoke all on function public.reject_audit_event_mutation() from public, anon, authenticated, service_role;

create trigger audit_events_append_only
  before update or delete on public.audit_events
  for each row
  execute function public.reject_audit_event_mutation();

alter table public.audit_events enable row level security;

revoke all on table public.audit_events from public, anon, authenticated, service_role;
grant select, insert on public.audit_events to authenticated;
grant all on public.audit_events to service_role;
grant all on public.audit_events to postgres;

create policy audit_events_select_same_tenant
  on public.audit_events
  for select
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (
      array['admin', 'direccion', 'convivencia', 'inspectoria', 'inspector', 'staff', 'superuser']
    )
  );

create policy audit_events_insert_same_tenant
  on public.audit_events
  for insert
  to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and actor_user_id = auth.uid()
    and public.current_app_role() = any (
      array['admin', 'direccion', 'convivencia', 'inspectoria', 'inspector', 'staff', 'superuser']
    )
  );

-- Explicit deny policies make the append-only contract visible in pg_policies.
-- The trigger also protects against privileged UPDATE/DELETE calls.
create policy audit_events_update_denied
  on public.audit_events
  for update
  to authenticated
  using (false)
  with check (false);

create policy audit_events_delete_denied
  on public.audit_events
  for delete
  to authenticated
  using (false);

commit;
