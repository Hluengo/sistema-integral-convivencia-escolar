-- Remove redundant staff policies on shared course/student tables.
-- The tenant policies already grant the required same-tenant access.
-- Removing these prevents staff roles from bypassing tenant isolation.
DROP POLICY IF EXISTS p_courses_staff_select ON public.courses;
DROP POLICY IF EXISTS p_courses_staff_insert ON public.courses;
DROP POLICY IF EXISTS p_courses_staff_update ON public.courses;

DROP POLICY IF EXISTS p_students_staff_select ON public.students;
DROP POLICY IF EXISTS p_students_staff_insert ON public.students;
DROP POLICY IF EXISTS p_students_staff_update ON public.students;
