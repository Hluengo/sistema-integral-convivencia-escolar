-- Redefine los RPCs de rankings para que cuenten SOLO anotaciones negativas.
-- Se elimina la columna total_count: el ranking es exclusivamente por negativas.
-- Sustituye a 20260731000010 (aplicada) manteniendo la misma firma y seguridad.

-- 1) Ranking de docentes por anotaciones negativas únicamente.
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
  select
    coalesce(d.teacher_name, 'Sin profesor')::text as teacher_name,
    count(*) filter (where d.annotation_type = 'Negativa')::bigint as negative_count
  from public.disciplinary_annotations_detected d
  where d.tenant_id = public.current_tenant_id()
    and d.teacher_name is not null
    and d.teacher_name <> ''
    and d.annotation_type = 'Negativa'
  group by d.teacher_name
  having count(*) filter (where d.annotation_type = 'Negativa') > 0
  order by negative_count desc, d.teacher_name asc
  limit 5;
$$;

revoke all on function public.get_teacher_annotation_ranking() from public, anon;
grant execute on function public.get_teacher_annotation_ranking() to authenticated, service_role;

comment on function public.get_teacher_annotation_ranking() is
  'Tenant-scoped ranking of teachers by negative annotations only, limited to top 5.';

-- 2) Ranking de estudiantes por anotaciones negativas únicamente.
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
  select
    s.id as student_id,
    s.full_name::text as student_name,
    coalesce(c.name, 'Sin curso')::text as course_name,
    count(*) filter (where ir.type = 'Negativa')::bigint as negative_count
  from public.students s
  join public.inspectorate_records ir
    on ir.student_id = s.id
   and ir.tenant_id = public.current_tenant_id()
  left join public.courses c
    on c.id = s.course_id
   and c.tenant_id = public.current_tenant_id()
  where s.tenant_id = public.current_tenant_id()
    and ir.type = 'Negativa'
  group by s.id, s.full_name, c.name
  having count(*) filter (where ir.type = 'Negativa') > 0
  order by negative_count desc, s.full_name asc
  limit 5;
$$;

revoke all on function public.get_student_annotation_ranking() from public, anon;
grant execute on function public.get_student_annotation_ranking() to authenticated, service_role;

comment on function public.get_student_annotation_ranking() is
  'Tenant-scoped ranking of students by negative annotations only, limited to top 5, with course name.';
