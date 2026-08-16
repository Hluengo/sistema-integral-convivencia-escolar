-- Plazos operativos persistidos para la fuente de verdad del dashboard.
alter table public.causas
  add column if not exists plazo_24h boolean not null default false,
  add column if not exists fecha_limite_24h timestamptz,
  add column if not exists fecha_inicio_investigacion date,
  add column if not exists plazo_investigacion_dias integer,
  add column if not exists fecha_limite_investigacion date,
  add column if not exists fecha_limite_cierre date;

alter table public.causas
  drop constraint if exists causas_plazo_investigacion_dias_check;

alter table public.causas
  add constraint causas_plazo_investigacion_dias_check
  check (plazo_investigacion_dias is null or plazo_investigacion_dias between 1 and 60);

update public.causas
set fecha_inicio_investigacion = coalesce(fecha_inicio_investigacion, nullif(fecha_apertura, '')::date),
    plazo_investigacion_dias = coalesce(
      plazo_investigacion_dias,
      case when compromete_aula_segura then 10 else 60 end
    ),
    fecha_limite_investigacion = coalesce(
      fecha_limite_investigacion,
      nullif(fecha_apertura, '')::date
        + (coalesce(plazo_investigacion_dias, case when compromete_aula_segura then 10 else 60 end) - 1)
    )
where fecha_apertura is not null
  and nullif(fecha_apertura, '') is not null;

create index if not exists causas_tenant_deadline_idx
  on public.causas (tenant_id, fecha_limite_investigacion)
  where fecha_limite_investigacion is not null;

create or replace function public.get_dashboard_deadline_kpis()
returns table (
  overdue_count bigint,
  due_today_count bigint,
  due_soon_count bigint,
  critical_count bigint,
  as_of timestamptz
)
language sql
stable
set search_path = public
as $$
  with active_cases as (
    select fecha_limite_investigacion
    from public.causas
    where tenant_id = public.current_tenant_id()
      and estado_actual not in ('Causa Cerrada', 'Resolución Ejecutoriada')
      and fecha_limite_investigacion is not null
  )
  select
    count(*) filter (where fecha_limite_investigacion < (now() at time zone 'America/Santiago')::date),
    count(*) filter (where fecha_limite_investigacion = (now() at time zone 'America/Santiago')::date),
    count(*) filter (where fecha_limite_investigacion between (now() at time zone 'America/Santiago')::date
      and ((now() at time zone 'America/Santiago')::date + 3)),
    count(*) filter (where fecha_limite_investigacion <= ((now() at time zone 'America/Santiago')::date + 2)),
    now()
  from active_cases;
$$;

revoke all on function public.get_dashboard_deadline_kpis() from public, anon;
grant execute on function public.get_dashboard_deadline_kpis() to authenticated;
