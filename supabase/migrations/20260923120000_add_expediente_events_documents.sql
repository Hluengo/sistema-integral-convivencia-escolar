-- Fases 5 y 6: historial inmutable e índice documental del expediente.
-- Los archivos físicos siguen viviendo en Storage; esta tabla solo registra su índice.

create table if not exists public.expediente_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants(id),
  causa_id text not null references public.causas(id) on delete cascade,
  incidente_id uuid references public.incidentes(id) on delete set null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id),
  event_type text not null,
  title text not null check (char_length(title) between 1 and 240),
  description text not null default '',
  milestone_id text,
  hecho_id uuid references public.hechos(id) on delete set null,
  source_table text,
  source_id text,
  participants jsonb not null default '[]'::jsonb,
  status text not null default 'vigente'
    check (status in ('vigente', 'rectificado', 'invalidado')),
  previous_event_id uuid references public.expediente_events(id) on delete set null,
  correction_reason text,
  metadata jsonb not null default '{}'::jsonb,
  constraint expediente_events_participants_array check (jsonb_typeof(participants) = 'array')
);

create table if not exists public.expediente_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants(id),
  causa_id text not null references public.causas(id) on delete cascade,
  incidente_id uuid references public.incidentes(id) on delete set null,
  original_name text not null check (char_length(original_name) between 1 and 255),
  display_name text not null check (char_length(display_name) between 1 and 255),
  mime_type text not null default 'application/octet-stream',
  byte_size bigint not null default 0 check (byte_size >= 0),
  storage_path text not null,
  milestone_id text,
  event_id uuid references public.expediente_events(id) on delete set null,
  hecho_id uuid references public.hechos(id) on delete set null,
  document_date timestamptz,
  incorporated_at timestamptz not null default now(),
  incorporated_by uuid references auth.users(id),
  origin text not null default 'interno'
    check (origin in ('interno', 'externo', 'importado')),
  scope text not null default 'individual'
    check (scope in ('individual', 'grupal')),
  version integer not null default 1 check (version > 0),
  status text not null default 'vigente'
    check (status in ('vigente', 'invalidado', 'reemplazado')),
  invalidated_at timestamptz,
  invalidated_by uuid references auth.users(id),
  invalidation_reason text,
  sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  constraint expediente_documents_reference_check check (
    milestone_id is not null or event_id is not null or hecho_id is not null
  )
);

create index if not exists idx_expediente_events_tenant_causa_occurred
  on public.expediente_events (tenant_id, causa_id, occurred_at);
create index if not exists idx_expediente_events_tenant_milestone
  on public.expediente_events (tenant_id, milestone_id, occurred_at);
create index if not exists idx_expediente_events_tenant_type
  on public.expediente_events (tenant_id, event_type, occurred_at);
create index if not exists idx_expediente_documents_tenant_causa
  on public.expediente_documents (tenant_id, causa_id, incorporated_at);
create index if not exists idx_expediente_documents_tenant_event
  on public.expediente_documents (tenant_id, event_id);
create index if not exists idx_expediente_documents_tenant_hecho
  on public.expediente_documents (tenant_id, hecho_id);

alter table public.expediente_events enable row level security;
alter table public.expediente_documents enable row level security;

grant select, insert on public.expediente_events to authenticated;
grant select, insert, update on public.expediente_documents to authenticated;

drop policy if exists expediente_events_tenant_select on public.expediente_events;
create policy expediente_events_tenant_select on public.expediente_events
  for select to authenticated using (tenant_id = public.current_tenant_id());

drop policy if exists expediente_events_tenant_insert on public.expediente_events;
create policy expediente_events_tenant_insert on public.expediente_events
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria','profesor_jefe','teacher','staff'])
  );

drop policy if exists expediente_documents_tenant_select on public.expediente_documents;
create policy expediente_documents_tenant_select on public.expediente_documents
  for select to authenticated using (tenant_id = public.current_tenant_id());

drop policy if exists expediente_documents_tenant_insert on public.expediente_documents;
create policy expediente_documents_tenant_insert on public.expediente_documents
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria','profesor_jefe','teacher','staff'])
  );

drop policy if exists expediente_documents_tenant_update on public.expediente_documents;
create policy expediente_documents_tenant_update on public.expediente_documents
  for update to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create or replace function public.ensure_expediente_event_tenant()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.causas c where c.id = new.causa_id and c.tenant_id = new.tenant_id) then
    raise exception 'causa does not belong to event tenant';
  end if;
  if new.incidente_id is not null and not exists (
    select 1 from public.incidentes i where i.id = new.incidente_id and i.tenant_id = new.tenant_id
  ) then
    raise exception 'incidente does not belong to event tenant';
  end if;
  if new.hecho_id is not null and not exists (
    select 1 from public.hechos h where h.id = new.hecho_id and h.tenant_id = new.tenant_id and h.causa_id = new.causa_id
  ) then
    raise exception 'hecho does not belong to event tenant';
  end if;
  return new;
end;
$$;

drop trigger if exists expediente_events_same_tenant on public.expediente_events;
create trigger expediente_events_same_tenant
  before insert on public.expediente_events
  for each row execute function public.ensure_expediente_event_tenant();

create or replace function public.ensure_expediente_document_tenant()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.causas c where c.id = new.causa_id and c.tenant_id = new.tenant_id) then
    raise exception 'causa does not belong to document tenant';
  end if;
  if new.incidente_id is not null and not exists (
    select 1 from public.incidentes i where i.id = new.incidente_id and i.tenant_id = new.tenant_id
  ) then
    raise exception 'incidente does not belong to document tenant';
  end if;
  if new.event_id is not null and not exists (
    select 1 from public.expediente_events e where e.id = new.event_id and e.tenant_id = new.tenant_id and e.causa_id = new.causa_id
  ) then
    raise exception 'event does not belong to document tenant';
  end if;
  if new.hecho_id is not null and not exists (
    select 1 from public.hechos h where h.id = new.hecho_id and h.tenant_id = new.tenant_id and h.causa_id = new.causa_id
  ) then
    raise exception 'hecho does not belong to document tenant';
  end if;
  return new;
end;
$$;

drop trigger if exists expediente_documents_same_tenant on public.expediente_documents;
create trigger expediente_documents_same_tenant
  before insert or update on public.expediente_documents
  for each row execute function public.ensure_expediente_document_tenant();

revoke execute on function public.ensure_expediente_event_tenant() from public;
revoke execute on function public.ensure_expediente_document_tenant() from public;
