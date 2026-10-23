-- Permite corregir el apoderado titular solo dentro del flujo autorizado de cartas.

create or replace function public.update_carta_apoderado_nombre(
  p_carta_id uuid,
  p_apoderado_nombre text
)
returns boolean
language plpgsql
security definer
set search_path = public
set row_security = on
as $$
declare
  v_student_id uuid;
  v_name text := nullif(trim(p_apoderado_nombre), '');
  v_role text := public.current_app_role();
  v_tenant_id uuid := public.current_tenant_id();
begin
  if auth.uid() is null or v_tenant_id is null or v_name is null then
    return false;
  end if;

  if v_role is null or v_role not in (
    'superadmin', 'admin', 'direccion', 'convivencia', 'inspectoria',
    'inspector', 'staff'
  ) then
    return false;
  end if;

  select c.student_id
    into v_student_id
    from public.cartas_disciplinarias c
   where c.id = p_carta_id
     and c.tenant_id = v_tenant_id;

  if v_student_id is null then
    return false;
  end if;

  update public.students
     set apoderado_nombre = v_name,
         apoderado_actualizado_at = now()
   where id = v_student_id
     and tenant_id = v_tenant_id;

  if not found then
    return false;
  end if;

  update public.cartas_disciplinarias
     set apoderado_name = v_name,
         updated_at = now()
   where id = p_carta_id
     and tenant_id = v_tenant_id;

  return found;
end;
$$;

revoke all on function public.update_carta_apoderado_nombre(uuid, text) from public, anon;
grant execute on function public.update_carta_apoderado_nombre(uuid, text) to authenticated, service_role;
