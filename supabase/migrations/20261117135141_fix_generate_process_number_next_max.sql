-- generate_process_number usaba COUNT(*) + 1. Al eliminar expedientes el
-- contador queda por debajo del último número emitido y el INSERT de
-- confirm_disciplinary_process_atomic choca con
-- idx_disciplinary_processes_number (23505): la confirmación del PDF devuelve
-- 500 y no se guarda nada (caso Arrue 2026-11-17, DP-2026-0176 ya existente).
-- Ahora el siguiente número sale del mayor sufijo numérico del año + 1.

create or replace function public.generate_process_number(p_tenant_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant_id uuid;
  v_year text;
  v_next integer;
begin
  if auth.uid() is not null then
    v_tenant_id := public.current_tenant_id();
    if v_tenant_id is null or v_tenant_id <> p_tenant_id then
      raise exception 'tenant mismatch' using errcode = '42501';
    end if;
  else
    v_tenant_id := p_tenant_id;
  end if;

  if v_tenant_id is null then
    raise exception 'tenant required' using errcode = '22023';
  end if;

  v_year := extract(year from now())::text;

  -- Serializa la numeración por colegio/año: dos confirmaciones simultáneas
  -- no pueden calcular el mismo máximo (el lock dura hasta el commit del RPC).
  perform pg_advisory_xact_lock(hashtextextended(v_tenant_id::text || ':' || v_year, 0));

  select coalesce(max(substring(process_number from '(\d+)$')::integer), 0) + 1
    into v_next
  from public.disciplinary_processes
  where tenant_id = v_tenant_id
    and process_number like 'DP-' || v_year || '-%';

  return 'DP-' || v_year || '-' || lpad(v_next::text, 4, '0');
end;
$$;

revoke all on function public.generate_process_number(uuid) from public;
grant execute on function public.generate_process_number(uuid) to authenticated;
grant execute on function public.generate_process_number(uuid) to service_role;
