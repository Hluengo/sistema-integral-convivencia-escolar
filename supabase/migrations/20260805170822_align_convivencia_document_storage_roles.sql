/** @license SPDX-License-Identifier: Apache-2.0 */

-- Align documentos_convivencia Storage RLS with the convivencia app roles
-- accepted by the application middleware. Staff users can update causes and
-- checklist entries, so they must also be able to upload the private evidence
-- documents attached to those records.

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
      and m.role in (
        'superadmin',
        'admin',
        'direccion',
        'convivencia',
        'inspectoria',
        'profesor_jefe',
        'teacher',
        'inspector',
        'user',
        'staff'
      )
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
      and m.role in (
        'superadmin',
        'admin',
        'direccion',
        'convivencia',
        'inspectoria',
        'profesor_jefe',
        'teacher',
        'inspector',
        'user',
        'staff'
      )
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
      and m.role in (
        'superadmin',
        'admin',
        'direccion',
        'convivencia',
        'inspectoria',
        'profesor_jefe',
        'teacher',
        'inspector',
        'user',
        'staff'
      )
      and m.is_active
  )
);
