-- La visibilidad grupal es opt-in. Los registros históricos permanecen privados.
alter table public.bitacora_entries
  add column if not exists compartido_grupal boolean not null default false;

alter table public.checklist_progress_entries
  add column if not exists incidente_id uuid references public.incidentes(id) on delete set null;

create index if not exists idx_checklist_progress_incidente_date
  on public.checklist_progress_entries (tenant_id, incidente_id, occurred_at desc)
  where incidente_id is not null;

create or replace function public.ensure_checklist_progress_incidente_same_tenant()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.incidente_id is not null and not exists (
    select 1
    from public.causas c
    where c.id = new.causa_id
      and c.incidente_id = new.incidente_id
      and c.tenant_id = new.tenant_id
  ) then
    raise exception 'The progress incident does not belong to the causa';
  end if;
  return new;
end;
$$;

drop trigger if exists checklist_progress_incidente_same_tenant
  on public.checklist_progress_entries;
create trigger checklist_progress_incidente_same_tenant
  before insert or update of causa_id, incidente_id, tenant_id
  on public.checklist_progress_entries
  for each row execute function public.ensure_checklist_progress_incidente_same_tenant();

create or replace function public.ensure_bitacora_group_sharing_allowed()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.compartido_grupal and not exists (
    select 1
    from public.causas c
    where c.id = new.causa_id
      and c.incidente_id is not null
      and c.tenant_id = new.tenant_id
  ) then
    raise exception 'The bitacora entry has no group incident';
  end if;
  return new;
end;
$$;

drop trigger if exists bitacora_group_sharing_allowed on public.bitacora_entries;
create trigger bitacora_group_sharing_allowed
  before insert or update of causa_id, compartido_grupal, tenant_id
  on public.bitacora_entries
  for each row execute function public.ensure_bitacora_group_sharing_allowed();

revoke all on function public.ensure_checklist_progress_incidente_same_tenant() from public, anon;
grant execute on function public.ensure_checklist_progress_incidente_same_tenant() to authenticated, service_role;
revoke all on function public.ensure_bitacora_group_sharing_allowed() from public, anon;
grant execute on function public.ensure_bitacora_group_sharing_allowed() to authenticated, service_role;

create or replace function public.save_bitacora_snapshot(
  p_causa_id text,
  p_entries jsonb,
  p_removed_entry_ids jsonb default '[]'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_expected_count integer;
  v_written_count integer;
begin
  if auth.uid() is null or v_tenant_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_causa_id is null or btrim(p_causa_id) = '' then
    raise exception 'p_causa_id is required' using errcode = '22023';
  end if;
  if p_entries is null or jsonb_typeof(p_entries) <> 'array' then
    raise exception 'p_entries must be a JSON array' using errcode = '22023';
  end if;
  if p_removed_entry_ids is null or jsonb_typeof(p_removed_entry_ids) <> 'array' then
    raise exception 'p_removed_entry_ids must be a JSON array' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.causas c
    where c.id = p_causa_id and c.tenant_id = v_tenant_id
  ) then
    raise exception 'causa not found or not visible' using errcode = '42501';
  end if;

  with payload as (
    select * from jsonb_to_recordset(p_entries) as entry(
      id text, fecha text, tipo text, titulo text, descripcion text,
      participantes jsonb, documento_adjunto text, compartido_grupal boolean
    )
  )
  select count(*)::integer into v_expected_count from payload;

  with payload as (
    select * from jsonb_to_recordset(p_entries) as entry(
      id text, fecha text, tipo text, titulo text, descripcion text,
      participantes jsonb, documento_adjunto text, compartido_grupal boolean
    )
  )
  select count(*)::integer into v_written_count
  from payload
  where id is null or btrim(id) = '' or fecha is null or btrim(fecha) = ''
    or tipo is null or btrim(tipo) = '' or titulo is null or btrim(titulo) = ''
    or (participantes is not null and jsonb_typeof(participantes) <> 'array');
  if v_written_count > 0 then
    raise exception 'invalid bitacora snapshot payload' using errcode = '22023';
  end if;

  with payload as (
    select * from jsonb_to_recordset(p_entries) as entry(
      id text, fecha text, tipo text, titulo text, descripcion text,
      participantes jsonb, documento_adjunto text, compartido_grupal boolean
    )
  )
  select (count(*) - count(distinct id))::integer into v_written_count from payload;
  if v_written_count > 0 then
    raise exception 'duplicate bitacora entry ids in snapshot' using errcode = '23505';
  end if;

  with payload as (
    select * from jsonb_to_recordset(p_entries) as entry(
      id text, fecha text, tipo text, titulo text, descripcion text,
      participantes jsonb, documento_adjunto text, compartido_grupal boolean
    )
  ), written as (
    insert into public.bitacora_entries (
      id, causa_id, tenant_id, fecha, tipo, titulo, descripcion,
      participantes, documento_adjunto, compartido_grupal
    )
    select id, p_causa_id, v_tenant_id, fecha, tipo, titulo,
      coalesce(descripcion, ''), coalesce(participantes, '[]'::jsonb),
      nullif(documento_adjunto, ''), coalesce(compartido_grupal, false)
    from payload
    on conflict (id) do update set
      fecha = excluded.fecha,
      tipo = excluded.tipo,
      titulo = excluded.titulo,
      descripcion = excluded.descripcion,
      participantes = excluded.participantes,
      documento_adjunto = excluded.documento_adjunto,
      compartido_grupal = excluded.compartido_grupal
    where public.bitacora_entries.tenant_id = v_tenant_id
      and public.bitacora_entries.causa_id = p_causa_id
    returning 1
  )
  select count(*)::integer into v_written_count from written;
  if v_written_count <> v_expected_count then
    raise exception 'bitacora snapshot write conflict' using errcode = '40001';
  end if;

  delete from public.bitacora_entries entry
  where entry.tenant_id = v_tenant_id and entry.causa_id = p_causa_id
    and entry.id in (
      select removed_id from jsonb_array_elements_text(p_removed_entry_ids) as removed(removed_id)
    );
end;
$$;

revoke all on function public.save_bitacora_snapshot(text, jsonb, jsonb) from public, anon;
grant execute on function public.save_bitacora_snapshot(text, jsonb, jsonb) to authenticated;
grant execute on function public.save_bitacora_snapshot(text, jsonb, jsonb) to service_role;
