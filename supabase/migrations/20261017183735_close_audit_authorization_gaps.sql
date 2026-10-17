-- Cierra los huecos de autorización detectados en la auditoría integral.
-- La aplicación sigue ocultando acciones según rol, pero la RLS es la barrera
-- efectiva ante llamadas directas al API de Supabase.

create or replace function public.current_tenant_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant_id uuid;
begin
  if auth.uid() is null then
    return null;
  end if;

  select p.tenant_id
    into v_tenant_id
  from public.profiles p
  where p.user_id = auth.uid()
    and p.is_active = true
    and exists (
      select 1
      from public.app_memberships m
      join public.applications a on a.code = m.application_code
      where m.user_id = p.user_id
        and m.tenant_id = p.tenant_id
        and m.is_active = true
        and a.is_active = true
    )
  limit 1;

  return v_tenant_id;
end;
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.role
  from public.profiles p
  where p.user_id = auth.uid()
    and p.is_active = true
    and p.tenant_id = public.current_tenant_id()
  limit 1;
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_app_role(), 'teacher');
$$;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_role text;
  v_is_superadmin boolean;
begin
  -- Service role y procesos internos no llevan auth.uid().
  if auth.uid() is null then
    return new;
  end if;

  v_actor_role := public.current_app_role();
  v_is_superadmin := v_actor_role = 'superadmin' or public.is_superuser();

  if v_is_superadmin then
    return new;
  end if;

  if v_actor_role not in ('admin', 'direccion') then
    if tg_op = 'UPDATE'
       and new.role is not distinct from old.role
       and new.tenant_id is not distinct from old.tenant_id
       and new.is_active is not distinct from old.is_active then
      return new;
    end if;
    raise exception 'Solo administración puede cambiar privilegios del perfil'
      using errcode = '42501';
  end if;

  if new.role = 'superadmin' then
    raise exception 'Solo un superadmin puede asignar el rol superadmin'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.tenant_id is distinct from old.tenant_id then
    raise exception 'La administración local no puede mover perfiles de colegio'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop policy if exists "causas_tenant_insert" on public.causas;
create policy "causas_tenant_insert" on public.causas
  for insert
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array[
      'admin','direccion','convivencia','inspectoria','inspector','staff'
    ])
  );

drop policy if exists "causas_tenant_update" on public.causas;
create policy "causas_tenant_update" on public.causas
  for update
  using (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array[
      'admin','direccion','convivencia','inspectoria','inspector','staff'
    ])
  )
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array[
      'admin','direccion','convivencia','inspectoria','inspector','staff'
    ])
  );

drop policy if exists "checklist_tenant_insert" on public.checklist_items;
create policy "checklist_tenant_insert" on public.checklist_items
  for insert with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array[
      'admin','direccion','convivencia','inspectoria','inspector','staff'
    ])
  );

drop policy if exists "checklist_tenant_update" on public.checklist_items;
create policy "checklist_tenant_update" on public.checklist_items
  for update
  using (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array[
      'admin','direccion','convivencia','inspectoria','inspector','staff'
    ])
  )
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array[
      'admin','direccion','convivencia','inspectoria','inspector','staff'
    ])
  );

drop policy if exists "inspectorate_tenant_insert" on public.inspectorate_records;
create policy "inspectorate_tenant_insert" on public.inspectorate_records
  for insert with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array[
      'admin','direccion','convivencia','inspectoria','inspector','staff'
    ])
  );

drop policy if exists "inspectorate_tenant_update" on public.inspectorate_records;
create policy "inspectorate_tenant_update" on public.inspectorate_records
  for update
  using (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array[
      'admin','direccion','convivencia','inspectoria','inspector','staff'
    ])
  )
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array[
      'admin','direccion','convivencia','inspectoria','inspector','staff'
    ])
  );

-- Gmail imports pertenecía a un esquema compartido sin tenant_id. Las filas
-- antiguas quedan deliberadamente fuera de la vista hasta ser etiquetadas por
-- el proceso de ingestión dueño de Inasistencias.
alter table if exists public.gmail_imports
  add column if not exists tenant_id uuid;

drop policy if exists "p_gmail_imports_staff_select" on public.gmail_imports;
create policy "p_gmail_imports_staff_select" on public.gmail_imports
  for select to authenticated
  using (
    public.is_staff()
    and tenant_id = public.current_tenant_id()
  );

drop policy if exists "p_gmail_imports_superuser_delete" on public.gmail_imports;
create policy "p_gmail_imports_superuser_delete" on public.gmail_imports
  for delete to authenticated
  using (
    public.is_superuser()
    and tenant_id = public.current_tenant_id()
  );

create or replace function public.ignore_gmail_import(p_import_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_staff() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.gmail_imports
  set status = 'IGNORED', error_message = 'Ignorada manualmente',
      reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_import_id
    and tenant_id = public.current_tenant_id()
    and status in ('PENDING', 'NEEDS_REVIEW', 'ERROR');
end;
$$;

create or replace function public.retry_gmail_import(p_import_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_staff() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.gmail_imports
  set status = 'PENDING', error_message = null,
      reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_import_id
    and tenant_id = public.current_tenant_id()
    and status = 'ERROR';
end;
$$;

create or replace function public.approve_gmail_import(
  p_import_id uuid,
  p_student_id uuid,
  p_start_date date,
  p_end_date date
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_import public.gmail_imports;
  v_absence_id uuid;
begin
  if not public.is_staff() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'invalid dates' using errcode = '22023';
  end if;

  select * into v_import
  from public.gmail_imports
  where id = p_import_id
    and tenant_id = public.current_tenant_id()
  for update;

  if not found then
    raise exception 'import not found' using errcode = 'P0002';
  end if;
  if v_import.status not in ('PENDING', 'NEEDS_REVIEW', 'ERROR') then
    raise exception 'import is not reviewable' using errcode = '55000';
  end if;
  if not exists (
    select 1 from public.students s
    where s.id = p_student_id
      and s.tenant_id = public.current_tenant_id()
  ) then
    raise exception 'student not found in current tenant' using errcode = '42501';
  end if;

  insert into public.absences (
    student_id, start_date, end_date, observation, document_url, status
  ) values (
    p_student_id, p_start_date, p_end_date,
    coalesce(v_import.extracted_data ->> 'reason', 'Importación desde Gmail'),
    v_import.document_path,
    case when v_import.document_path is null then 'PENDIENTE' else 'JUSTIFICADA' end
  ) returning id into v_absence_id;

  update public.gmail_imports
  set status = 'CREATED', absence_id = v_absence_id,
      reviewed_by = auth.uid(), reviewed_at = now(), error_message = null
  where id = p_import_id
    and tenant_id = public.current_tenant_id();

  insert into public.audit_logs (
    table_name, record_id, action, new_data, changed_by, performed_by, metadata
  ) values (
    'absences', v_absence_id, 'CREATE',
    jsonb_build_object('source', 'gmail_import', 'import_id', p_import_id),
    auth.uid(), auth.uid(), jsonb_build_object('gmail_import_id', p_import_id)
  );

  return v_absence_id;
end;
$$;

-- El borrado de un expediente y sus snapshots debe ser una sola transacción.
create or replace function public.delete_causa_cascade(p_causa_id text)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  if public.current_app_role() <> all (array['admin', 'direccion', 'superadmin']) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.causas
    where id = p_causa_id and tenant_id = public.current_tenant_id()
  ) then
    return false;
  end if;

  delete from public.bitacora_entries
  where causa_id = p_causa_id and tenant_id = public.current_tenant_id();
  delete from public.checklist_items
  where causa_id = p_causa_id and tenant_id = public.current_tenant_id();
  delete from public.causa_documents
  where causa_id = p_causa_id and tenant_id = public.current_tenant_id();
  delete from public.causas
  where id = p_causa_id and tenant_id = public.current_tenant_id();

  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
end;
$$;

revoke all on function public.delete_causa_cascade(text) from public;
grant execute on function public.delete_causa_cascade(text) to authenticated;
