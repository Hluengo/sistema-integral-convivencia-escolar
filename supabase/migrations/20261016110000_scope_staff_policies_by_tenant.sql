-- #2: las políticas de absences/tests/instant_messages sólo exigían
-- is_staff() (= current_role() in ('staff','superuser')), sin filtrar por
-- colegio: un staff de cualquier establecimiento leía las anotaciones,
-- ausencias y mensajes de todos los demás.
--
-- Se conserva la misma audiencia (staff) y se acota a las filas cuyo
-- estudiante o curso pertenece al colegio del usuario. Verificado antes de
-- aplicar: 0 filas de estas tablas quedan sin tenant por estudiante/curso
-- (absences 350/0, tests 300/0, instant_messages 21/0).

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'absences'
      and column_name = 'student_id'
  ) then
    raise exception 'Precondition failed: absences.student_id must exist';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tests'
      and column_name = 'course_id'
  ) then
    raise exception 'Precondition failed: tests.course_id must exist';
  end if;
end
$$;

-- absences → students.tenant_id
drop policy if exists p_absences_staff_select on public.absences;
create policy p_absences_staff_select on public.absences
  for select to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.students s
       where s.id = absences.student_id
         and s.tenant_id = public.current_tenant_id()
    )
  );

drop policy if exists p_absences_staff_insert on public.absences;
create policy p_absences_staff_insert on public.absences
  for insert to authenticated
  with check (
    public.is_staff()
    and exists (
      select 1 from public.students s
       where s.id = absences.student_id
         and s.tenant_id = public.current_tenant_id()
    )
  );

drop policy if exists p_absences_staff_update on public.absences;
create policy p_absences_staff_update on public.absences
  for update to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.students s
       where s.id = absences.student_id
         and s.tenant_id = public.current_tenant_id()
    )
  )
  with check (
    public.is_staff()
    and exists (
      select 1 from public.students s
       where s.id = absences.student_id
         and s.tenant_id = public.current_tenant_id()
    )
  );

-- tests → courses.tenant_id
drop policy if exists p_tests_staff_select on public.tests;
create policy p_tests_staff_select on public.tests
  for select to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.courses c
       where c.id = tests.course_id
         and c.tenant_id = public.current_tenant_id()
    )
  );

drop policy if exists p_tests_staff_insert on public.tests;
create policy p_tests_staff_insert on public.tests
  for insert to authenticated
  with check (
    public.is_staff()
    and exists (
      select 1 from public.courses c
       where c.id = tests.course_id
         and c.tenant_id = public.current_tenant_id()
    )
  );

drop policy if exists p_tests_staff_update on public.tests;
create policy p_tests_staff_update on public.tests
  for update to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.courses c
       where c.id = tests.course_id
         and c.tenant_id = public.current_tenant_id()
    )
  )
  with check (
    public.is_staff()
    and exists (
      select 1 from public.courses c
       where c.id = tests.course_id
         and c.tenant_id = public.current_tenant_id()
    )
  );

-- instant_messages → courses.tenant_id o students.tenant_id
drop policy if exists p_instant_messages_staff_select on public.instant_messages;
create policy p_instant_messages_staff_select on public.instant_messages
  for select to authenticated
  using (
    public.is_staff()
    and (
      exists (
        select 1 from public.courses c
         where c.id = instant_messages.course_id
           and c.tenant_id = public.current_tenant_id()
      )
      or exists (
        select 1 from public.students s
         where s.id = instant_messages.student_id
           and s.tenant_id = public.current_tenant_id()
      )
    )
  );

drop policy if exists p_instant_messages_staff_insert on public.instant_messages;
create policy p_instant_messages_staff_insert on public.instant_messages
  for insert to authenticated
  with check (
    public.is_staff()
    and (created_by is null or created_by = (select auth.uid()))
    and (
      exists (
        select 1 from public.courses c
         where c.id = instant_messages.course_id
           and c.tenant_id = public.current_tenant_id()
      )
      or exists (
        select 1 from public.students s
         where s.id = instant_messages.student_id
           and s.tenant_id = public.current_tenant_id()
      )
    )
  );

drop policy if exists p_instant_messages_staff_update on public.instant_messages;
create policy p_instant_messages_staff_update on public.instant_messages
  for update to authenticated
  using (
    public.is_staff()
    and (
      exists (
        select 1 from public.courses c
         where c.id = instant_messages.course_id
           and c.tenant_id = public.current_tenant_id()
      )
      or exists (
        select 1 from public.students s
         where s.id = instant_messages.student_id
           and s.tenant_id = public.current_tenant_id()
      )
    )
  )
  with check (
    public.is_staff()
    and (
      exists (
        select 1 from public.courses c
         where c.id = instant_messages.course_id
           and c.tenant_id = public.current_tenant_id()
      )
      or exists (
        select 1 from public.students s
         where s.id = instant_messages.student_id
           and s.tenant_id = public.current_tenant_id()
      )
    )
  );
