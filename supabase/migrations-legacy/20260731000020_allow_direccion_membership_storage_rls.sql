-- AUD-02: allow 'direccion' members to access private storage buckets.
-- Backfill 20260728000006 creates memberships with role = profiles.role
-- ('convivencia' OR 'direccion'), but the storage policies only match
-- m.role = 'convivencia', blocking direccion users. The client already
-- allows both roles (membershipConfig.ts APP_ROLE_RULES).
-- This migration recreates the affected policies with role IN (...).

-- --- bucket: disciplinary-processes ---

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
      and m.role in ('convivencia', 'direccion')
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
      and m.role in ('convivencia', 'direccion')
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
      and m.role in ('convivencia', 'direccion')
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
      and m.role in ('convivencia', 'direccion')
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
      and m.role in ('convivencia', 'direccion')
      and m.is_active
      and m.tenant_id::text = (storage.foldername(name))[1]
  )
);

-- --- bucket: documentos_convivencia ---

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
      and m.role in ('convivencia', 'direccion')
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
      and m.role in ('convivencia', 'direccion')
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
      and m.role in ('convivencia', 'direccion')
      and m.is_active
  )
);
