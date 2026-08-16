/** @license SPDX-License-Identifier: Apache-2.0 */

-- Align the disciplinary-processes bucket RLS with the convivencia app roles
-- accepted by the application middleware. The previous policy only accepted
-- convivencia/direccion memberships, so admin users could open the PDF modal
-- but Storage rejected private uploads before analysis.

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
      and m.tenant_id::text = (storage.foldername(name))[1]
  )
);
