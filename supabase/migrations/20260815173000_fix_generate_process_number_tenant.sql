/** @license SPDX-License-Identifier: Apache-2.0 */

-- ============================================================================
-- Fase 1E — generate_process_number valida current_tenant_id()
--
-- Hallazgo D1: la función era EXECUTE para authenticated y SECURITY DEFINER,
-- aceptando p_tenant_id arbitrario. Un usuario autenticado podía invocarla con
-- el tenant de otro establecimiento y enumerar/correr conteos ajenos.
--
-- Fix:
--   - Si hay usuario autenticado (auth.uid() no nulo): el tenant efectivo es
--     current_tenant_id() y p_tenant_id debe coincidir; si no, se rechaza.
--   - Si no hay usuario (llamada service_role desde
--     confirm_disciplinary_process_atomic, que ya validó el tenant): se usa
--     p_tenant_id tal como hoy.
--
-- Concurrencia: COUNT(*) + 1 puede colisionar bajo escrituras simultáneas
-- (ponytail: secuencia dedicada por tenant cuando haya volumen real).
-- ============================================================================

create or replace function public.generate_process_number(p_tenant_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant_id uuid;
  v_year text;
  v_count integer;
  v_number text;
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

  select count(*) + 1
    into v_count
  from public.disciplinary_processes
  where tenant_id = v_tenant_id
    and extract(year from created_at) = extract(year from now());

  v_number := lpad(v_count::text, 4, '0');

  return 'DP-' || v_year || '-' || v_number;
end;
$$;

revoke all on function public.generate_process_number(uuid) from public;
grant execute on function public.generate_process_number(uuid) to authenticated;
grant execute on function public.generate_process_number(uuid) to service_role;