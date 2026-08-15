/** @license SPDX-License-Identifier: Apache-2.0 */

-- Vincula causas antiguas que fueron creadas antes de persistir student_id.
-- Solo actualiza coincidencias únicas dentro del mismo tenant, nombre y curso.
with candidates as (
  select
    causa.id as causa_id,
    (array_agg(student.id))[1] as student_id
  from public.causas as causa
  join public.students as student
    on student.tenant_id = causa.tenant_id
   and lower(trim(student.full_name)) = lower(trim(causa.estudiante_nombre))
  join public.courses as course
    on course.id = student.course_id
   and lower(trim(course.name)) = lower(trim(causa.estudiante_curso))
  where causa.student_id is null
  group by causa.id
  having count(*) = 1
)
update public.causas as causa
set student_id = candidates.student_id
from candidates
where causa.id = candidates.causa_id
  and causa.student_id is null;
