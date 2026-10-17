-- #5: causas.id es PK global (RLS sólo expone el colegio propio), así que el
-- correlativo calculado en el cliente con los ids visibles choca casi siempre
-- con los de otro colegio y, con 25 intentos, un colegio nuevo no podía crear
-- causas.
--
-- Esta función entrega el siguiente correlativo global del año para arrancar el
-- reintento con el id correcto (el cliente la usa como primer salto ante un
-- 23505). Entrega sólo un contador, no datos de otros colegios.

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'causas'
  ) then
    raise exception 'Precondition failed: public.causas must exist';
  end if;
end
$$;

create or replace function public.next_causa_correlativo(p_year integer)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select 'DC-' || p_year::text || '-' ||
         lpad(
           (
             coalesce(
               max((regexp_match(id, '(\d+)$'))[1]::integer),
               0
             ) + 1
           )::text,
           3,
           '0'
         )
    from public.causas
   where id ~ ('^DC-' || p_year::text || '-\d+$')
$$;

revoke all on function public.next_causa_correlativo(integer) from public, anon, authenticated;
grant execute on function public.next_causa_correlativo(integer) to authenticated;
