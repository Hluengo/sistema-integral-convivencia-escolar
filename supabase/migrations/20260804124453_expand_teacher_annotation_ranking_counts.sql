/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

drop function if exists public.get_teacher_annotation_ranking();

create function public.get_teacher_annotation_ranking()
returns table (
  teacher_name text,
  negative_count bigint,
  positive_count bigint,
  informative_count bigint,
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
    min(d.teacher_name)::text as teacher_name,
    count(*) filter (where d.annotation_type = 'Negativa')::bigint as negative_count,
    count(*) filter (where d.annotation_type = 'Positiva')::bigint as positive_count,
    count(*) filter (where d.annotation_type = 'Información')::bigint as informative_count,
    count(*)::bigint as total_count
  from public.disciplinary_annotations_detected d
  cross join tenant_scope scope
  where d.tenant_id = scope.tenant_id
    and d.teacher_name is not null
    and d.teacher_name <> ''
    and d.detected_at is not null
    and extract(year from timezone('America/Santiago', d.detected_at))::integer = scope.school_year
  group by lower(btrim(d.teacher_name))
  having count(*) filter (where d.annotation_type = 'Negativa') > 0
  order by negative_count desc, min(d.teacher_name) asc
  limit 5;
$$;

alter function public.get_teacher_annotation_ranking() owner to postgres;

comment on function public.get_teacher_annotation_ranking() is
  'Tenant-scoped ranking of teachers by dated current-school-year negative annotations with full type counts.';

revoke all on function public.get_teacher_annotation_ranking() from public;
grant all on function public.get_teacher_annotation_ranking() to authenticated;
grant all on function public.get_teacher_annotation_ranking() to service_role;
