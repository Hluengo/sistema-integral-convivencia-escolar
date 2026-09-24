-- Impide saltos de fase en expedientes procedimentales versión 2.
-- Los expedientes versión 1 conservan su comportamiento histórico.

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'causas'
  ) then
    raise exception 'Precondition failed: public.causas must exist';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'causas'
      and column_name = 'procedural_model_version'
  ) then
    raise exception 'Precondition failed: causas.procedural_model_version must exist';
  end if;
end
$$;

create or replace function public.enforce_causa_state_transition()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  previous_phase smallint;
  next_phase smallint;
begin
  if old.procedural_model_version <> 2
     or new.procedural_model_version <> 2
     or old.estado_actual = new.estado_actual then
    return new;
  end if;

  previous_phase := case old.estado_actual
    when 'Recepción de Denuncia' then 1
    when 'Revisión Inicial de Antecedentes' then 1
    when 'Notificación de Inicio de Indagación' then 1
    when 'En Proceso de Indagación' then 2
    when 'Recopilación de Evidencias en Curso' then 2
    when 'Derivado a Mediación' then 2
    when 'Mediación en Desarrollo' then 2
    when 'Mediación Cerrada con Acuerdo' then 2
    when 'Mediación Fracasada – Retorno a Indagación' then 2
    when 'Informe Cierre de Indagación en Elaboración' then 3
    when 'Informe Cierre de Indagación Emitido' then 3
    when 'Entrevista Disciplinaria Pendiente' then 3
    when 'Entrevista Disciplinaria Realizada' then 3
    when 'Informe Concluyente en Elaboración' then 3
    when 'Informe Concluyente Emitido' then 3
    when 'En Plazo de Apelación' then 4
    when 'Apelación Recepcionada' then 4
    when 'Apelación en Revisión por Rectoría' then 4
    when 'Apelación Resuelta' then 4
    when 'Resolución Ejecutoriada' then 4
    when 'Medida en Ejecución' then 5
    when 'En Proceso de Seguimiento' then 5
    when 'Seguimiento Finalizado' then 5
    when 'Causa Cerrada' then 5
    else null
  end;

  next_phase := case new.estado_actual
    when 'Recepción de Denuncia' then 1
    when 'Revisión Inicial de Antecedentes' then 1
    when 'Notificación de Inicio de Indagación' then 1
    when 'En Proceso de Indagación' then 2
    when 'Recopilación de Evidencias en Curso' then 2
    when 'Derivado a Mediación' then 2
    when 'Mediación en Desarrollo' then 2
    when 'Mediación Cerrada con Acuerdo' then 2
    when 'Mediación Fracasada – Retorno a Indagación' then 2
    when 'Informe Cierre de Indagación en Elaboración' then 3
    when 'Informe Cierre de Indagación Emitido' then 3
    when 'Entrevista Disciplinaria Pendiente' then 3
    when 'Entrevista Disciplinaria Realizada' then 3
    when 'Informe Concluyente en Elaboración' then 3
    when 'Informe Concluyente Emitido' then 3
    when 'En Plazo de Apelación' then 4
    when 'Apelación Recepcionada' then 4
    when 'Apelación en Revisión por Rectoría' then 4
    when 'Apelación Resuelta' then 4
    when 'Resolución Ejecutoriada' then 4
    when 'Medida en Ejecución' then 5
    when 'En Proceso de Seguimiento' then 5
    when 'Seguimiento Finalizado' then 5
    when 'Causa Cerrada' then 5
    else null
  end;

  if previous_phase is null or next_phase is null then
    raise exception 'Estado de causa no reconocido para transición versión 2';
  end if;
  if next_phase > previous_phase + 1 then
    raise exception
      'Transición de causa inválida: no se puede saltar de fase % a %',
      previous_phase, next_phase;
  end if;
  return new;
end;
$$;

drop trigger if exists causas_enforce_state_transition on public.causas;
create trigger causas_enforce_state_transition
before update of estado_actual on public.causas
for each row
execute function public.enforce_causa_state_transition();

revoke all on function public.enforce_causa_state_transition() from public;
grant execute on function public.enforce_causa_state_transition() to authenticated, service_role;
