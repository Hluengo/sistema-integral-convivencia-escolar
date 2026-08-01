-- AUD-03 + AUD-04: unify annotation counts and ranking keys.
--
-- AUD-03: disciplinary stages must reflect the CURRENT school year only.
--   Negatives accumulate within the school year (America/Santiago calendar year)
--   and reset each year, matching cartas_disciplinarias.school_year semantics.
--   Previously get_student_annotation_summary and get_annotation_stage_counts
--   counted negatives across ALL years while completed letters were filtered by
--   school_year, mixing semantics.
--
-- AUD-04: rankings must aggregate by stable keys, not raw text.
--   - Teacher ranking: group by lower(trim(teacher_name)) to avoid duplicates.
--   - Course ranking: group by lower(trim(course)) from the carta snapshot
--     (cartas_disciplinarias has no course_id FK; the snapshot is authoritative
--     for the emitted letter).
--   - Student ranking: already groups by student id; only adds school-year scope.

-- ============ get_student_annotation_summary (school-year scoped) ============

drop function if exists public.get_student_annotation_summary();

create function public.get_student_annotation_summary()
returns table (
  id uuid,
  full_name text,
  course_id uuid,
  teacher_id uuid,
  status text,
  annotations_count bigint,
  positive_annotations_count bigint,
  informative_annotations_count bigint,
  last_annotation_date timestamptz,
  disciplinary_status text,
  rut text,
  course_name text,
  ai_analysis jsonb
)
language sql
security definer
set search_path = public, pg_temp
as $$
  with tenant_scope as (
    select
      public.current_tenant_id() as tenant_id,
      extract(year from timezone('America/Santiago', now()))::integer as school_year
  )
  select
    s.id,
    s.full_name,
    s.course_id,
    null::uuid as teacher_id,
    'Activo'::text as status,
    coalesce(annotation_totals.negativas, 0)::bigint as annotations_count,
    coalesce(annotation_totals.positivas, 0)::bigint as positive_annotations_count,
    coalesce(annotation_totals.informativas, 0)::bigint as informative_annotations_count,
    annotation_totals.last_date as last_annotation_date,
    case
      when coalesce(annotation_totals.negativas, 0) >= 15 then 'Rojo'
      when coalesce(annotation_totals.negativas, 0) >= 10 then 'Naranja'
      when coalesce(annotation_totals.negativas, 0) >= 5 then 'Amarillo'
      else 'Verde'
    end as disciplinary_status,
    s.rut,
    c.name as course_name,
    latest.analysis_json as ai_analysis
  from public.students s
  cross join tenant_scope scope
  left join public.courses c
    on c.id = s.course_id
   and c.tenant_id = scope.tenant_id
  left join lateral (
    select
      count(*) filter (where ir.type = 'Negativa')::bigint as negativas,
      count(*) filter (where ir.type = 'Positiva')::bigint as positivas,
      count(*) filter (where ir.type = 'Información')::bigint as informativas,
      max(ir.date_time) as last_date
    from public.inspectorate_records ir
    where ir.student_id = s.id
      and ir.tenant_id = scope.tenant_id
      and extract(year from timezone('America/Santiago', ir.date_time))::integer = scope.school_year
  ) annotation_totals on true
  left join lateral (
    select jsonb_build_object(
      'negativas', da.negativas,
      'positivas', da.positivas,
      'informativas', da.informativas,
      'analyzed_at', da.analyzed_at
    ) as analysis_json
    from public.document_analyses da
    where da.student_id = s.id
      and da.tenant_id = scope.tenant_id
    order by da.analyzed_at desc
    limit 1
  ) latest on true
  where s.tenant_id = scope.tenant_id
  order by s.full_name;
$$;

revoke all on function public.get_student_annotation_summary() from public, anon;
grant execute on function public.get_student_annotation_summary() to authenticated, service_role;

comment on function public.get_student_annotation_summary() is
  'Tenant-scoped student annotation totals for the current school year only, aggregated without client row limits.';

-- ============ get_annotation_stage_counts (school-year scoped negatives) ============

drop function if exists public.get_annotation_stage_counts();

create function public.get_annotation_stage_counts()
returns table (
  stage text,
  total_count bigint,
  pending_count bigint,
  processed_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with tenant_scope as (
    select
      public.current_tenant_id() as tenant_id,
      extract(year from timezone('America/Santiago', now()))::integer as school_year
  ),
  negative_counts as (
    select
      s.id as student_id,
      count(ir.id) filter (where ir.type = 'Negativa')::integer as negatives
    from public.students s
    cross join tenant_scope scope
    left join public.inspectorate_records ir
      on ir.student_id = s.id
     and ir.tenant_id = scope.tenant_id
     and extract(year from timezone('America/Santiago', ir.date_time))::integer = scope.school_year
    where s.tenant_id = scope.tenant_id
    group by s.id
  ),
  completed_letters as (
    select
      c.student_id,
      max(
        case
          when c.letter_type in ('Ficha de Derivación', 'Derivación a Convivencia Escolar') then 3
          when c.letter_type = 'Carta de Compromiso Conductual' then 2
          when c.letter_type = 'Amonestación Escrita' then 1
          else 0
        end
      )::integer as completed_rank
    from public.cartas_disciplinarias c
    cross join tenant_scope scope
    where c.tenant_id = scope.tenant_id
      and c.status <> 'Anulada'
      and coalesce(c.school_year, extract(year from c.emission_date)::integer) = scope.school_year
      and (
        c.origin = 'physical'
        or exists (
          select 1
          from public.carta_events ce
          where ce.carta_id = c.id::text
            and ce.student_id = c.student_id::text
            and ce.tenant_id = c.tenant_id
            and ce.event_type in ('registered', 'printed', 'processed_manually')
        )
      )
    group by c.student_id
  ),
  classified as (
    select
      greatest(
        case
          when nc.negatives >= 15 then 3
          when nc.negatives >= 10 then 2
          when nc.negatives >= 5 then 1
          else 0
        end,
        coalesce(cl.completed_rank, 0)
      ) as effective_rank,
      coalesce(cl.completed_rank, 0) as completed_rank
    from negative_counts nc
    left join completed_letters cl on cl.student_id = nc.student_id
    where nc.negatives > 0 or coalesce(cl.completed_rank, 0) > 0
  ),
  aggregated as (
    select
      effective_rank,
      count(*)::bigint as total_count,
      count(*) filter (
        where not (effective_rank > 0 and completed_rank = effective_rank)
      )::bigint as pending_count,
      count(*) filter (
        where effective_rank > 0 and completed_rank = effective_rank
      )::bigint as processed_count
    from classified
    group by effective_rank
  ),
  stage_catalog(stage, stage_rank) as (
    values
      ('sin_carta'::text, 0),
      ('amonestacion'::text, 1),
      ('compromiso'::text, 2),
      ('derivacion'::text, 3)
  )
  select
    catalog.stage,
    coalesce(aggregated.total_count, 0)::bigint,
    coalesce(aggregated.pending_count, 0)::bigint,
    coalesce(aggregated.processed_count, 0)::bigint
  from stage_catalog catalog
  left join aggregated on aggregated.effective_rank = catalog.stage_rank
  order by catalog.stage_rank;
$$;

revoke all on function public.get_annotation_stage_counts() from public, anon;
grant execute on function public.get_annotation_stage_counts() to authenticated, service_role;

comment on function public.get_annotation_stage_counts() is
  'Live tenant-scoped annotation stages for the current school year, split into pending and processed using current-year completed carta events.';

-- ============ get_teacher_annotation_ranking (normalized key + school year) ============

drop function if exists public.get_teacher_annotation_ranking();

create function public.get_teacher_annotation_ranking()
returns table (
  teacher_name text,
  negative_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with tenant_scope as (
    select
      public.current_tenant_id() as tenant_id,
      extract(year from timezone('America/Santiago', now()))::integer as school_year
  )
  select
    min(d.teacher_name)::text as teacher_name,
    count(*)::bigint as negative_count
  from public.disciplinary_annotations_detected d
  cross join tenant_scope scope
  where d.tenant_id = scope.tenant_id
    and d.teacher_name is not null
    and d.teacher_name <> ''
    and d.annotation_type = 'Negativa'
    and extract(year from timezone('America/Santiago', coalesce(d.detected_at, now())))::integer = scope.school_year
  group by lower(btrim(d.teacher_name))
  having count(*) > 0
  order by negative_count desc, min(d.teacher_name) asc
  limit 5;
$$;

revoke all on function public.get_teacher_annotation_ranking() from public, anon;
grant execute on function public.get_teacher_annotation_ranking() to authenticated, service_role;

comment on function public.get_teacher_annotation_ranking() is
  'Tenant-scoped ranking of teachers by current-school-year negative annotations, aggregated by normalized teacher name, limited to top 5.';

-- ============ get_student_annotation_ranking (school year scope) ============

drop function if exists public.get_student_annotation_ranking();

create function public.get_student_annotation_ranking()
returns table (
  student_id uuid,
  student_name text,
  course_name text,
  negative_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with tenant_scope as (
    select
      public.current_tenant_id() as tenant_id,
      extract(year from timezone('America/Santiago', now()))::integer as school_year
  )
  select
    s.id as student_id,
    s.full_name::text as student_name,
    coalesce(c.name, 'Sin curso')::text as course_name,
    count(*)::bigint as negative_count
  from public.students s
  cross join tenant_scope scope
  join public.inspectorate_records ir
    on ir.student_id = s.id
   and ir.tenant_id = scope.tenant_id
   and extract(year from timezone('America/Santiago', ir.date_time))::integer = scope.school_year
  left join public.courses c
    on c.id = s.course_id
   and c.tenant_id = scope.tenant_id
  where s.tenant_id = scope.tenant_id
    and ir.type = 'Negativa'
  group by s.id, s.full_name, c.name
  having count(*) > 0
  order by negative_count desc, s.full_name asc
  limit 5;
$$;

revoke all on function public.get_student_annotation_ranking() from public, anon;
grant execute on function public.get_student_annotation_ranking() to authenticated, service_role;

comment on function public.get_student_annotation_ranking() is
  'Tenant-scoped ranking of students by current-school-year negative annotations, grouped by student id, limited to top 5, with course name.';

-- ============ get_course_carta_ranking (normalized snapshot key) ============

drop function if exists public.get_course_carta_ranking();

create function public.get_course_carta_ranking()
returns table (
  course_name text,
  amonestacion_count bigint,
  compromiso_count bigint,
  derivacion_count bigint,
  total_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    min(c.course)::text as course_name,
    count(*) filter (where c.letter_type = 'Amonestación Escrita')::bigint as amonestacion_count,
    count(*) filter (where c.letter_type = 'Carta de Compromiso Conductual')::bigint as compromiso_count,
    count(*) filter (where c.letter_type = 'Ficha de Derivación')::bigint as derivacion_count,
    count(*)::bigint as total_count
  from public.cartas_disciplinarias c
  where c.tenant_id = public.current_tenant_id()
    and c.status <> 'Anulada'
  group by lower(btrim(c.course))
  having count(*) > 0
  order by total_count desc, min(c.course) asc
  limit 5;
$$;

revoke all on function public.get_course_carta_ranking() from public, anon;
grant execute on function public.get_course_carta_ranking() to authenticated, service_role;

comment on function public.get_course_carta_ranking() is
  'Tenant-scoped ranking of courses by disciplinary letter count, aggregated by normalized carta course snapshot, limited to top 5, with breakdown by letter type.';
