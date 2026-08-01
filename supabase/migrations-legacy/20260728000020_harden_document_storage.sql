-- Harden private document storage before production rollout.
-- Existing objects and database rows are preserved.

update storage.buckets
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ]::text[]
where id = 'documentos_convivencia';

update storage.buckets
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf']::text[]
where id = 'disciplinary-processes';

drop policy if exists "documentos_convivencia_insert_member" on storage.objects;
drop policy if exists "documentos_convivencia_select_member" on storage.objects;
drop policy if exists "documentos_convivencia_delete_member" on storage.objects;

create policy "documentos_convivencia_insert_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documentos_convivencia'
  and (storage.foldername(name))[2] = 'documentos'
  and exists (
    select 1
    from public.causas c
    join public.app_memberships m on m.tenant_id = c.tenant_id
    where c.id = (storage.foldername(name))[1]
      and m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role = 'convivencia'
      and m.is_active
  )
);

create policy "documentos_convivencia_select_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documentos_convivencia'
  and (storage.foldername(name))[2] = 'documentos'
  and exists (
    select 1
    from public.causas c
    join public.app_memberships m on m.tenant_id = c.tenant_id
    where c.id = (storage.foldername(name))[1]
      and m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role = 'convivencia'
      and m.is_active
  )
);

create policy "documentos_convivencia_delete_member"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'documentos_convivencia'
  and (storage.foldername(name))[2] = 'documentos'
  and exists (
    select 1
    from public.causas c
    join public.app_memberships m on m.tenant_id = c.tenant_id
    where c.id = (storage.foldername(name))[1]
      and m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role = 'convivencia'
      and m.is_active
  )
);
