-- A08/A12: alta completa por invoker, sin pasos parciales ni reintentos duplicados.
create table public.incidente_creation_requests (
  tenant_id uuid not null references public.tenants(id),
  actor_user_id uuid not null references auth.users(id),
  request_id uuid not null,
  request_hash text not null,
  incidente_id uuid references public.incidentes(id) on delete set null,
  causa_ids text[] not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, actor_user_id, request_id)
);
create index incidente_creation_requests_incidente_idx on public.incidente_creation_requests(incidente_id);
create index incidente_creation_requests_actor_idx on public.incidente_creation_requests(actor_user_id);
alter table public.incidente_creation_requests enable row level security;
grant select, insert on public.incidente_creation_requests to authenticated;
create policy incidente_requests_select on public.incidente_creation_requests for select to authenticated
using (tenant_id = public.current_tenant_id() and actor_user_id = auth.uid() and public.current_convivencia_role() is not null);
create policy incidente_requests_insert on public.incidente_creation_requests for insert to authenticated
with check (tenant_id = public.current_tenant_id() and actor_user_id = auth.uid()
  and public.current_convivencia_role() in ('superadmin','admin','direccion','convivencia','inspectoria','inspector','staff'));

-- Conserva el contrato del correlativo global sin truncarlo al superar 999.
create or replace function public.next_causa_correlativo(p_year integer)
returns text language sql stable security definer set search_path = public, pg_temp
as $$
  select 'DC-' || p_year::text || '-' || lpad(next_value, greatest(3, length(next_value)), '0')
  from (
    select (coalesce(max((regexp_match(id, '(\d+)$'))[1]::bigint), 0) + 1)::text as next_value
    from public.causas where id ~ ('^DC-' || p_year::text || '-\d+$')
  ) counter;
$$;

create or replace function public.create_incidente_with_causas(
  p_request_id uuid,
  p_request jsonb,
  p_defaults jsonb,
  p_initial_checklist jsonb
)
returns jsonb language plpgsql security invoker
set search_path = public, extensions, pg_temp
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_actor uuid := auth.uid();
  v_role text := public.current_convivencia_role();
  v_course uuid;
  v_students uuid[];
  v_fecha timestamptz;
  v_aula boolean;
  v_conducta text;
  v_gravedad text;
  v_input jsonb;
  v_hash text;
  v_previous record;
  v_incidente_id uuid;
  v_causa_ids text[] := array[]::text[];
  v_causa_id text;
  v_incidente jsonb;
  v_student record;
  v_today date := (now() at time zone 'America/Santiago')::date;
  v_deadline date;
  v_plazo integer;
  v_expected_ids text[];
  v_attempt integer;
begin
  if v_actor is null or v_tenant is null
     or coalesce(v_role, '') not in ('superadmin','admin','direccion','convivencia','inspectoria','inspector','staff') then
    raise exception 'No tiene permiso para crear expedientes de Convivencia' using errcode = '42501';
  end if;
  if p_request_id is null or jsonb_typeof(p_request) is distinct from 'object'
     or jsonb_typeof(p_request->'studentIds') is distinct from 'array'
     or jsonb_typeof(p_request->'comprometeAulaSegura') is distinct from 'boolean'
     or exists (select 1 from unnest(array['courseId','fechaHora','lugar','tipo','descripcion','responsable','conductaRiceId','tipoInfraccion']) key
       where jsonb_typeof(p_request->key) is distinct from 'string') then
    raise exception 'La solicitud del incidente no es válida' using errcode = '22023';
  end if;
  begin
    v_course := (p_request->>'courseId')::uuid;
    v_fecha := (p_request->>'fechaHora')::timestamptz;
    v_aula := (p_request->>'comprometeAulaSegura')::boolean;
    select array_agg(value::uuid order by value::uuid) into v_students
    from jsonb_array_elements_text(p_request->'studentIds');
  exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
    raise exception 'Revise curso, estudiantes y fecha del incidente' using errcode = '22023';
  end;
  if v_course is null or v_fecha is null or not isfinite(v_fecha)
     or coalesce(cardinality(v_students), 0) not between 2 and 100
     or exists (select 1 from unnest(v_students) id where id is null)
     or (select count(distinct id) from unnest(v_students) id) <> cardinality(v_students) then
    raise exception 'Seleccione entre dos y cien estudiantes distintos y una fecha válida' using errcode = '22023';
  end if;
  v_conducta := p_request->>'conductaRiceId';
  v_gravedad := case
    when v_conducta ~ '^L([1-9]|1[0-5])$' then 'Leve'
    when v_conducta ~ '^G[1-9]$' then 'Grave'
    when v_conducta ~ '^MG([1-9]|1[0-2])$' then 'Muy Grave'
    when v_conducta ~ '^AS[1-5]$' then 'Gravísima'
  end;
  if v_gravedad is null or (p_request->>'tipoInfraccion') is distinct from v_gravedad
     or length(btrim(coalesce(p_request->>'descripcion',''))) not between 10 and 10000
     or length(btrim(coalesce(p_request->>'responsable',''))) not between 1 and 500
     or length(btrim(coalesce(p_request->>'lugar',''))) not between 1 and 500
     or length(btrim(coalesce(p_request->>'tipo',''))) not between 1 and 500 then
    raise exception 'Revise conducta, gravedad, relato, lugar y responsable' using errcode = '22023';
  end if;
  v_input := jsonb_build_object(
    'courseId', v_course, 'studentIds', to_jsonb(v_students), 'fechaHora', to_char(v_fecha at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'lugar', btrim(p_request->>'lugar'), 'tipo', btrim(p_request->>'tipo'),
    'descripcion', btrim(p_request->>'descripcion'), 'responsable', btrim(p_request->>'responsable'),
    'conductaRiceId', v_conducta, 'tipoInfraccion', v_gravedad, 'comprometeAulaSegura', v_aula
  );
  v_hash := encode(extensions.digest(v_input::text, 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(v_tenant::text || ':' || v_actor::text || ':' || p_request_id::text, 0));
  select request_hash, incidente_id, causa_ids into v_previous
  from public.incidente_creation_requests
  where tenant_id = v_tenant and actor_user_id = v_actor and request_id = p_request_id;
  if found then
    if v_previous.request_hash <> v_hash then
      raise exception 'La solicitud ya se confirmó con otro contenido. Revise el incidente antes de iniciar otra' using errcode = '22023';
    end if;
    v_incidente_id := v_previous.incidente_id;
    v_causa_ids := v_previous.causa_ids;
    if v_incidente_id is null or (select count(*) from public.causas where id = any(v_causa_ids) and tenant_id = v_tenant) <> cardinality(v_causa_ids) then
      raise exception 'La solicitud ya se confirmó y sus registros fueron modificados. Revise el historial' using errcode = '22023';
    end if;
  else
    if not exists (select 1 from public.courses where id = v_course and tenant_id = v_tenant)
       or (select count(*) from public.students where id = any(v_students) and tenant_id = v_tenant and course_id = v_course) <> cardinality(v_students) then
      raise exception 'El curso o sus estudiantes no pertenecen al colegio activo' using errcode = '22023';
    end if;
    -- El cálculo de feriados se reutiliza desde causaFactory; la DB valida su estructura y límites.
    begin
      v_deadline := (p_defaults->>'fechaLimiteInvestigacion')::date;
      v_plazo := (p_defaults->>'plazoInvestigacionDias')::integer;
      if (p_defaults->>'fechaApertura')::date is distinct from v_today
         or (p_defaults->>'fechaInicioInvestigacion')::date is distinct from v_today
         or v_deadline is null or not isfinite(v_deadline)
         or v_plazo is distinct from (case when v_aula or v_gravedad in ('Muy Grave','Gravísima') then 10 else 60 end)
         or (v_plazo = 60 and v_deadline <> v_today + 60)
         or (v_plazo = 10 and v_deadline not between v_today + 10 and v_today + 40) then
        raise exception 'Los plazos iniciales del expediente no son válidos' using errcode = '22023';
      end if;
    exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
      raise exception 'Los plazos iniciales del expediente no son válidos' using errcode = '22023';
    end;
    select array_agg(prefix || n::text) into v_expected_ids
    from (values ('chk_rec_',3),('chk_inv_',9),('chk_res_',9),('chk_imp_',7),('chk_seg_',4),('chk_legal_',6)) phases(prefix, amount)
    cross join lateral generate_series(1, amount) n;
    if jsonb_typeof(p_initial_checklist) is distinct from 'array' then
      raise exception 'Falta el checklist inicial del expediente' using errcode = '22023';
    end if;
    if jsonb_array_length(p_initial_checklist) <> cardinality(v_expected_ids)
       or (select count(distinct entry->>'id') from jsonb_array_elements(p_initial_checklist) entry) <> cardinality(v_expected_ids)
       or exists (
         select 1 from jsonb_array_elements(p_initial_checklist) entry
         where coalesce(entry->>'id','') <> all(v_expected_ids)
           or jsonb_typeof(entry->'label') is distinct from 'string'
           or length(btrim(coalesce(entry->>'label',''))) not between 1 and 500
           or jsonb_typeof(entry->'descripcion') is distinct from 'string'
           or jsonb_typeof(entry->'requeridoPor') is distinct from 'string'
           or (entry->'completado') is distinct from 'false'::jsonb
       ) then
      raise exception 'El checklist inicial está incompleto o acredita hitos no realizados' using errcode = '22023';
    end if;
    insert into public.incidentes (tenant_id, fecha_hora, lugar, tipo, descripcion, responsable)
    values (v_tenant, v_fecha, v_input->>'lugar', v_input->>'tipo', v_input->>'descripcion', v_input->>'responsable')
    returning id into v_incidente_id;

    -- El PK de causas es global; serializa los correlativos de todas las altas grupales del año.
    perform pg_advisory_xact_lock(hashtextextended('causa-correlativo:' || extract(year from v_today)::text, 0));
    for v_student in
      select s.id, s.full_name, s.rut, c.name as course_name
      from public.students s join public.courses c on c.id = s.course_id and c.tenant_id = s.tenant_id
      where s.id = any(v_students) and s.tenant_id = v_tenant and s.course_id = v_course
      order by s.id
    loop
      for v_attempt in 1..25 loop
        v_causa_id := public.next_causa_correlativo(extract(year from v_today)::integer);
        begin
          insert into public.causas (
            id, tenant_id, student_id, incidente_id, procedural_model_version,
            estudiante_nombre, estudiante_curso, nna_protected_name, run_estudiante,
            fecha_apertura, estado_actual, tipo_infraccion, responsable, compromete_aula_segura,
            fecha_ultima_actualizacion, observaciones, conducta_rice_id, fecha_inicio_investigacion,
            plazo_investigacion_dias, fecha_limite_investigacion, created_by
          ) values (
            v_causa_id, v_tenant, v_student.id, v_incidente_id, 2,
            v_student.full_name, v_student.course_name,
            (select coalesce(string_agg(upper(left(word,1)) || '.', ' '), 'N. N.') from regexp_split_to_table(v_student.full_name, '\s+') word where length(word) >= 2),
            coalesce(v_student.rut,''), v_today::text, 'Recepción de Denuncia', v_gravedad,
            v_input->>'responsable', v_aula, v_today::text, v_input->>'descripcion', v_conducta,
            v_today, v_plazo, v_deadline, v_actor::text
          );
          exit;
        exception when unique_violation then
          if v_attempt = 25 then raise; end if;
        end;
      end loop;
      insert into public.checklist_items (id, causa_id, tenant_id, label, descripcion, completado, requerido_por)
      select entry->>'id', v_causa_id, v_tenant, entry->>'label', entry->>'descripcion', false, entry->>'requeridoPor'
      from jsonb_array_elements(p_initial_checklist) entry;
      insert into public.bitacora_entries (id, causa_id, tenant_id, fecha, tipo, titulo, descripcion, participantes, compartido_grupal)
      values ('b_init_' || gen_random_uuid()::text, v_causa_id, v_tenant, to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'), 'Otro',
        'Apertura formal de Causa de Convivencia',
        'Se inicia formalmente la tramitación del expediente de disciplina de conformidad con el Reglamento Interno (RIE) del colegio.',
        jsonb_build_array(v_input->>'responsable'), false);
      v_causa_ids := array_append(v_causa_ids, v_causa_id);
    end loop;
    if cardinality(v_causa_ids) <> cardinality(v_students) then
      raise exception 'No se pudieron crear todos los expedientes' using errcode = '22023';
    end if;
    insert into public.incidente_creation_requests (tenant_id, actor_user_id, request_id, request_hash, incidente_id, causa_ids)
    values (v_tenant, v_actor, p_request_id, v_hash, v_incidente_id, v_causa_ids);
  end if;
  select jsonb_build_object('id', id, 'tenant_id', tenant_id, 'fecha_hora', fecha_hora, 'lugar', lugar,
    'tipo', tipo, 'descripcion', descripcion, 'responsable', responsable, 'created_at', created_at, 'updated_at', updated_at)
  into v_incidente from public.incidentes where id = v_incidente_id and tenant_id = v_tenant;
  if v_incidente is null then
    raise exception 'El incidente confirmado ya no está disponible' using errcode = '22023';
  end if;
  return jsonb_build_object('incidente', v_incidente, 'causaIds', to_jsonb(v_causa_ids));
end;
$$;
revoke all on function public.create_incidente_with_causas(uuid,jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.create_incidente_with_causas(uuid,jsonb,jsonb,jsonb) to authenticated;
