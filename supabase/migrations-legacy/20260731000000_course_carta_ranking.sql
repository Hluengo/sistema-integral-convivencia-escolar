-- RPC para ranking de cursos con más cartas disciplinarias en el dashboard.
-- Agrupa por nombre de curso según el campo course de cartas_disciplinarias,
-- excluye cartas Anuladas y desglosa por tipo de carta.

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
    coalesce(c.course, 'Sin curso')::text as course_name,
    count(*) filter (where c.letter_type = 'Amonestación Escrita')::bigint as amonestacion_count,
    count(*) filter (where c.letter_type = 'Carta de Compromiso Conductual')::bigint as compromiso_count,
    count(*) filter (where c.letter_type = 'Ficha de Derivación')::bigint as derivacion_count,
    count(*)::bigint as total_count
  from public.cartas_disciplinarias c
  where c.tenant_id = public.current_tenant_id()
    and c.status <> 'Anulada'
  group by c.course
  having count(*) > 0
  order by total_count desc, c.course asc
  limit 5;
$$;

revoke all on function public.get_course_carta_ranking() from public, anon;
grant execute on function public.get_course_carta_ranking() to authenticated, service_role;

comment on function public.get_course_carta_ranking() is
  'Tenant-scoped ranking of courses by disciplinary letter count, limited to top 5, with breakdown by letter type.';
