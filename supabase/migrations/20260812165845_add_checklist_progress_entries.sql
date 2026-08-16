/** @license SPDX-License-Identifier: Apache-2.0 */

create table if not exists public.checklist_progress_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id()
    references public.tenants(id),
  causa_id text not null,
  checklist_item_id text not null,
  title text not null check (btrim(title) <> ''),
  description text not null check (btrim(description) <> ''),
  entry_type text not null check (
    entry_type = any (array['Entrevista', 'Evidencia', 'Notificación', 'Mediación', 'Resolución', 'Otro'])
  ),
  occurred_at timestamp with time zone not null default now(),
  document_name text,
  document_url text,
  created_by uuid references public.profiles(user_id),
  created_at timestamp with time zone not null default now(),
  invalidated_at timestamp with time zone,
  invalidated_by uuid references public.profiles(user_id),
  invalidation_reason text,
  constraint checklist_progress_entries_causa_fkey
    foreign key (causa_id) references public.causas(id) on delete cascade,
  constraint checklist_progress_entries_item_fkey
    foreign key (checklist_item_id, causa_id)
    references public.checklist_items(id, causa_id),
  constraint checklist_progress_entries_invalidation_check check (
    (invalidated_at is null and invalidated_by is null and invalidation_reason is null)
    or (invalidated_at is not null and invalidated_by is not null and btrim(coalesce(invalidation_reason, '')) <> '')
  )
);

create index if not exists idx_checklist_progress_tenant_causa_item_date
  on public.checklist_progress_entries (tenant_id, causa_id, checklist_item_id, occurred_at desc);

create index if not exists idx_checklist_progress_tenant_causa_created
  on public.checklist_progress_entries (tenant_id, causa_id, created_at desc);

alter table public.checklist_progress_entries enable row level security;

create policy checklist_progress_tenant_select
  on public.checklist_progress_entries for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

create policy checklist_progress_tenant_insert
  on public.checklist_progress_entries for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id());

create policy checklist_progress_tenant_update
  on public.checklist_progress_entries for update
  to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy checklist_progress_tenant_delete
  on public.checklist_progress_entries for delete
  to authenticated
  using (tenant_id = public.current_tenant_id());

revoke all on table public.checklist_progress_entries from anon;
grant select, insert, update, delete on table public.checklist_progress_entries to authenticated;
grant all on table public.checklist_progress_entries to service_role;
