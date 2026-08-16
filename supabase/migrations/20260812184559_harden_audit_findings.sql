-- Cierra hallazgos de auditoria sin retirar permisos necesarios para RLS.

-- current_role() solo se usaba como helper interno de politicas. Nunca debe
-- ser una funcion RPC anonima expuesta en el Data API.
revoke execute on function public.current_role() from anon;

-- Estas tablas legacy no participan en la aplicacion actual. Mantener RLS
-- activo con politicas deny explicitas evita una tabla protegida sin contrato
-- visible y conserva el acceso del service_role para tareas administrativas.
revoke all on table public.coexistence_cases from anon, authenticated;
revoke all on table public.membership_invitations from anon, authenticated;

drop policy if exists coexistence_cases_no_client_access on public.coexistence_cases;
create policy coexistence_cases_no_client_access
  on public.coexistence_cases
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists membership_invitations_no_client_access on public.membership_invitations;
create policy membership_invitations_no_client_access
  on public.membership_invitations
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Indices para las FKs y joins de avances repetibles.
create index if not exists idx_checklist_progress_entries_causa
  on public.checklist_progress_entries (causa_id);

create index if not exists idx_checklist_progress_entries_created_by
  on public.checklist_progress_entries (created_by);

create index if not exists idx_checklist_progress_entries_invalidated_by
  on public.checklist_progress_entries (invalidated_by);

create index if not exists idx_checklist_progress_entries_item_causa
  on public.checklist_progress_entries (checklist_item_id, causa_id);
