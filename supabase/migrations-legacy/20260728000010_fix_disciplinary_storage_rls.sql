-- Restore tenant-scoped RLS policies for the private disciplinary PDF bucket.
-- Access is limited to authenticated users with an active Convivencia membership.

drop policy if exists "Users can upload disciplinary files" on storage.objects;
drop policy if exists "Users can view their tenant's files" on storage.objects;
drop policy if exists "Users can update their tenant's files" on storage.objects;
drop policy if exists "Users can delete their tenant's files" on storage.objects;
drop policy if exists "disciplinary_processes_insert_member" on storage.objects;
drop policy if exists "disciplinary_processes_select_member" on storage.objects;
drop policy if exists "disciplinary_processes_update_member" on storage.objects;
drop policy if exists "disciplinary_processes_delete_member" on storage.objects;

create policy "disciplinary_processes_insert_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'disciplinary-processes'
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role = 'convivencia'
      and m.is_active
      and m.tenant_id::text = (storage.foldername(name))[1]
  )
);

create policy "disciplinary_processes_select_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'disciplinary-processes'
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role = 'convivencia'
      and m.is_active
      and m.tenant_id::text = (storage.foldername(name))[1]
  )
);

create policy "disciplinary_processes_update_member"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'disciplinary-processes'
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role = 'convivencia'
      and m.is_active
      and m.tenant_id::text = (storage.foldername(name))[1]
  )
)
with check (
  bucket_id = 'disciplinary-processes'
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role = 'convivencia'
      and m.is_active
      and m.tenant_id::text = (storage.foldername(name))[1]
  )
);

create policy "disciplinary_processes_delete_member"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'disciplinary-processes'
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role = 'convivencia'
      and m.is_active
      and m.tenant_id::text = (storage.foldername(name))[1]
  )
);
