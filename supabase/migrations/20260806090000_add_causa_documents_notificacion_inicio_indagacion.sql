-- Notificación de Inicio de Indagación como documento oficial de causa.
--
-- Aísla la persistencia de la notificación (formato hoja Carta, sin IA) del
-- flujo de cartas disciplinarias y del generador Gemini. La tabla guarda el
-- snapshot final del documento emitido (trazabilidad) y el RPC transaccional
-- completa el hito chk_rec_3 y agrega la entrada de bitácora en una sola
-- transacción, con tenant resuelto por RLS en PostgreSQL.

create table if not exists public.causa_documents (
  id uuid primary key default gen_random_uuid(),
  causa_id text not null references public.causas(id),
  doc_type text not null,
  status text not null default 'Pendiente',
  content_snapshot jsonb not null default '{}'::jsonb,
  created_by text,
  emitted_by text,
  student_name text not null,
  apoderado_name text not null,
  course text not null,
  emission_date date not null default CURRENT_DATE,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  tenant_id uuid not null default public.current_tenant_id(),
  constraint causa_documents_doc_type_check
    check (doc_type = 'notificacion_inicio_indagacion'),
  constraint causa_documents_status_check
    check (status in ('Pendiente', 'Notificada', 'Anulada'))
);

alter table public.causa_documents owner to postgres;

create index if not exists idx_causa_documents_tenant_causa_type
  on public.causa_documents (tenant_id, causa_id, doc_type);

alter table public.causa_documents enable row level security;

create policy "causa_documents_tenant_select"
  on public.causa_documents for select
  using ((tenant_id = public.current_tenant_id()));

create policy "causa_documents_tenant_insert"
  on public.causa_documents for insert
  with check ((tenant_id = public.current_tenant_id()));

create policy "causa_documents_tenant_update"
  on public.causa_documents for update
  using ((tenant_id = public.current_tenant_id()))
  with check ((tenant_id = public.current_tenant_id()));

create policy "causa_documents_tenant_delete"
  on public.causa_documents for delete
  using ((tenant_id = public.current_tenant_id()));

-- Marca una notificación como notificada de forma atómica:
--   1) actualiza el documento (snapshot final, emisor, fecha/hora de notificación);
--   2) completa el hito chk_rec_3 del checklist de la causa;
--   3) agrega la entrada de bitácora tipo 'Notificación'.
-- Todo dentro de una única transacción, validando auth, tenant y visibilidad.
create or replace function public.mark_causa_document_notified(
  p_document_id uuid,
  p_snapshot jsonb,
  p_checklist_item jsonb,
  p_bitacora_entry jsonb
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_causa_id text;
  v_student_name text;
  v_course text;
  v_emitted_by text;
  v_now timestamptz := now();
begin
  if auth.uid() is null or v_tenant_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_document_id is null then
    raise exception 'p_document_id is required' using errcode = '22023';
  end if;

  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then
    raise exception 'p_snapshot must be a JSON object' using errcode = '22023';
  end if;

  select c.causa_id, c.student_name, c.course, c.emitted_by
    into v_causa_id, v_student_name, v_course, v_emitted_by
  from public.causa_documents c
  where c.id = p_document_id
    and c.tenant_id = v_tenant_id
    and c.doc_type = 'notificacion_inicio_indagacion';

  if v_causa_id is null then
    raise exception 'document not found or not visible' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.causas c
    where c.id = v_causa_id
      and c.tenant_id = v_tenant_id
  ) then
    raise exception 'causa not found or not visible' using errcode = '42501';
  end if;

  if p_checklist_item is not null then
    if jsonb_typeof(p_checklist_item) <> 'object'
       or p_checklist_item->>'id' is null
       or btrim(p_checklist_item->>'id') = ''
       or p_checklist_item->>'label' is null
       or btrim(p_checklist_item->>'label') = ''
       or p_checklist_item->>'requerido_por' is null
       or btrim(p_checklist_item->>'requerido_por') = '' then
      raise exception 'invalid checklist item payload' using errcode = '22023';
    end if;
  end if;

  if p_bitacora_entry is not null then
    if jsonb_typeof(p_bitacora_entry) <> 'object'
       or p_bitacora_entry->>'id' is null
       or btrim(p_bitacora_entry->>'id') = ''
       or p_bitacora_entry->>'fecha' is null
       or btrim(p_bitacora_entry->>'fecha') = ''
       or p_bitacora_entry->>'tipo' is null
       or btrim(p_bitacora_entry->>'tipo') = ''
       or p_bitacora_entry->>'titulo' is null
       or btrim(p_bitacora_entry->>'titulo') = ''
       or (p_bitacora_entry->'participantes' is not null
           and jsonb_typeof(p_bitacora_entry->'participantes') <> 'array') then
      raise exception 'invalid bitacora entry payload' using errcode = '22023';
    end if;
  end if;

  update public.causa_documents
     set status = 'Notificada',
         content_snapshot = p_snapshot,
         emitted_by = coalesce(p_snapshot->>'emittedBy', v_emitted_by),
         student_name = coalesce(p_snapshot->>'studentName', v_student_name),
         apoderado_name = coalesce(p_snapshot->>'apoderadoName', apoderado_name),
         course = coalesce(p_snapshot->>'course', v_course),
         notified_at = v_now,
         updated_at = v_now
   where id = p_document_id
     and tenant_id = v_tenant_id
     and status = 'Pendiente';

  if not found then
    raise exception 'document already notified or not visible' using errcode = '42501';
  end if;

  if p_checklist_item is not null then
    insert into public.checklist_items (
      id,
      causa_id,
      tenant_id,
      label,
      descripcion,
      completado,
      fecha_completado,
      requerido_por,
      registrado_por,
      observaciones,
      documento_nombre,
      documento_url
    )
    values (
      p_checklist_item->>'id',
      v_causa_id,
      v_tenant_id,
      p_checklist_item->>'label',
      coalesce(p_checklist_item->>'descripcion', ''),
      true,
      coalesce(
        p_checklist_item->>'fecha_completado',
        to_char(v_now at time zone 'America/Santiago', 'YYYY-MM-DD')
      ),
      p_checklist_item->>'requerido_por',
      coalesce(p_checklist_item->>'registrado_por', v_emitted_by),
      nullif(p_checklist_item->>'observaciones', ''),
      nullif(p_checklist_item->>'documento_nombre', ''),
      nullif(p_checklist_item->>'documento_url', '')
    )
    on conflict (id, causa_id) do update
      set label = excluded.label,
          descripcion = excluded.descripcion,
          completado = true,
          fecha_completado = excluded.fecha_completado,
          requerido_por = excluded.requerido_por,
          registrado_por = excluded.registrado_por,
          observaciones = excluded.observaciones,
          documento_nombre = excluded.documento_nombre,
          documento_url = excluded.documento_url
      where public.checklist_items.tenant_id = v_tenant_id
        and public.checklist_items.causa_id = v_causa_id;
  end if;

  if p_bitacora_entry is not null then
    insert into public.bitacora_entries (
      id,
      causa_id,
      tenant_id,
      fecha,
      tipo,
      titulo,
      descripcion,
      participantes,
      documento_adjunto
    )
    values (
      p_bitacora_entry->>'id',
      v_causa_id,
      v_tenant_id,
      p_bitacora_entry->>'fecha',
      p_bitacora_entry->>'tipo',
      p_bitacora_entry->>'titulo',
      coalesce(p_bitacora_entry->>'descripcion', ''),
      coalesce(p_bitacora_entry->'participantes', '[]'::jsonb),
      nullif(p_bitacora_entry->>'documento_adjunto', '')
    )
    on conflict (id) do update
      set fecha = excluded.fecha,
          tipo = excluded.tipo,
          titulo = excluded.titulo,
          descripcion = excluded.descripcion,
          participantes = excluded.participantes,
          documento_adjunto = excluded.documento_adjunto
      where public.bitacora_entries.tenant_id = v_tenant_id
        and public.bitacora_entries.causa_id = v_causa_id;
  end if;
end;
$$;

revoke all on function public.mark_causa_document_notified(uuid, jsonb, jsonb, jsonb) from public;
grant execute on function public.mark_causa_document_notified(uuid, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.mark_causa_document_notified(uuid, jsonb, jsonb, jsonb) to service_role;
