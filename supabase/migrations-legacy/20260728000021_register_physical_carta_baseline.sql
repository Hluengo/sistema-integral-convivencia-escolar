-- @license SPDX-License-Identifier: Apache-2.0

-- Distinguish letters created by the platform from physical letters that predate
-- the rollout. Existing records remain platform records and keep their original data.
alter table public.cartas_disciplinarias
  add column if not exists origin text not null default 'platform',
  add column if not exists school_year integer;

update public.cartas_disciplinarias
set school_year = extract(year from emission_date)::integer
where school_year is null;

alter table public.cartas_disciplinarias
  alter column school_year set default extract(year from current_date)::integer,
  alter column school_year set not null;

alter table public.cartas_disciplinarias
  drop constraint if exists cartas_disciplinarias_origin_check,
  add constraint cartas_disciplinarias_origin_check
    check (origin in ('platform', 'physical')),
  drop constraint if exists cartas_disciplinarias_school_year_check,
  add constraint cartas_disciplinarias_school_year_check
    check (school_year between 2000 and 2100);

create index if not exists idx_cartas_student_school_year_origin
  on public.cartas_disciplinarias (
    tenant_id,
    student_id,
    school_year,
    origin,
    emission_date desc
  );

create unique index if not exists uq_cartas_physical_active_type_year
  on public.cartas_disciplinarias (
    tenant_id,
    student_id,
    school_year,
    letter_type
  )
  where origin = 'physical' and status <> 'Anulada';

create or replace function public.register_physical_carta(
  p_student_id uuid,
  p_letter_type text,
  p_emission_date date default current_date,
  p_observations text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_carta_id uuid;
  v_student_name text;
  v_course_name text;
  v_school_year integer;
  v_created_by text;
begin
  if auth.uid() is null or v_tenant_id is null then
    raise exception 'Authentication and tenant membership are required'
      using errcode = '42501';
  end if;

  if p_letter_type not in (
    'Amonestación Escrita',
    'Carta de Compromiso Conductual'
  ) then
    raise exception 'Unsupported physical letter type'
      using errcode = '22023';
  end if;

  if p_emission_date is null or p_emission_date > current_date then
    raise exception 'Physical letter date must be today or earlier'
      using errcode = '22023';
  end if;

  if length(coalesce(p_observations, '')) > 1000 then
    raise exception 'Physical letter observation is too long'
      using errcode = '22023';
  end if;

  select s.full_name, coalesce(c.name, 'Sin curso')
    into v_student_name, v_course_name
  from public.students s
  left join public.courses c
    on c.id = s.course_id
   and c.tenant_id = s.tenant_id
  where s.id = p_student_id
    and s.tenant_id = v_tenant_id;

  if not found then
    raise exception 'Student not found in the active tenant'
      using errcode = 'P0002';
  end if;

  v_school_year := extract(year from p_emission_date)::integer;
  v_created_by := coalesce(auth.jwt() ->> 'email', auth.uid()::text);

  insert into public.cartas_disciplinarias (
    student_id,
    tenant_id,
    letter_type,
    emission_date,
    status,
    emitted_by,
    supervisor_name,
    apoderado_name,
    annotations_count,
    student_name,
    course,
    regulation_basis,
    observations,
    created_by,
    origin,
    school_year
  )
  values (
    p_student_id,
    v_tenant_id,
    p_letter_type,
    p_emission_date,
    'Vigente',
    'Constancia de documento físico',
    null,
    'No informado',
    0,
    v_student_name,
    v_course_name,
    'Constancia de carta física previa a la implementación de la plataforma',
    nullif(btrim(p_observations), ''),
    v_created_by,
    'physical',
    v_school_year
  )
  returning id into v_carta_id;

  insert into public.carta_events (
    carta_id,
    student_id,
    tenant_id,
    event_type,
    event_detail,
    created_by,
    metadata
  )
  values (
    v_carta_id::text,
    p_student_id::text,
    v_tenant_id,
    'registered',
    'Constancia de carta física existente registrada en la ficha disciplinaria.',
    v_created_by,
    jsonb_build_object(
      'origin', 'physical',
      'schoolYear', v_school_year,
      'doesNotChangeAnnotationCount', true
    )
  );

  return v_carta_id;
end;
$function$;

revoke all on function public.register_physical_carta(uuid, text, date, text)
  from public, anon, authenticated, service_role;
grant execute on function public.register_physical_carta(uuid, text, date, text)
  to authenticated;

comment on function public.register_physical_carta(uuid, text, date, text) is
  'Registers an existing physical warning or commitment letter without changing annotation counts.';
