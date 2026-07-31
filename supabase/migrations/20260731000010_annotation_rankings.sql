-- RPCs para rankings de docentes y estudiantes en el dashboard.
-- Ambos consideran solo anotaciones de tipo 'Negativa'.

-- 1) Ranking de docentes que registran más anotaciones negativas.
--    Fuente: disciplinary_annotations_detected.teacher_name (nombre detectado en PDF).
drop function if exists public.get_teacher_annotation_ranking();

create function public.get_teacher_annotation_ranking()
returns table (
  teacher_name text,
  negative_count bigint,
  total_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce(d.teacher_name, 'Sin profesor')::text as teacher_name,
    count(*) filter (where d.annotation_type = 'Negativa')::bigint as negative_count,
    count(*)::bigint as total_count
  from public.disciplinary_annotations_detected d
  where d.tenant_id = public.current_tenant_id()
    and d.teacher_name is not null
    and d.teacher_name <> ''
  group by d.teacher_name
  having count(*) filter (where d.annotation_type = 'Negativa') > 0
  order by negative_count desc, d.teacher_name asc
  limit 5;
$$;

revoke all on function public.get_teacher_annotation_ranking() from public, anon;
grant execute on function public.get_teacher_annotation_ranking() to authenticated, service_role;

comment on function public.get_teacher_annotation_ranking() is
  'Tenant-scoped ranking of teachers by negative detected annotations, limited to top 5.';

-- 2) Ranking de estudiantes con más anotaciones negativas.
--    Fuente: inspectorate_records (fuente canónica de anotaciones) + students + courses.
drop function if exists public.get_student_annotation_ranking();

create function public.get_student_annotation_ranking()
returns table (
  student_id uuid,
  student_name text,
  course_name text,
  negative_count bigint,
  total_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    s.id as student_id,
    s.full_name::text as student_name,
    coalesce(c.name, 'Sin curso')::text as course_name,
    count(*) filter (where ir.type = 'Negativa')::bigint as negative_count,
    count(*)::bigint as total_count
  from public.students s
  join public.inspectorate_records ir
    on ir.student_id = s.id
   and ir.tenant_id = public.current_tenant_id()
  left join public.courses c
    on c.id = s.course_id
   and c.tenant_id = public.current_tenant_id()
  where s.tenant_id = public.current_tenant_id()
  group by s.id, s.full_name, c.name
  having count(*) filter (where ir.type = 'Negativa') > 0
  order by negative_count desc, s.full_name asc
  limit 5;
$$;

revoke all on function public.get_student_annotation_ranking() from public, anon;
grant execute on function public.get_student_annotation_ranking() to authenticated, service_role;

comment on function public.get_student_annotation_ranking() is
  'Tenant-scoped ranking of students by negative annotation count, limited to top 5, with course name.';
