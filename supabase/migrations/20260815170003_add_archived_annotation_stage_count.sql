drop function if exists public.get_annotation_stage_counts();

create function public.get_annotation_stage_counts()
returns table(
  stage text,
  total_count bigint,
  pending_count bigint,
  processed_count bigint,
  archived_count bigint
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
  carta_events_by_student as (
    select
      c.student_id,
      max(case
        when ce.event_type in ('registered', 'printed', 'processed_manually') then
          case
            when c.letter_type in ('Ficha de Derivación', 'Derivación a Convivencia Escolar') then 3
            when c.letter_type = 'Carta de Compromiso Conductual' then 2
            when c.letter_type = 'Amonestación Escrita' then 1
            else 0
          end
        else 0
      end)::integer as processed_rank,
      max(case
        when ce.event_type = 'archived' then
          case
            when c.letter_type in ('Ficha de Derivación', 'Derivación a Convivencia Escolar') then 3
            when c.letter_type = 'Carta de Compromiso Conductual' then 2
            when c.letter_type = 'Amonestación Escrita' then 1
            else 0
          end
        else 0
      end)::integer as archived_rank
    from public.cartas_disciplinarias c
    join public.carta_events ce
      on ce.carta_id = c.id
     and ce.student_id = c.student_id
     and ce.tenant_id = c.tenant_id
    cross join tenant_scope scope
    where c.tenant_id = scope.tenant_id
      and c.status <> 'Anulada'
      and coalesce(c.school_year, extract(year from c.emission_date)::integer) = scope.school_year
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
        coalesce(events.processed_rank, 0),
        coalesce(events.archived_rank, 0)
      ) as effective_rank,
      coalesce(events.processed_rank, 0) as processed_rank,
      coalesce(events.archived_rank, 0) as archived_rank
    from negative_counts nc
    left join carta_events_by_student events on events.student_id = nc.student_id
    where nc.negatives > 0
      or coalesce(events.processed_rank, 0) > 0
      or coalesce(events.archived_rank, 0) > 0
  ),
  aggregated as (
    select
      effective_rank,
      count(*)::bigint as total_count,
      count(*) filter (
        where archived_rank = effective_rank and archived_rank > 0
      )::bigint as archived_count,
      count(*) filter (
        where archived_rank <> effective_rank
          and processed_rank = effective_rank
          and processed_rank > 0
      )::bigint as processed_count,
      count(*) filter (
        where archived_rank <> effective_rank
          and processed_rank <> effective_rank
      )::bigint as pending_count
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
    coalesce(aggregated.processed_count, 0)::bigint,
    coalesce(aggregated.archived_count, 0)::bigint
  from stage_catalog catalog
  left join aggregated on aggregated.effective_rank = catalog.stage_rank
  order by catalog.stage_rank;
$$;

revoke all on function public.get_annotation_stage_counts() from public, anon;
grant execute on function public.get_annotation_stage_counts() to authenticated;
