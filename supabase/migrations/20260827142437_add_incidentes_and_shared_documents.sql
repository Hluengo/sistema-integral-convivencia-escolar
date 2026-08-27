-- Incidentes grupales: un hecho común puede tener varias causas individuales.
-- Los expedientes históricos quedan sin incidente_id y siguen funcionando.

create table if not exists public.incidentes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id()
    references public.tenants(id),
  fecha_hora timestamptz not null default now(),
  lugar text not null default '',
  tipo text not null default 'Consumo de alcohol',
  descripcion text not null default '',
  responsable text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.incidentes enable row level security;

grant select, insert, update, delete on public.incidentes to authenticated;

drop policy if exists incidentes_tenant_select on public.incidentes;
create policy incidentes_tenant_select on public.incidentes
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists incidentes_tenant_insert on public.incidentes;
create policy incidentes_tenant_insert on public.incidentes
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array[
      'admin', 'direccion', 'convivencia', 'inspectoria',
      'profesor_jefe', 'teacher', 'staff'
    ])
  );

drop policy if exists incidentes_tenant_update on public.incidentes;
create policy incidentes_tenant_update on public.incidentes
  for update to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array[
      'admin', 'direccion', 'convivencia', 'inspectoria',
      'profesor_jefe', 'teacher', 'staff'
    ])
  );

drop policy if exists incidentes_tenant_delete on public.incidentes;
create policy incidentes_tenant_delete on public.incidentes
  for delete to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin', 'direccion'])
  );

alter table public.causas
  add column if not exists incidente_id uuid references public.incidentes(id) on delete set null;

create index if not exists idx_causas_tenant_incidente
  on public.causas (tenant_id, incidente_id);

create or replace function public.ensure_causa_incidente_same_tenant()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.incidente_id is not null and not exists (
    select 1
    from public.incidentes i
    where i.id = new.incidente_id
      and i.tenant_id = new.tenant_id
  ) then
    raise exception 'The incident does not belong to the causa tenant';
  end if;
  return new;
end;
$$;

drop trigger if exists causas_incidente_same_tenant on public.causas;
create trigger causas_incidente_same_tenant
  before insert or update of incidente_id, tenant_id on public.causas
  for each row execute function public.ensure_causa_incidente_same_tenant();

revoke execute on function public.ensure_causa_incidente_same_tenant() from public;

-- Storage keeps the existing private bucket and role model. A document can be
-- rooted at a causa or at an incident that already has at least one causa in
-- the current tenant.
drop policy if exists "documentos_convivencia_insert_member" on storage.objects;
drop policy if exists "documentos_convivencia_select_member" on storage.objects;
drop policy if exists "documentos_convivencia_delete_member" on storage.objects;

create policy "documentos_convivencia_insert_member"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'documentos_convivencia'
  and (storage.foldername(name))[2] in ('documentos', 'avances')
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role in ('superadmin', 'admin', 'direccion', 'convivencia', 'inspectoria',
        'profesor_jefe', 'teacher', 'inspector', 'user', 'staff')
      and m.is_active
      and m.tenant_id = public.current_tenant_id()
      and (
        exists (
          select 1 from public.causas c
          where c.id = (storage.foldername(name))[1]
            and c.tenant_id = m.tenant_id
        )
        or exists (
          select 1 from public.incidentes i
          join public.causas c on c.incidente_id = i.id
          where i.id::text = (storage.foldername(name))[1]
            and i.tenant_id = m.tenant_id
            and c.tenant_id = m.tenant_id
        )
      )
  )
);

create policy "documentos_convivencia_select_member"
on storage.objects
for select to authenticated
using (
  bucket_id = 'documentos_convivencia'
  and (storage.foldername(name))[2] in ('documentos', 'avances')
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role in ('superadmin', 'admin', 'direccion', 'convivencia', 'inspectoria',
        'profesor_jefe', 'teacher', 'inspector', 'user', 'staff')
      and m.is_active
      and m.tenant_id = public.current_tenant_id()
      and (
        exists (
          select 1 from public.causas c
          where c.id = (storage.foldername(name))[1]
            and c.tenant_id = m.tenant_id
        )
        or exists (
          select 1 from public.incidentes i
          join public.causas c on c.incidente_id = i.id
          where i.id::text = (storage.foldername(name))[1]
            and i.tenant_id = m.tenant_id
            and c.tenant_id = m.tenant_id
        )
      )
  )
);

create policy "documentos_convivencia_delete_member"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'documentos_convivencia'
  and (storage.foldername(name))[2] in ('documentos', 'avances')
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role in ('superadmin', 'admin', 'direccion', 'convivencia', 'inspectoria',
        'profesor_jefe', 'teacher', 'inspector', 'user', 'staff')
      and m.is_active
      and m.tenant_id = public.current_tenant_id()
      and (
        exists (
          select 1 from public.causas c
          where c.id = (storage.foldername(name))[1]
            and c.tenant_id = m.tenant_id
        )
        or exists (
          select 1 from public.incidentes i
          join public.causas c on c.incidente_id = i.id
          where i.id::text = (storage.foldername(name))[1]
            and i.tenant_id = m.tenant_id
            and c.tenant_id = m.tenant_id
        )
      )
  )
);
