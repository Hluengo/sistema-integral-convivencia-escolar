-- @license SPDX-License-Identifier: Apache-2.0
-- Activa la cuenta de plataforma existente en Convivencia.
-- Ejecutar en Supabase Dashboard > SQL Editor.
-- Este script no crea usuarios ni modifica contraseñas.

begin;

do $$
declare
  v_user_id uuid;
  v_tenant_id uuid;
begin
  select u.id
    into v_user_id
  from auth.users u
  where lower(u.email) = lower('superadmin@colegio.cl')
  limit 1;

  if v_user_id is null then
    raise exception 'No existe un usuario Auth con el correo superadmin@colegio.cl';
  end if;

  select p.tenant_id
    into v_tenant_id
  from public.profiles p
  where p.user_id = v_user_id
  limit 1;

  if v_tenant_id is null then
    raise exception 'El usuario Auth existe, pero no tiene perfil o tenant asociado';
  end if;

  update public.profiles
  set role = 'superadmin',
      is_active = true,
      updated_at = now()
  where user_id = v_user_id;

  insert into public.app_memberships (
    tenant_id,
    user_id,
    application_code,
    role,
    is_active
  )
  values (
    v_tenant_id,
    v_user_id,
    'convivencia',
    'superadmin',
    true
  )
  on conflict (tenant_id, user_id, application_code)
  do update set
    role = excluded.role,
    is_active = true,
    updated_at = now();
end;
$$;

commit;

select
  u.email,
  p.user_id,
  p.tenant_id,
  p.role as profile_role,
  p.is_active as profile_active,
  m.role as membership_role,
  m.is_active as membership_active
from auth.users u
join public.profiles p on p.user_id = u.id
left join public.app_memberships m
  on m.user_id = u.id
 and m.tenant_id = p.tenant_id
 and m.application_code = 'convivencia'
where lower(u.email) = lower('superadmin@colegio.cl');
