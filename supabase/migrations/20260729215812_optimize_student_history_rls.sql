-- Cover the student foreign key and evaluate auth context once per statement.

drop index if exists public.student_history_entries_tenant_student_created_idx;

create index student_history_entries_student_tenant_created_idx
  on public.student_history_entries (student_id, tenant_id, created_at desc);

drop policy if exists student_history_entries_select_tenant
  on public.student_history_entries;
drop policy if exists student_history_entries_insert_tenant
  on public.student_history_entries;

create policy student_history_entries_select_tenant
  on public.student_history_entries
  for select
  to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.current_app_role()) = any (
      array['admin', 'direccion', 'convivencia', 'inspectoria', 'inspector', 'staff', 'superuser']
    )
  );

create policy student_history_entries_insert_tenant
  on public.student_history_entries
  for insert
  to authenticated
  with check (
    tenant_id = (select public.current_tenant_id())
    and created_by = (select auth.uid())
    and (select public.current_app_role()) = any (
      array['admin', 'direccion', 'convivencia', 'inspectoria', 'inspector', 'staff', 'superuser']
    )
    and exists (
      select 1
      from public.students s
      where s.id = student_id
        and s.tenant_id = (select public.current_tenant_id())
    )
  );
