/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

create or replace function public.get_course_carta_ranking()
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
  with tenant_scope as (
    select
      public.current_tenant_id() as tenant_id,
      extract(year from timezone('America/Santiago', now()))::integer as school_year
  )
  select
    min(c.course)::text as course_name,
    count(*) filter (where c.letter_type = 'Amonestación Escrita')::bigint as amonestacion_count,
    count(*) filter (where c.letter_type = 'Carta de Compromiso Conductual')::bigint as compromiso_count,
    count(*) filter (where c.letter_type = 'Ficha de Derivación')::bigint as derivacion_count,
    count(*)::bigint as total_count
  from public.cartas_disciplinarias c
  cross join tenant_scope scope
  where c.tenant_id = scope.tenant_id
    and c.status <> 'Anulada'
    and coalesce(c.school_year, extract(year from c.emission_date)::integer) = scope.school_year
  group by lower(btrim(c.course))
  having count(*) > 0
  order by total_count desc, min(c.course) asc
  limit 12;
$$;

comment on function public.get_course_carta_ranking() is
  'Tenant-scoped ranking of disciplinary letters for the current school year, aggregated by normalized carta course snapshot and limited to top 12.';

create or replace function public.get_student_annotation_ranking()
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
  limit 12;
$$;

comment on function public.get_student_annotation_ranking() is
  'Tenant-scoped ranking of students by current-school-year negative annotations, grouped by student id, limited to top 12, with course name.';
