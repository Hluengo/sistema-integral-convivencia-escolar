-- @license SPDX-License-Identifier: Apache-2.0
-- Fase D: historial de reportes, separado de audit-due-process.

begin;

create table public.report_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  created_by uuid not null default auth.uid() references auth.users(id),
  report_type text not null,
  status text not null default 'completed',
  filters jsonb not null default '{}'::jsonb,
  row_count integer not null default 0,
  file_name text,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz,
  constraint report_history_type_check check (report_type in ('expedientes', 'anotaciones', 'uso', 'auditoria')),
  constraint report_history_status_check check (status in ('queued', 'processing', 'completed', 'failed')),
  constraint report_history_row_count_check check (row_count >= 0)
);

comment on table public.report_history is
  'Historial de generación de reportes. No es audit-due-process ni reemplaza audit_events.';
comment on column public.report_history.filters is
  'Filtros aplicados al reporte: curso, fechas, estado y responsable.';

create index report_history_tenant_created_idx on public.report_history (tenant_id, created_at desc);
create index report_history_tenant_type_idx on public.report_history (tenant_id, report_type, created_at desc);
create index report_history_creator_idx on public.report_history (tenant_id, created_by, created_at desc);

alter table public.report_history enable row level security;
revoke all on table public.report_history from public, anon, authenticated, service_role;
grant select, insert, update on public.report_history to authenticated;
grant all on public.report_history to service_role, postgres;

create policy report_history_select_same_tenant
  on public.report_history for select to authenticated
  using (tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin', 'direccion', 'convivencia', 'inspectoria']));

create policy report_history_insert_same_tenant
  on public.report_history for insert to authenticated
  with check (tenant_id = public.current_tenant_id()
    and created_by = auth.uid()
    and public.current_app_role() = any (array['admin', 'direccion', 'convivencia', 'inspectoria']));

create policy report_history_update_creator
  on public.report_history for update to authenticated
  using (tenant_id = public.current_tenant_id() and created_by = auth.uid()
    and public.current_app_role() = any (array['admin', 'direccion', 'convivencia', 'inspectoria']))
  with check (tenant_id = public.current_tenant_id() and created_by = auth.uid()
    and public.current_app_role() = any (array['admin', 'direccion', 'convivencia', 'inspectoria']));

create policy report_history_delete_denied
  on public.report_history for delete to authenticated using (false);

commit;

select pg_notify('pgrst', 'reload schema');
