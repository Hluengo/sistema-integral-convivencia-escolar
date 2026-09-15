-- Plan de Gestión de Convivencia: objetivos, acciones preventivas, responsables, fechas, indicadores y evidencias
create table if not exists public.plan_gestion (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants(id),
  ano int not null check (ano between 2024 and 2035),
  objetivo text not null check (char_length(objetivo) between 4 and 300),
  accion text not null check (char_length(accion) between 4 and 500),
  responsable text not null default '' check (char_length(responsable) <= 200),
  fecha_inicio date not null default current_date,
  fecha_fin date,
  indicador text not null default '' check (char_length(indicador) <= 300),
  evidencia_nombre text,
  evidencia_path text,
  estado text not null default 'pendiente' check (estado in ('pendiente','en_curso','cumplido','evaluado','atrasado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plan_gestion enable row level security;
grant select, insert, update, delete on public.plan_gestion to authenticated;

drop policy if exists plan_gestion_select on public.plan_gestion;
create policy plan_gestion_select on public.plan_gestion
  for select to authenticated using (tenant_id = public.current_tenant_id());

drop policy if exists plan_gestion_insert on public.plan_gestion;
create policy plan_gestion_insert on public.plan_gestion
  for insert to authenticated with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria'])
  );

drop policy if exists plan_gestion_update on public.plan_gestion;
create policy plan_gestion_update on public.plan_gestion
  for update to authenticated using (tenant_id = public.current_tenant_id())
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria'])
  );

drop policy if exists plan_gestion_delete on public.plan_gestion;
create policy plan_gestion_delete on public.plan_gestion
  for delete to authenticated using (
    tenant_id = public.current_tenant_id() and public.current_app_role() = any (array['admin','direccion'])
  );

create or replace function public.touch_plan_gestion_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end; $$;
drop trigger if exists plan_gestion_touch_updated on public.plan_gestion;
create trigger plan_gestion_touch_updated before update on public.plan_gestion
  for each row execute function public.touch_plan_gestion_updated_at();

create index if not exists idx_plan_gestion_tenant_ano on public.plan_gestion (tenant_id, ano);
create index if not exists idx_plan_gestion_tenant_estado on public.plan_gestion (tenant_id, estado);
