-- Etiqueta importaciones Gmail históricas que fueron ingeridas antes del
-- aislamiento por tenant. Se detiene si la evidencia no identifica un único
-- tenant con ausencias, para no asignar datos entre colegios por conjetura.
do $$
declare
  v_tenant_id uuid;
  v_tenant_count integer;
begin
  if not exists (
    select 1
    from public.gmail_imports
    where tenant_id is null
  ) then
    return;
  end if;

  select count(distinct s.tenant_id)::integer
    into v_tenant_count
  from public.absences a
  join public.students s on s.id = a.student_id
  where s.tenant_id is not null;

  if v_tenant_count <> 1 then
    raise exception
      'No se puede etiquetar Gmail: se esperaban ausencias de un único tenant, se encontraron %',
      v_tenant_count;
  end if;

  select s.tenant_id
    into v_tenant_id
  from public.absences a
  join public.students s on s.id = a.student_id
  where s.tenant_id is not null
  limit 1;

  update public.gmail_imports
  set tenant_id = v_tenant_id,
      updated_at = now()
  where tenant_id is null;
end;
$$;
