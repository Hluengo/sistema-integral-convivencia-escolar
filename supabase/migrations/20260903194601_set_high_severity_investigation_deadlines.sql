-- Faltas Muy Graves y Gravísimas: informe de cierre de indagación en 10 días hábiles.
with high_severity as (
  select
    id,
    coalesce(fecha_inicio_investigacion, nullif(fecha_apertura, '')::date) as fecha_inicio
  from public.causas
  where tipo_infraccion in ('Muy Grave', 'Gravísima')
    and fecha_apertura is not null
    and nullif(fecha_apertura, '') is not null
),
deadlines as (
  select id, fecha_inicio, fecha_limite
  from (
    select
      high_severity.id,
      high_severity.fecha_inicio,
      dates.fecha::date as fecha_limite,
      row_number() over (partition by high_severity.id order by dates.fecha) as business_day
    from high_severity
    cross join lateral generate_series(
      high_severity.fecha_inicio,
      high_severity.fecha_inicio + interval '30 days',
      interval '1 day'
    ) as dates(fecha)
    where extract(isodow from dates.fecha) between 1 and 5
  ) counted
  where business_day = 10
)
update public.causas
set plazo_investigacion_dias = 10,
    fecha_inicio_investigacion = deadlines.fecha_inicio,
    fecha_limite_investigacion = deadlines.fecha_limite
from deadlines
where causas.id = deadlines.id;
