-- #1: un miembro podía ascenderse solo. La política profiles_update_consolidated
-- permite `user_id = auth.uid()` y current_app_role() lee justamente
-- profiles.role, así que un UPDATE propio con role='admin' se autorizaba a sí
-- mismo (y arrastraba app_memberships vía sync_convivencia_membership_from_profile).
--
-- Se protegen rol, colegio y vigencia con un trigger previo. Las rutas de
-- administración usan service_role (sin usuario en el JWT) y ya verifican el
-- rol, por lo que quedan exentas; handle_new_user sólo inserta user_id+email.

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) then
    raise exception 'Precondition failed: public.profiles must exist';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
  ) then
    raise exception 'Precondition failed: profiles.role must exist';
  end if;
end
$$;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_is_admin boolean;
begin
  -- Sin usuario autenticado el cambio viene de service_role o de un proceso
  -- interno (handle_new_user, rutas /api/admin y /api/platform).
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Alta inicial del perfil: sin rol ni colegio no hay privilegio que otorgar.
    if new.role is null and new.tenant_id is null then
      return new;
    end if;
  elsif new.role is not distinct from old.role
        and new.tenant_id is not distinct from old.tenant_id
        and new.is_active is not distinct from old.is_active then
    return new;
  end if;

  v_actor_is_admin :=
    public.current_app_role() = any (array['admin', 'direccion', 'superadmin'])
    or public.is_superuser();

  if not v_actor_is_admin then
    raise exception 'Solo administración puede cambiar rol, colegio o vigencia del perfil'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_privileges on public.profiles;
create trigger trg_profiles_protect_privileges
  before insert or update on public.profiles
  for each row
  execute function public.protect_profile_privileges();
