-- @license SPDX-License-Identifier: Apache-2.0
-- Corrige la sincronización futura de membresías del superadmin.
-- Ejecutar en Supabase SQL Editor.
-- No recrea tablas ni modifica contraseñas.

begin;

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
       'superadmin',
       'admin',
       'direccion',
       'convivencia',
       'inspectoria',
       'profesor_jefe',
       'teacher',
       'inspector',
       'user',
       'staff'
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

revoke all on function public.sync_convivencia_membership_from_profile() from public, anon, authenticated;
grant execute on function public.sync_convivencia_membership_from_profile() to service_role, postgres;

commit;

select
  pg_get_functiondef(p.oid) like '%superadmin%' as includes_superadmin,
  p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'sync_convivencia_membership_from_profile';
