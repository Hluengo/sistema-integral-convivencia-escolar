/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

-- Normalize the internal confirmed values before counting. Existing imports
-- use Spanish labels in annotation_type and English enum values in confirmed_annotation_type.
create or replace function public.get_teacher_annotation_ranking()
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
  with scoped as (
    select
      d.id,
      d.teacher_name,
      d.detected_at,
      case lower(btrim(coalesce(nullif(d.confirmed_annotation_type, ''), d.annotation_type)))
        when 'negative' then 'Negativa'
        when 'negativa' then 'Negativa'
        when 'positive' then 'Positiva'
        when 'positiva' then 'Positiva'
        when 'information' then 'Información'
        when 'información' then 'Información'
        else coalesce(nullif(btrim(d.confirmed_annotation_type), ''), d.annotation_type)
      end as effective_type,
      lower(regexp_replace(btrim(coalesce(d.teacher_name, '')), '\s+', ' ', 'g')) as teacher_key,
      case
        when btrim(coalesce(d.normalized_text, d.annotation_text, d.raw_text, '')) = ''
          then d.id::text
        else lower(regexp_replace(
          btrim(coalesce(d.normalized_text, d.annotation_text, d.raw_text)),
          '\s+', ' ', 'g'
        ))
      end as annotation_key,
      d.student_id,
      d.annotation_date
    from public.disciplinary_annotations_detected d
    where d.tenant_id = public.current_tenant_id()
      and d.teacher_name is not null
      and btrim(d.teacher_name) <> ''
      and d.annotation_date is not null
      and extract(year from d.annotation_date)::integer =
        extract(year from timezone('America/Santiago', now()))::integer
  ), unique_annotations as (
    select distinct on (student_id, annotation_date, effective_type, teacher_key, annotation_key)
      teacher_name,
      teacher_key,
      effective_type
    from scoped
    order by student_id, annotation_date, effective_type, teacher_key, annotation_key,
      detected_at asc, id asc
  )
  select
    min(teacher_name)::text as teacher_name,
    count(*) filter (where effective_type = 'Negativa')::bigint as negative_count,
    count(*) filter (where effective_type = 'Positiva')::bigint as positive_count,
    count(*) filter (where effective_type = 'Información')::bigint as informative_count,
    count(*)::bigint as total_count
  from unique_annotations
  group by teacher_key
  having count(*) filter (where effective_type = 'Negativa') > 0
  order by negative_count desc, min(teacher_name) asc
  limit 5;
$$;

alter function public.get_teacher_annotation_ranking() owner to postgres;

comment on function public.get_teacher_annotation_ranking() is
  'Tenant-scoped top-five ranking of unique current-school-year annotations by teacher, using annotation_date and normalized confirmed type.';

revoke all on function public.get_teacher_annotation_ranking() from public;
grant execute on function public.get_teacher_annotation_ranking() to authenticated;
grant execute on function public.get_teacher_annotation_ranking() to service_role;
