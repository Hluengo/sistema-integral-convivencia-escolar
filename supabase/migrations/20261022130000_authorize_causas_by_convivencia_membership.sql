-- A04: membresía de Convivencia como autoridad del expediente (ADR-0009).
-- No cambia los resolutores de identidad compartidos con Inasistencias.
create or replace function public.current_convivencia_role()
returns text language sql stable security definer
set search_path = public, pg_temp
as $$
  select m.role
  from public.profiles p
  join public.app_memberships m on m.user_id = p.user_id and m.tenant_id = p.tenant_id
  join public.applications a on a.code = m.application_code
  where p.user_id = auth.uid() and p.is_active and m.is_active and a.is_active
    and m.application_code = 'convivencia'
  limit 1;
$$;
alter function public.current_convivencia_role() owner to postgres;
revoke all on function public.current_convivencia_role() from public, anon;
grant execute on function public.current_convivencia_role() to authenticated, service_role;

do $$
declare target record; operation text; policy_name text;
  tenant_condition text := 'tenant_id = public.current_tenant_id()';
  read_condition text := 'public.current_convivencia_role() is not null';
  write_condition text := 'public.current_convivencia_role() = any (array[''superadmin'',''admin'',''direccion'',''convivencia'',''inspectoria'',''inspector'',''staff''])';
  admin_condition text := 'public.current_convivencia_role() = any (array[''superadmin'',''admin'',''direccion''])';
begin
  for target in select * from (values
    ('incidentes', 'incidentes'), ('causas', 'causas'),
    ('checklist_items', 'checklist'), ('bitacora_entries', 'bitacora'),
    ('checklist_progress_entries', 'checklist_progress'), ('causa_documents', 'causa_documents')
  ) as tables(table_name, policy_prefix) loop
    foreach operation in array array['select','insert','update','delete'] loop
      policy_name := target.policy_prefix || '_tenant_' || operation;
      execute format('drop policy if exists %I on public.%I', policy_name, target.table_name);
      case operation
        when 'select' then
          execute format('create policy %I on public.%I for select to authenticated using (%s and %s)', policy_name, target.table_name, tenant_condition, read_condition);
        when 'insert' then
          execute format('create policy %I on public.%I for insert to authenticated with check (%s and %s)', policy_name, target.table_name, tenant_condition, write_condition);
        when 'update' then
          execute format('create policy %I on public.%I for update to authenticated using (%s and %s) with check (%s and %s)', policy_name, target.table_name, tenant_condition, write_condition, tenant_condition, write_condition);
        when 'delete' then
          execute format('create policy %I on public.%I for delete to authenticated using (%s and %s)', policy_name, target.table_name, tenant_condition, admin_condition);
      end case;
    end loop;
  end loop;
end $$;

create or replace function public.protect_causa_reopen()
returns trigger language plpgsql security invoker
set search_path = public, pg_temp
as $$
begin
  if old.estado_actual = 'Causa Cerrada' and new.estado_actual <> old.estado_actual
     and current_user not in ('postgres', 'supabase_admin', 'service_role')
     and coalesce(public.current_convivencia_role(), '') not in ('superadmin','admin','direccion') then
    raise exception 'Solo administración de Convivencia puede reabrir un expediente'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_causa_reopen() from public, anon;
grant execute on function public.protect_causa_reopen() to authenticated, service_role;
create trigger causas_protect_reopen before update of estado_actual on public.causas
for each row execute function public.protect_causa_reopen();

create or replace function public.delete_causa_cascade(p_causa_id text)
returns boolean language plpgsql security invoker
set search_path = public, pg_temp
as $$
declare v_deleted integer;
begin
  if coalesce(public.current_convivencia_role(), '') not in ('admin','direccion','superadmin') then
    raise exception 'No tiene permiso para eliminar el expediente' using errcode = '42501';
  end if;
  if not exists (select 1 from public.causas where id = p_causa_id and tenant_id = public.current_tenant_id()) then
    return false;
  end if;
  delete from public.bitacora_entries where causa_id = p_causa_id and tenant_id = public.current_tenant_id();
  delete from public.checklist_progress_entries where causa_id = p_causa_id and tenant_id = public.current_tenant_id();
  delete from public.checklist_items where causa_id = p_causa_id and tenant_id = public.current_tenant_id();
  delete from public.causa_documents where causa_id = p_causa_id and tenant_id = public.current_tenant_id();
  delete from public.causas where id = p_causa_id and tenant_id = public.current_tenant_id();
  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
end;
$$;

create or replace function public.ensure_causa_student_same_tenant()
returns trigger language plpgsql security invoker
set search_path = public, pg_temp
as $$
begin
  if new.student_id is not null and not exists (
    select 1 from public.students where id = new.student_id and tenant_id = new.tenant_id
  ) then
    raise exception 'El estudiante no pertenece al colegio del expediente' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.ensure_causa_student_same_tenant() from public, anon;
grant execute on function public.ensure_causa_student_same_tenant() to authenticated, service_role;
create trigger causas_student_same_tenant before insert or update of student_id, tenant_id on public.causas
for each row execute function public.ensure_causa_student_same_tenant();
