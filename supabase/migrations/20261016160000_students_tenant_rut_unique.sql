-- #13: la deduplicación de la importación de alumnos (RUT por colegio) sólo
-- confiaba en la consulta previa; sin índice único, dos importaciones
-- concurrentes podían crear el mismo estudiante dos veces.
-- Verificado antes de aplicar: 0 grupos duplicados por (tenant_id, rut) sobre
-- 809 filas con RUT.

do $$
declare
  v_dup_groups integer;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'students'
      and column_name = 'rut'
  ) then
    raise exception 'Precondition failed: students.rut must exist';
  end if;

  select count(*) into v_dup_groups
    from (
      select tenant_id, rut
        from public.students
       where rut is not null and rut <> ''
       group by tenant_id, rut
      having count(*) > 1
    ) d;

  if v_dup_groups > 0 then
    raise exception 'Hay % RUT duplicados por colegio en students: resolverlos antes de crear el índice único', v_dup_groups;
  end if;
end
$$;

create unique index if not exists students_tenant_rut_key
  on public.students (tenant_id, rut)
  where rut is not null and rut <> '';
