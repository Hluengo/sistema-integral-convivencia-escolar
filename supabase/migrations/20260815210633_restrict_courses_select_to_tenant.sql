/** @license SPDX-License-Identifier: Apache-2.0 */

-- Evita que la policy staff permita leer cursos de otros tenants.
drop policy if exists "p_courses_staff_select" on public.courses;

create policy "p_courses_staff_select"
on public.courses
for select
to authenticated
using (
  is_staff()
  and tenant_id = current_tenant_id()
);
