-- A08/A12: la RPC debe ser invoker, atómica e idempotente bajo RLS real.
create function pg_temp.must_reject(statement text) returns void language plpgsql security invoker as $$
begin
  begin
    execute statement;
  exception when insufficient_privilege or invalid_parameter_value then return;
  end;
  raise exception 'La RPC aceptó una solicitud inválida';
end $$;
create temporary table fixture_request as select jsonb_build_object(
  'courseId', '50000000-0000-4000-8000-000000000001',
  'studentIds', jsonb_build_array('60000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002'),
  'fechaHora', '2026-04-15T12:30:00.000Z', 'lugar', 'Patio ficticio',
  'tipo', 'Art. 25 N° 1 · Grave', 'descripcion', 'Hechos ficticios para probar una transacción.',
  'responsable', 'Inspectoría ficticia', 'conductaRiceId', 'G1', 'tipoInfraccion', 'Grave', 'comprometeAulaSegura', false
) as payload;
grant select on fixture_request to authenticated;

create function pg_temp.fail_second_causa() returns trigger language plpgsql as $$
begin
  if new.student_id = '60000000-0000-4000-8000-000000000002' then
    raise exception 'Fallo simulado en el segundo estudiante';
  end if;
  return new;
end $$;
create trigger runbook_fail_second before insert on public.causas for each row execute function pg_temp.fail_second_causa();
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);
do $$
begin
  begin
    perform public.create_incidente_with_causas('70000000-0000-4000-8000-000000000001', (select payload from fixture_request), (select defaults from fixture_initial), (select checklist from fixture_initial));
    raise exception 'No se ejecutó el fallo simulado' using errcode = 'XX000';
  exception when raise_exception then
    assert sqlerrm = 'Fallo simulado en el segundo estudiante';
  end;
  assert (select count(*) = 0 from public.incidentes), 'Quedó un incidente parcial';
  assert (select count(*) = 0 from public.causas), 'Quedó un expediente parcial';
  assert (select count(*) = 0 from public.incidente_creation_requests), 'Quedó una solicitud parcialmente confirmada';
  assert (select count(*) = 0 from public.checklist_items), 'Quedó un checklist parcial';
  assert (select count(*) = 0 from public.bitacora_entries), 'Quedó una bitácora parcial';
end $$;
reset role;
drop trigger runbook_fail_second on public.causas;
insert into public.causas (id, tenant_id, estudiante_nombre, estudiante_curso, nna_protected_name, run_estudiante, fecha_apertura, estado_actual, tipo_infraccion, responsable, fecha_ultima_actualizacion)
values ('DC-' || extract(year from now() at time zone 'America/Santiago')::text || '-999', '30000000-0000-4000-8000-000000000002', 'Estudiante ficticio ajeno', '8 B', 'E. F.', '', '2026-10-22', 'Recepción de Denuncia', 'Grave', 'Inspectoría ficticia', '2026-10-22');

set local role authenticated;
do $$
declare original jsonb; repeated jsonb; payload jsonb := (select f.payload from fixture_request f);
  defaults jsonb := (select f.defaults from fixture_initial f); checklist jsonb := (select f.checklist from fixture_initial f);
  actor record; before_count integer;
begin
  original := public.create_incidente_with_causas('70000000-0000-4000-8000-000000000001', payload, defaults, checklist);
  repeated := public.create_incidente_with_causas('70000000-0000-4000-8000-000000000001', payload, defaults, checklist);
  assert original = repeated, 'El reintento cambió el incidente o sus expedientes';
  perform set_config('TimeZone','America/Santiago',true);
  repeated := public.create_incidente_with_causas('70000000-0000-4000-8000-000000000001', payload, defaults, checklist);
  assert original->'causaIds' = repeated->'causaIds' and original->'incidente'->>'id' = repeated->'incidente'->>'id', 'El huso horario alteró la idempotencia';
  perform set_config('TimeZone','UTC',true);
  assert jsonb_array_length(original->'causaIds') = 2;
  assert original->'causaIds'->>0 = 'DC-' || extract(year from now() at time zone 'America/Santiago')::text || '-1000', 'El correlativo se truncó después de 999';
  assert (original->'incidente'->>'fecha_hora')::timestamptz = '2026-04-15T12:30:00Z'::timestamptz, 'Se sustituyó la fecha del hecho';
  assert (select count(*) = 2 from public.causas);
  assert (select count(*) = 76 from public.checklist_items), 'Faltan checklists iniciales completos';
  assert (select count(*) = 0 from public.checklist_items where completado), 'Se acreditaron hitos no realizados';
  assert (select count(*) = 2 from public.bitacora_entries), 'Falta la apertura individual de cada expediente';
  assert (select count(distinct student_id) = 2 from public.causas), 'Se mezclaron estudiantes';
  before_count := (select count(*) from public.incidentes);
  perform pg_temp.must_reject(format('select public.create_incidente_with_causas(%L,%L::jsonb,%L::jsonb,%L::jsonb)',
    '70000000-0000-4000-8000-000000000001', payload || '{"descripcion":"Otro contenido"}'::jsonb, defaults, checklist));
  perform pg_temp.must_reject(format('select public.create_incidente_with_causas(%L,%L::jsonb,%L::jsonb,%L::jsonb)',
    '70000000-0000-4000-8000-000000000002', payload || '{"studentIds":["60000000-0000-4000-8000-000000000001","60000000-0000-4000-8000-000000000001"]}'::jsonb, defaults, checklist));
  perform pg_temp.must_reject(format('select public.create_incidente_with_causas(%L,%L::jsonb,%L::jsonb,%L::jsonb)',
    '70000000-0000-4000-8000-000000000003', payload || '{"studentIds":["60000000-0000-4000-8000-000000000001","60000000-0000-4000-8000-000000000003"]}'::jsonb, defaults, checklist));
  perform pg_temp.must_reject(format('select public.create_incidente_with_causas(%L,%L::jsonb,%L::jsonb,%L::jsonb)',
    '70000000-0000-4000-8000-000000000004', payload || '{"conductaRiceId":"no-existe"}'::jsonb, defaults, checklist));
  perform pg_temp.must_reject(format('select public.create_incidente_with_causas(%L,%L::jsonb,%L::jsonb,%L::jsonb)',
    '70000000-0000-4000-8000-000000000005', payload, defaults, '[]'));
  assert (select count(*) = before_count from public.incidentes), 'Una denegación dejó un incidente';

  for actor in select * from fixture_roles order by n loop
    perform set_config('request.jwt.claim.sub', actor.user_id::text, true);
    if actor.can_write then
      perform public.create_incidente_with_causas(gen_random_uuid(), payload, defaults, checklist);
    else
      perform pg_temp.must_reject(format('select public.create_incidente_with_causas(%L,%L::jsonb,%L::jsonb,%L::jsonb)', gen_random_uuid(), payload, defaults, checklist));
    end if;
  end loop;
end $$;
reset role;
select 'A08/A12: rollback del segundo estudiante, reintento, contenido alterado, duplicados, tenant y fecha' as resultado;
