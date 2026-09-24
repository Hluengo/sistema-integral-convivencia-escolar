-- Registro persistente de reconsideraciones y apelaciones del expediente.
-- No se permite borrado desde cliente: la trazabilidad se conserva.

create table if not exists public.reconsideraciones (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants(id),
  causa_id text not null references public.causas(id) on delete cascade,
  incidente_id uuid references public.incidentes(id) on delete set null,
  tipo text not null check (tipo in ('reconsideracion', 'apelacion')),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'acogida', 'rechazada', 'desistida', 'vencida')),
  solicitada_at timestamptz not null default now(),
  resuelta_at timestamptz,
  solicitada_por text,
  solicitud text not null default '',
  resolucion text not null default '',
  documento_nombre text,
  documento_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reconsideraciones_tenant_causa
  on public.reconsideraciones (tenant_id, causa_id, solicitada_at);
create index if not exists idx_reconsideraciones_tenant_incidente
  on public.reconsideraciones (tenant_id, incidente_id, solicitada_at);

alter table public.reconsideraciones enable row level security;
grant select, insert, update on public.reconsideraciones to authenticated;

drop policy if exists reconsideraciones_tenant_select on public.reconsideraciones;
create policy reconsideraciones_tenant_select on public.reconsideraciones
  for select to authenticated using (tenant_id = public.current_tenant_id());

drop policy if exists reconsideraciones_tenant_insert on public.reconsideraciones;
create policy reconsideraciones_tenant_insert on public.reconsideraciones
  for insert to authenticated with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria','profesor_jefe','teacher','staff'])
  );

drop policy if exists reconsideraciones_tenant_update on public.reconsideraciones;
create policy reconsideraciones_tenant_update on public.reconsideraciones
  for update to authenticated using (tenant_id = public.current_tenant_id())
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria','profesor_jefe','teacher','staff'])
  );

create or replace function public.ensure_reconsideracion_same_tenant()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if not exists (
    select 1 from public.causas c
    where c.id = new.causa_id and c.tenant_id = new.tenant_id
  ) then
    raise exception 'causa does not belong to reconsideracion tenant';
  end if;
  if new.incidente_id is not null and not exists (
    select 1 from public.incidentes i
    where i.id = new.incidente_id and i.tenant_id = new.tenant_id
  ) then
    raise exception 'incidente does not belong to reconsideracion tenant';
  end if;
  return new;
end;
$$;

drop trigger if exists reconsideraciones_same_tenant on public.reconsideraciones;
create trigger reconsideraciones_same_tenant
  before insert or update on public.reconsideraciones
  for each row execute function public.ensure_reconsideracion_same_tenant();

create or replace function public.touch_reconsideracion_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reconsideraciones_touch_updated on public.reconsideraciones;
create trigger reconsideraciones_touch_updated
  before update on public.reconsideraciones
  for each row execute function public.touch_reconsideracion_updated_at();

revoke execute on function public.ensure_reconsideracion_same_tenant() from public;
