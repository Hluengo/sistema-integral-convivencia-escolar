-- Las RPC de Inasistencias solo existen en algunas instalaciones compartidas.
do $$
declare
  firma text;
  funcion regprocedure;
begin
  foreach firma in array array[
    'public.approve_gmail_import(uuid,uuid,date,date)',
    'public.ignore_gmail_import(uuid)',
    'public.retry_gmail_import(uuid)'
  ] loop
    funcion := to_regprocedure(firma);
    if funcion is not null then
      execute format('revoke execute on function %s from public, anon', funcion);
    end if;
  end loop;
end;
$$;

revoke execute on function public.get_student_annotation_summary() from public, anon;
revoke execute on function public.protect_profile_privileges() from public, anon;

-- Estos triggers solo usan NEW y now().
alter function public.touch_reconsideracion_updated_at() set search_path = pg_catalog;
alter function public.touch_hechos_updated_at() set search_path = pg_catalog;
alter function public.touch_seguimiento_updated_at() set search_path = pg_catalog;
alter function public.touch_plan_gestion_updated_at() set search_path = pg_catalog;
