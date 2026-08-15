-- Close cross-tenant reads from SECURITY DEFINER teacher RPCs.
-- RLS does not apply inside these functions, so every query must scope rows
-- explicitly to the authenticated tenant.

CREATE OR REPLACE FUNCTION public.teacher_get_instant_messages(
  p_level text DEFAULT NULL,
  p_course_id uuid DEFAULT NULL,
  p_student_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  title text,
  body text,
  level text,
  course_id uuid,
  student_id uuid,
  student_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select
    m.id,
    m.title,
    m.body,
    m.level,
    m.course_id,
    m.student_id,
    s.full_name as student_name,
    m.starts_at,
    m.ends_at,
    m.created_at
  from public.instant_messages m
  left join public.students s
    on s.id = m.student_id
   and s.tenant_id = public.current_tenant_id()
  where m.is_active = true
    and (
      (m.student_id is not null and exists (
        select 1 from public.students ms
        where ms.id = m.student_id
          and ms.tenant_id = public.current_tenant_id()
      ))
      or (m.course_id is not null and exists (
        select 1 from public.courses mc
        where mc.id = m.course_id
          and mc.tenant_id = public.current_tenant_id()
      ))
    )
    and m.starts_at <= now()
    and (m.ends_at is null or m.ends_at >= now())
    and (p_level is null or m.level is null or m.level = p_level)
    and (p_course_id is null or m.course_id is null or m.course_id = p_course_id)
    and (p_student_id is null or m.student_id is null or m.student_id = p_student_id)
  order by m.starts_at desc, m.created_at desc;
$$;

CREATE OR REPLACE FUNCTION public.teacher_get_public_absences(
  p_month integer,
  p_year integer,
  p_level text DEFAULT NULL,
  p_course_id uuid DEFAULT NULL
)
RETURNS TABLE(
  absence_id uuid,
  student_name text,
  course_id uuid,
  course_name text,
  course_level text,
  start_date date,
  end_date date,
  status text,
  observation text,
  affected_tests_count integer
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
declare
  v_month_start date;
  v_month_end date;
begin
  if p_month is null or p_month < 1 or p_month > 12 then
    raise exception 'p_month must be between 1 and 12';
  end if;
  if p_year is null or p_year < 2000 or p_year > 2100 then
    raise exception 'p_year must be between 2000 and 2100';
  end if;

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end := (v_month_start + interval '1 month - 1 day')::date;

  return query
  select
    a.id,
    s.full_name,
    c.id,
    c.name,
    c.level,
    a.start_date,
    a.end_date,
    a.status,
    a.observation,
    coalesce(ta.affected_tests_count, 0)::int
  from public.absences a
  join public.students s
    on s.id = a.student_id
   and s.tenant_id = public.current_tenant_id()
  join public.courses c
    on c.id = s.course_id
   and c.tenant_id = public.current_tenant_id()
  left join lateral (
    select count(*)::int as affected_tests_count
    from public.tests t
    where t.course_id = c.id
      and t.date between a.start_date and a.end_date
      and t.date between v_month_start and v_month_end
  ) ta on true
  where a.start_date <= v_month_end
    and a.end_date >= v_month_start
    and (p_level is null or c.level = p_level)
    and (p_course_id is null or c.id = p_course_id)
  order by a.start_date desc, s.full_name asc;
end;
$$;

CREATE OR REPLACE FUNCTION public.teacher_get_public_absence_detail(
  p_absence_id uuid
)
RETURNS TABLE(id uuid, date date, subject text, type text)
LANGUAGE sql SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select t.id, t.date, t.subject, t.type
  from public.absences a
  join public.students s
    on s.id = a.student_id
   and s.tenant_id = public.current_tenant_id()
  join public.tests t on t.course_id = s.course_id
  where a.id = p_absence_id
    and t.date between a.start_date and a.end_date
  order by t.date;
$$;

CREATE OR REPLACE FUNCTION public.teacher_get_public_absences_masked(
  p_month integer,
  p_year integer,
  p_level text DEFAULT NULL,
  p_course_id uuid DEFAULT NULL
)
RETURNS TABLE(
  absence_id text,
  student_name text,
  course_id uuid,
  course_name text,
  course_level text,
  start_date date,
  end_date date,
  status text,
  observation text,
  affected_tests_count integer
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
declare
  v_month_start date;
  v_month_end date;
begin
  if p_month is null or p_month < 1 or p_month > 12 then
    raise exception 'p_month must be between 1 and 12';
  end if;
  if p_year is null or p_year < 2000 or p_year > 2100 then
    raise exception 'p_year must be between 2000 and 2100';
  end if;

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end := (v_month_start + interval '1 month - 1 day')::date;

  return query
  select
    md5(a.id::text),
    (
      select string_agg(upper(left(name_part, 1)) || '.', ' ' order by part_order)
      from regexp_split_to_table(trim(s.full_name), E'\\s+') with ordinality as parts(name_part, part_order)
      where name_part <> ''
    ),
    c.id,
    c.name,
    c.level,
    a.start_date,
    a.end_date,
    a.status,
    null::text,
    coalesce(ta.affected_tests_count, 0)::int
  from public.absences a
  join public.students s
    on s.id = a.student_id
   and s.tenant_id = public.current_tenant_id()
  join public.courses c
    on c.id = s.course_id
   and c.tenant_id = public.current_tenant_id()
  left join lateral (
    select count(*)::int as affected_tests_count
    from public.tests t
    where t.course_id = c.id
      and t.date between a.start_date and a.end_date
      and t.date between v_month_start and v_month_end
  ) ta on true
  where a.start_date <= v_month_end
    and a.end_date >= v_month_start
    and (p_level is null or c.level = p_level)
    and (p_course_id is null or c.id = p_course_id)
  order by a.start_date desc, s.full_name asc;
end;
$$;

CREATE OR REPLACE FUNCTION public.teacher_get_public_courses(
  p_level text DEFAULT NULL
)
RETURNS TABLE(id uuid, name text, level text, "position" integer)
LANGUAGE sql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  select c.id, c.name, c.level, c.position
  from public.courses c
  where c.tenant_id = public.current_tenant_id()
    and (p_level is null or c.level = p_level)
  order by c.position, c.name;
$$;

CREATE OR REPLACE FUNCTION public.teacher_get_public_instant_messages(
  p_level text DEFAULT NULL,
  p_course_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  title text,
  body text,
  level text,
  course_id uuid,
  student_id uuid,
  student_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select
    m.id,
    m.title,
    m.body,
    m.level,
    m.course_id,
    null::uuid,
    null::text,
    m.starts_at,
    m.ends_at,
    m.created_at
  from public.instant_messages m
  where m.is_active = true
    and (
      (m.course_id is not null and exists (
        select 1 from public.courses mc
        where mc.id = m.course_id
          and mc.tenant_id = public.current_tenant_id()
      ))
      or (m.student_id is not null and exists (
        select 1 from public.students ms
        where ms.id = m.student_id
          and ms.tenant_id = public.current_tenant_id()
      ))
    )
    and m.starts_at <= now()
    and (m.ends_at is null or m.ends_at >= now())
    and m.student_id is null
    and (p_level is null or m.level is null or m.level = p_level)
    and (p_course_id is null or m.course_id is null or m.course_id = p_course_id)
  order by m.starts_at desc, m.created_at desc;
$$;

-- Keep the three intended teacher RPCs available only to signed-in callers.
REVOKE ALL ON FUNCTION public.teacher_get_instant_messages(text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_get_instant_messages(text, uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.teacher_get_public_absences(integer, integer, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_get_public_absences(integer, integer, text, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.teacher_get_public_absence_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_get_public_absence_detail(uuid) TO authenticated, service_role;

-- Do not expose the masked/public variants until a caller contract exists.
REVOKE ALL ON FUNCTION public.teacher_get_public_absences_masked(integer, integer, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.teacher_get_public_courses(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.teacher_get_public_instant_messages(text, uuid) FROM PUBLIC, anon, authenticated;
