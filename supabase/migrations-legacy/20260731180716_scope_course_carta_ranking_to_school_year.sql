-- El ranking de cartas debe respetar el mismo año lectivo que los demás
-- indicadores disciplinarios. La migración 20260731000030 normalizó las claves
-- de curso, pero dejó el agregado histórico.

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
  limit 5;
$$;

revoke all on function public.get_course_carta_ranking() from public, anon;
grant execute on function public.get_course_carta_ranking() to authenticated, service_role;

comment on function public.get_course_carta_ranking() is
  'Tenant-scoped ranking of disciplinary letters for the current school year, aggregated by normalized carta course snapshot and limited to top 5.';
