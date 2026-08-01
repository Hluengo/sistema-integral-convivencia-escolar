-- @license SPDX-License-Identifier: Apache-2.0
-- Fase C: persistencia de notificaciones por usuario y tenant.

begin;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  user_id uuid not null references auth.users(id),
  notification_key text not null,
  notification_type text not null,
  title text not null,
  description text not null,
  severity text not null default 'info',
  entity_type text,
  entity_id text,
  action_url text,
  read_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notifications_severity_check check (severity in ('info', 'warning', 'urgent')),
  constraint notifications_key_not_empty check (char_length(btrim(notification_key)) between 1 and 200),
  constraint notifications_title_not_empty check (char_length(btrim(title)) between 1 and 160),
  constraint notifications_description_not_empty check (char_length(btrim(description)) between 1 and 2000),
  unique (tenant_id, user_id, notification_key)
);

comment on table public.notifications is
  'Notificaciones persistentes por usuario; el historial se conserva aunque expire la alerta.';
comment on column public.notifications.notification_key is
  'Clave estable para actualizar una alerta derivada sin resetear su estado de lectura.';
comment on column public.notifications.expires_at is
  'Fecha de expiración lógica; no elimina el registro histórico.';

create index notifications_user_created_idx
  on public.notifications (tenant_id, user_id, created_at desc);
create index notifications_user_unread_idx
  on public.notifications (tenant_id, user_id, read_at)
  where read_at is null;
create index notifications_expiration_idx
  on public.notifications (tenant_id, user_id, expires_at);
create index notifications_entity_idx
  on public.notifications (tenant_id, entity_type, entity_id);

alter table public.notifications enable row level security;

revoke all on table public.notifications from public, anon, authenticated, service_role;
grant select, insert, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
grant all on public.notifications to postgres;

create policy notifications_select_own
  on public.notifications
  for select
  to authenticated
  using (tenant_id = public.current_tenant_id() and user_id = auth.uid());

create policy notifications_insert_own
  on public.notifications
  for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id() and user_id = auth.uid());

create policy notifications_update_own
  on public.notifications
  for update
  to authenticated
  using (tenant_id = public.current_tenant_id() and user_id = auth.uid())
  with check (tenant_id = public.current_tenant_id() and user_id = auth.uid());

create policy notifications_delete_denied
  on public.notifications
  for delete
  to authenticated
  using (false);

create or replace function public.sync_notification(
  p_notification_key text,
  p_notification_type text,
  p_title text,
  p_description text,
  p_severity text,
  p_entity_type text default null,
  p_entity_id text default null,
  p_action_url text default null,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (
    tenant_id, user_id, notification_key, notification_type, title,
    description, severity, entity_type, entity_id, action_url, expires_at
  ) values (
    public.current_tenant_id(), auth.uid(), p_notification_key, p_notification_type, p_title,
    p_description, p_severity, p_entity_type, p_entity_id, p_action_url, p_expires_at
  )
  on conflict (tenant_id, user_id, notification_key)
  do update set
    notification_type = excluded.notification_type,
    title = excluded.title,
    description = excluded.description,
    severity = excluded.severity,
    entity_type = excluded.entity_type,
    entity_id = excluded.entity_id,
    action_url = excluded.action_url,
    expires_at = excluded.expires_at,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.sync_notification(text, text, text, text, text, text, text, text, timestamptz) from public, anon;
grant execute on function public.sync_notification(text, text, text, text, text, text, text, text, timestamptz) to authenticated;
grant execute on function public.sync_notification(text, text, text, text, text, text, text, text, timestamptz) to service_role;

commit;

select pg_notify('pgrst', 'reload schema');
