-- Seguimiento post-cierre: programa de intervención, medidas formativas, responsable, cumplimiento y evaluación
create table if not exists public.seguimiento_planes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants(id),
  causa_id text not null references public.causas(id) on delete cascade,
  incidente_id uuid references public.incidentes(id) on delete set null,
  titulo text not null check (char_length(titulo) between 4 and 200),
  descripcion text not null default '',
  responsable text not null default '',
  fecha_inicio date not null default current_date,
  fecha_fin date,
  estado text not null default 'pendiente' check (estado in ('pendiente','en_curso','cumplido','incumplido','evaluado')),
  cumplimiento text not null default '' check (char_length(cumplimiento) <= 1000),
  evaluacion text not null default '' check (char_length(evaluacion) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.seguimiento_planes enable row level security;
grant select, insert, update, delete on public.seguimiento_planes to authenticated;

drop policy if exists seguimiento_planes_select on public.seguimiento_planes;
create policy seguimiento_planes_select on public.seguimiento_planes
  for select to authenticated using (tenant_id = public.current_tenant_id());

drop policy if exists seguimiento_planes_insert on public.seguimiento_planes;
create policy seguimiento_planes_insert on public.seguimiento_planes
  for insert to authenticated with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria','profesor_jefe','teacher','staff'])
  );

drop policy if exists seguimiento_planes_update on public.seguimiento_planes;
create policy seguimiento_planes_update on public.seguimiento_planes
  for update to authenticated using (tenant_id = public.current_tenant_id())
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria','profesor_jefe','teacher','staff'])
  );

drop policy if exists seguimiento_planes_delete on public.seguimiento_planes;
create policy seguimiento_planes_delete on public.seguimiento_planes
  for delete to authenticated using (
    tenant_id = public.current_tenant_id() and public.current_app_role() = any (array['admin','direccion','convivencia'])
  );

create or replace function public.ensure_seguimiento_same_tenant()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if not exists (select 1 from public.causas c where c.id=new.causa_id and c.tenant_id=new.tenant_id) then
    raise exception 'causa does not belong to seguimiento tenant';
  end if;
  return new;
end; $$;

drop trigger if exists seguimiento_same_tenant on public.seguimiento_planes;
create trigger seguimiento_same_tenant before insert or update of causa_id, tenant_id on public.seguimiento_planes
  for each row execute function public.ensure_seguimiento_same_tenant();

create or replace function public.touch_seguimiento_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end; $$;
drop trigger if exists seguimiento_touch_updated on public.seguimiento_planes;
create trigger seguimiento_touch_updated before update on public.seguimiento_planes
  for each row execute function public.touch_seguimiento_updated_at();

create index if not exists idx_seguimiento_tenant_causa on public.seguimiento_planes (tenant_id, causa_id);
create index if not exists idx_seguimiento_tenant_incidente on public.seguimiento_planes (tenant_id, incidente_id);

revoke execute on function public.ensure_seguimiento_same_tenant() from public;
