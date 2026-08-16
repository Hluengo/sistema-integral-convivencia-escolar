-- @license SPDX-License-Identifier: Apache-2.0
-- Activa el acceso de plataforma del superadmin en la aplicación Convivencia.
--
-- La cuenta de plataforma ya existe en public.profiles. Esta migración no
-- crea usuarios Auth ni modifica contraseñas: sincroniza únicamente el rol
-- operativo y su membresía de aplicación.

begin;

-- El rol de plataforma debe ser válido también para perfiles creados antes
-- de la migración de superadmin.
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in (
    'superadmin', 'admin', 'direccion', 'convivencia', 'inspectoria',
    'profesor_jefe', 'teacher', 'inspector', 'user', 'staff'
  ));

-- El superadmin pertenece al tenant base, pero administra la plataforma de
-- forma transversal. La membresía activa permite que el cliente funcione
-- también cuando VITE_APP_MEMBERSHIPS_ENFORCED=true.
insert into public.app_memberships (
  tenant_id,
  user_id,
  application_code,
  role,
  is_active
)
select
  p.tenant_id,
  p.user_id,
  'convivencia',
  'superadmin',
  true
from public.profiles p
where p.role = 'superadmin'
  and p.tenant_id is not null
on conflict (tenant_id, user_id, application_code)
do update set
  role = excluded.role,
  is_active = true,
  updated_at = now();

create or replace function public.sync_convivencia_membership_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
     and (
       old.tenant_id is distinct from new.tenant_id
       or old.user_id is distinct from new.user_id
       or old.role is distinct from new.role
     ) then
    update public.app_memberships
    set is_active = false,
        updated_at = now()
    where tenant_id = old.tenant_id
      and user_id = old.user_id
      and application_code = 'convivencia';
  end if;

  if new.tenant_id is not null
     and new.role in (
       'superadmin', 'admin', 'direccion', 'convivencia', 'inspectoria',
       'profesor_jefe', 'teacher', 'inspector', 'user', 'staff'
     ) then
    insert into public.app_memberships (
      tenant_id,
      user_id,
      application_code,
      role,
      is_active
    )
    values (new.tenant_id, new.user_id, 'convivencia', new.role, true)
    on conflict (tenant_id, user_id, application_code)
    do update set
      role = excluded.role,
      is_active = true,
      updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_convivencia_membership on public.profiles;
create trigger trg_sync_convivencia_membership
  after insert or update of tenant_id, user_id, role on public.profiles
  for each row
  execute function public.sync_convivencia_membership_from_profile();

revoke all on function public.sync_convivencia_membership_from_profile() from public, anon, authenticated;
grant execute on function public.sync_convivencia_membership_from_profile() to service_role, postgres;

commit;

select pg_notify('pgrst', 'reload schema');
