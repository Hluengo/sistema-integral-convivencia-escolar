-- Matriz Hecho–Evidencia–RICE (MVP prioridad 3)
-- hechos por causa, evidencias por storage path, join N:M para caso colectivo

create table if not exists public.hechos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants(id),
  causa_id text not null references public.causas(id) on delete cascade,
  incidente_id uuid references public.incidentes(id) on delete set null,
  titulo text not null check (char_length(titulo) between 4 and 200),
  descripcion text not null default '',
  estado text not null default 'denunciado' check (estado in ('denunciado','acreditado','parcial','no_acreditado')),
  participacion_acreditada boolean not null default false,
  rice_articulo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hecho_evidencias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants(id),
  hecho_id uuid not null references public.hechos(id) on delete cascade,
  causa_id text not null references public.causas(id) on delete cascade,
  evidencia_path text not null,
  evidencia_nombre text not null default '',
  created_at timestamptz not null default now(),
  unique (hecho_id, evidencia_path)
);

alter table public.hechos enable row level security;
alter table public.hecho_evidencias enable row level security;

grant select, insert, update, delete on public.hechos to authenticated;
grant select, insert, delete on public.hecho_evidencias to authenticated;

-- RLS: tenant isolation
drop policy if exists hechos_tenant_select on public.hechos;
create policy hechos_tenant_select on public.hechos
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists hechos_tenant_insert on public.hechos;
create policy hechos_tenant_insert on public.hechos
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria','profesor_jefe','teacher','staff'])
  );

drop policy if exists hechos_tenant_update on public.hechos;
create policy hechos_tenant_update on public.hechos
  for update to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria','profesor_jefe','teacher','staff'])
  );

drop policy if exists hechos_tenant_delete on public.hechos;
create policy hechos_tenant_delete on public.hechos
  for delete to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria'])
  );

drop policy if exists hecho_evidencias_tenant_select on public.hecho_evidencias;
create policy hecho_evidencias_tenant_select on public.hecho_evidencias
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists hecho_evidencias_tenant_insert on public.hecho_evidencias;
create policy hecho_evidencias_tenant_insert on public.hecho_evidencias
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria','profesor_jefe','teacher','staff'])
  );

drop policy if exists hecho_evidencias_tenant_delete on public.hecho_evidencias;
create policy hecho_evidencias_tenant_delete on public.hecho_evidencias
  for delete to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria'])
  );

-- Tenant consistency triggers
create or replace function public.ensure_hecho_same_tenant()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if not exists (select 1 from public.causas c where c.id = new.causa_id and c.tenant_id = new.tenant_id) then
    raise exception 'causa does not belong to hecho tenant';
  end if;
  if new.incidente_id is not null and not exists (select 1 from public.incidentes i where i.id = new.incidente_id and i.tenant_id = new.tenant_id) then
    raise exception 'incidente does not belong to hecho tenant';
  end if;
  return new;
end;
$$;

drop trigger if exists hechos_same_tenant on public.hechos;
create trigger hechos_same_tenant before insert or update of causa_id, incidente_id, tenant_id on public.hechos
  for each row execute function public.ensure_hecho_same_tenant();

create or replace function public.ensure_hecho_evidencia_same_tenant()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if not exists (select 1 from public.hechos h where h.id = new.hecho_id and h.tenant_id = new.tenant_id) then
    raise exception 'hecho does not belong to evidencia tenant';
  end if;
  return new;
end;
$$;

drop trigger if exists hecho_evidencias_same_tenant on public.hecho_evidencias;
create trigger hecho_evidencias_same_tenant before insert or update of hecho_id, tenant_id on public.hecho_evidencias
  for each row execute function public.ensure_hecho_evidencia_same_tenant();

-- updated_at
create or replace function public.touch_hechos_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists hechos_touch_updated on public.hechos;
create trigger hechos_touch_updated before update on public.hechos
  for each row execute function public.touch_hechos_updated_at();

-- indexes
create index if not exists idx_hechos_tenant_causa on public.hechos (tenant_id, causa_id);
create index if not exists idx_hechos_tenant_incidente on public.hechos (tenant_id, incidente_id);
create index if not exists idx_hecho_evidencias_hecho on public.hecho_evidencias (hecho_id);
create index if not exists idx_hecho_evidencias_tenant_causa on public.hecho_evidencias (tenant_id, causa_id);

revoke execute on function public.ensure_hecho_same_tenant() from public;
revoke execute on function public.ensure_hecho_evidencia_same_tenant() from public;
