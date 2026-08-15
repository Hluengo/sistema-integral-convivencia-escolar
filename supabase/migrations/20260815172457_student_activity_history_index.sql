create or replace function public.get_student_activity_history(
  p_limit integer default 200,
  p_offset integer default 0
)
returns table (
  student_id uuid,
  full_name text,
  course_id uuid,
  course_name text,
  course_level text,
  rut text,
  cause_count bigint,
  active_cause_count bigint,
  annotation_count bigint,
  negative_annotation_count bigint,
  last_activity_at timestamptz,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with activity as (
    select
      s.id as student_id,
      s.full_name,
      s.course_id,
      coalesce(courses.name, 'Sin curso') as course_name,
      courses.level as course_level,
      coalesce(s.rut, '') as rut,
      count(distinct c.id)::bigint as cause_count,
      count(distinct c.id) filter (
        where c.estado_actual not in ('Causa Cerrada', 'Resolución Ejecutoriada')
      )::bigint as active_cause_count,
      count(distinct ir.id)::bigint as annotation_count,
      count(distinct ir.id) filter (where ir.type = 'Negativa')::bigint as negative_annotation_count,
      greatest(
        max(c.updated_at),
        max(c.created_at),
        max(ir.date_time)
      ) as last_activity_at
    from public.students s
    left join public.courses courses on courses.id = s.course_id
      and courses.tenant_id = public.current_tenant_id()
    left join public.causas c on c.student_id = s.id
      and c.tenant_id = public.current_tenant_id()
    left join public.inspectorate_records ir on ir.student_id = s.id
      and ir.tenant_id = public.current_tenant_id()
    where s.tenant_id = public.current_tenant_id()
      and (
        exists (
          select 1 from public.causas cause_exists
          where cause_exists.student_id = s.id
            and cause_exists.tenant_id = public.current_tenant_id()
        )
        or exists (
          select 1 from public.inspectorate_records annotation_exists
          where annotation_exists.student_id = s.id
            and annotation_exists.tenant_id = public.current_tenant_id()
        )
      )
    group by s.id, s.full_name, s.course_id, courses.name, courses.level, s.rut
  )
  select
    activity.*,
    count(*) over ()::bigint as total_count
  from activity
  order by activity.last_activity_at desc nulls last, activity.full_name asc
  limit least(greatest(coalesce(p_limit, 200), 1), 500)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.get_student_activity_history(integer, integer) from public, anon;
grant execute on function public.get_student_activity_history(integer, integer) to authenticated;
