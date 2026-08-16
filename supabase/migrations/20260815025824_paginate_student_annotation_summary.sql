-- FE-04: paginated, tenant-scoped student annotation summary.
-- Keeps the existing aggregation contract while avoiding a full-tenant payload.
create or replace function public.get_student_annotation_summary_page(
  p_limit integer default 100,
  p_offset integer default 0
)
returns table(
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
  ai_analysis jsonb,
  total_count bigint
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
  ), summary as (
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
    order by s.full_name
  )
  select summary.*, count(*) over()::bigint as total_count
  from summary
  order by summary.full_name
  limit greatest(1, least(coalesce(p_limit, 100), 200))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.get_student_annotation_summary_page(integer, integer) from public;
grant execute on function public.get_student_annotation_summary_page(integer, integer) to authenticated;

comment on function public.get_student_annotation_summary_page(integer, integer)
is 'Tenant-scoped paginated student annotation totals for the current school year.';
