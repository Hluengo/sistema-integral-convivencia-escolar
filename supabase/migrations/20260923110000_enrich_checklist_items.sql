-- Enriquece hitos sin obligar a completar información histórica.
alter table public.checklist_items
  add column if not exists obligatorio boolean,
  add column if not exists aplicabilidad text,
  add column if not exists estado text,
  add column if not exists fundamento_no_aplica text,
  add column if not exists fecha_inicio date,
  add column if not exists fecha_limite date,
  add column if not exists resultado text,
  add column if not exists bloqueante_para_avanzar boolean,
  add column if not exists bloqueante_para_cerrar boolean;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'checklist_items_aplicabilidad_check'
      and conrelid = 'public.checklist_items'::regclass
  ) then
    alter table public.checklist_items
      add constraint checklist_items_aplicabilidad_check
      check (aplicabilidad is null or aplicabilidad in ('pendiente', 'aplica', 'no_aplica'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'checklist_items_estado_check'
      and conrelid = 'public.checklist_items'::regclass
  ) then
    alter table public.checklist_items
      add constraint checklist_items_estado_check
      check (estado is null or estado in ('no_iniciado', 'en_desarrollo', 'cumplido', 'vencido', 'no_aplica', 'invalidado'));
  end if;
end
$$;

create or replace function public.save_checklist_snapshot(
  p_causa_id text,
  p_items jsonb,
  p_removed_item_ids jsonb default '[]'::jsonb
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
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items must be a JSON array' using errcode = '22023';
  end if;
  if p_removed_item_ids is null or jsonb_typeof(p_removed_item_ids) <> 'array' then
    raise exception 'p_removed_item_ids must be a JSON array' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.causas c
    where c.id = p_causa_id and c.tenant_id = v_tenant_id
  ) then
    raise exception 'causa not found or not visible' using errcode = '42501';
  end if;

  with payload as (
    select * from jsonb_to_recordset(p_items) as item(
      id text, label text, descripcion text, completado boolean,
      fecha_completado text, obligatorio boolean, aplicabilidad text,
      estado text, fundamento_no_aplica text, fecha_inicio text,
      fecha_limite text, resultado text, bloqueante_para_avanzar boolean,
      bloqueante_para_cerrar boolean, requerido_por text, registrado_por text,
      observaciones text, documento_nombre text, documento_url text
    )
  )
  select count(*)::integer into v_expected_count from payload;

  with payload as (
    select * from jsonb_to_recordset(p_items) as item(
      id text, label text, descripcion text, completado boolean,
      fecha_completado text, obligatorio boolean, aplicabilidad text,
      estado text, fundamento_no_aplica text, fecha_inicio text,
      fecha_limite text, resultado text, bloqueante_para_avanzar boolean,
      bloqueante_para_cerrar boolean, requerido_por text, registrado_por text,
      observaciones text, documento_nombre text, documento_url text
    )
  )
  select count(*)::integer into v_written_count
  from payload
  where id is null or btrim(id) = '' or label is null or btrim(label) = ''
    or requerido_por is null or btrim(requerido_por) = '';
  if v_written_count > 0 then
    raise exception 'invalid checklist snapshot payload' using errcode = '22023';
  end if;

  with payload as (
    select * from jsonb_to_recordset(p_items) as item(
      id text, label text, descripcion text, completado boolean,
      fecha_completado text, obligatorio boolean, aplicabilidad text,
      estado text, fundamento_no_aplica text, fecha_inicio text,
      fecha_limite text, resultado text, bloqueante_para_avanzar boolean,
      bloqueante_para_cerrar boolean, requerido_por text, registrado_por text,
      observaciones text, documento_nombre text, documento_url text
    )
  )
  select (count(*) - count(distinct id))::integer into v_written_count from payload;
  if v_written_count > 0 then
    raise exception 'duplicate checklist item ids in snapshot' using errcode = '23505';
  end if;

  with payload as (
    select * from jsonb_to_recordset(p_items) as item(
      id text, label text, descripcion text, completado boolean,
      fecha_completado text, obligatorio boolean, aplicabilidad text,
      estado text, fundamento_no_aplica text, fecha_inicio text,
      fecha_limite text, resultado text, bloqueante_para_avanzar boolean,
      bloqueante_para_cerrar boolean, requerido_por text, registrado_por text,
      observaciones text, documento_nombre text, documento_url text
    )
  ), written as (
    insert into public.checklist_items (
      id, causa_id, tenant_id, label, descripcion, completado, fecha_completado,
      obligatorio, aplicabilidad, estado, fundamento_no_aplica, fecha_inicio,
      fecha_limite, resultado, bloqueante_para_avanzar, bloqueante_para_cerrar,
      requerido_por, registrado_por, observaciones, documento_nombre, documento_url
    )
    select
      id, p_causa_id, v_tenant_id, label, coalesce(descripcion, ''),
      coalesce(completado, false), nullif(fecha_completado, ''), obligatorio,
      nullif(aplicabilidad, ''), nullif(estado, ''), nullif(fundamento_no_aplica, ''),
      nullif(fecha_inicio, '')::date, nullif(fecha_limite, '')::date,
      nullif(resultado, ''), bloqueante_para_avanzar, bloqueante_para_cerrar,
      requerido_por, nullif(registrado_por, ''), nullif(observaciones, ''),
      nullif(documento_nombre, ''), nullif(documento_url, '')
    from payload
    on conflict (id, causa_id) do update set
      label = excluded.label,
      descripcion = excluded.descripcion,
      completado = excluded.completado,
      fecha_completado = excluded.fecha_completado,
      obligatorio = excluded.obligatorio,
      aplicabilidad = excluded.aplicabilidad,
      estado = excluded.estado,
      fundamento_no_aplica = excluded.fundamento_no_aplica,
      fecha_inicio = excluded.fecha_inicio,
      fecha_limite = excluded.fecha_limite,
      resultado = excluded.resultado,
      bloqueante_para_avanzar = excluded.bloqueante_para_avanzar,
      bloqueante_para_cerrar = excluded.bloqueante_para_cerrar,
      requerido_por = excluded.requerido_por,
      registrado_por = excluded.registrado_por,
      observaciones = excluded.observaciones,
      documento_nombre = excluded.documento_nombre,
      documento_url = excluded.documento_url
    where public.checklist_items.tenant_id = v_tenant_id
      and public.checklist_items.causa_id = p_causa_id
    returning 1
  )
  select count(*)::integer into v_written_count from written;
  if v_written_count <> v_expected_count then
    raise exception 'checklist snapshot write conflict' using errcode = '40001';
  end if;

  delete from public.checklist_items item
  where item.tenant_id = v_tenant_id and item.causa_id = p_causa_id
    and item.id in (
      select removed_id from jsonb_array_elements_text(p_removed_item_ids) as removed(removed_id)
    );
end;
$$;
