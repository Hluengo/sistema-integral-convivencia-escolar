-- A01: propuesta local para objetos compartidos. Requiere coordinación con
-- Inasistencias y aprobación antes de aplicarse fuera del entorno aislado.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_role text;
  v_actor_tenant uuid;
  v_database_role text := current_setting('role', true);
  v_admin_membership boolean;
begin
  if auth.uid() is null then
    -- La ausencia de sub no acredita por sí sola una operación interna.
    if v_database_role = 'service_role'
       or (v_database_role in ('none', 'postgres', 'supabase_admin', 'supabase_auth_admin')
           and session_user in ('postgres', 'supabase_admin', 'supabase_auth_admin')) then
      return new;
    end if;
    raise exception 'Se requiere una identidad autorizada para modificar perfiles'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception 'No se puede reasignar la identidad de un perfil'
        using errcode = '42501';
    end if;
    if new.role is not distinct from old.role
       and new.tenant_id is not distinct from old.tenant_id
       and new.is_active is not distinct from old.is_active then
      return new;
    end if;
  elsif new.user_id = auth.uid() and new.role is null and new.tenant_id is null then
    return new;
  end if;

  v_actor_role := public.current_app_role();
  v_actor_tenant := public.current_tenant_id();
  select exists (
    select 1
    from public.app_memberships m
    join public.applications a on a.code = m.application_code and a.is_active
    where m.user_id = auth.uid() and m.tenant_id = v_actor_tenant and m.is_active
      and m.role = any (case when v_actor_role = 'superadmin'
        then array['superadmin'] else array['admin', 'direccion'] end)
  ) into v_admin_membership;

  if coalesce(v_actor_role, '') not in ('admin', 'direccion', 'superadmin')
     or not v_admin_membership then
    raise exception 'Solo administración activa puede cambiar privilegios del perfil'
      using errcode = '42501';
  end if;
  if v_actor_role = 'superadmin' then
    return new;
  end if;
  if new.role = 'superadmin' or (tg_op = 'UPDATE' and old.role = 'superadmin') then
    raise exception 'Solo un superadmin puede modificar privilegios de superadmin'
      using errcode = '42501';
  end if;
  if new.tenant_id is distinct from v_actor_tenant
     or (tg_op = 'UPDATE' and old.tenant_id is distinct from v_actor_tenant) then
    raise exception 'La administración local solo puede gestionar su colegio'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.sync_convivencia_membership_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' then
    if old.tenant_id is not distinct from new.tenant_id
       and old.user_id is not distinct from new.user_id
       and old.role is not distinct from new.role
       and old.is_active is not distinct from new.is_active then
      return new;
    end if;
    if old.tenant_id is distinct from new.tenant_id or old.user_id is distinct from new.user_id then
      update public.app_memberships set is_active = false, updated_at = now()
      where tenant_id = old.tenant_id and user_id = old.user_id and application_code = 'convivencia';
    end if;
  end if;

  if new.tenant_id is not null and new.role in (
    'superadmin', 'admin', 'direccion', 'convivencia', 'inspectoria',
    'profesor_jefe', 'teacher', 'inspector', 'user', 'staff'
  ) then
    insert into public.app_memberships as membership (tenant_id, user_id, application_code, role, is_active)
    values (new.tenant_id, new.user_id, 'convivencia', new.role, new.is_active)
    on conflict (tenant_id, user_id, application_code) do update set
      role = excluded.role,
      -- Una revocación se levanta explícitamente desde administración, no al sincronizar un perfil.
      is_active = membership.is_active and excluded.is_active,
      updated_at = now();
  else
    update public.app_memberships set is_active = false, updated_at = now()
    where tenant_id = new.tenant_id and user_id = new.user_id and application_code = 'convivencia';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_convivencia_membership on public.profiles;
create trigger trg_sync_convivencia_membership
after insert or update of tenant_id, user_id, role, is_active on public.profiles
for each row execute function public.sync_convivencia_membership_from_profile();
