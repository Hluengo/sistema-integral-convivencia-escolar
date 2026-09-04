-- El primer día hábil se cuenta desde el día siguiente al inicio registrado.
with sources as (
  select
    id,
    coalesce(fecha_inicio_investigacion, nullif(fecha_apertura, '')::date) as fecha_inicio,
    coalesce(
      plazo_investigacion_dias,
      case when compromete_aula_segura then 10 else 60 end
    ) as plazo_dias
  from public.causas
  where fecha_apertura is not null
    and nullif(fecha_apertura, '') is not null
), deadlines as (
  select counted.id, counted.fecha_inicio, counted.fecha_limite
  from (
    select
      sources.id,
      sources.fecha_inicio,
      dates.fecha::date as fecha_limite,
      row_number() over (partition by sources.id order by dates.fecha) as dia_habil
    from sources
    cross join lateral generate_series(
      sources.fecha_inicio + interval '1 day',
      sources.fecha_inicio + interval '120 days',
      interval '1 day'
    ) as dates(fecha)
    where extract(isodow from dates.fecha) between 1 and 5
  ) counted
  join sources using (id)
  where counted.dia_habil = sources.plazo_dias
)
update public.causas
set fecha_limite_investigacion = deadlines.fecha_limite
from deadlines
where causas.id = deadlines.id;
