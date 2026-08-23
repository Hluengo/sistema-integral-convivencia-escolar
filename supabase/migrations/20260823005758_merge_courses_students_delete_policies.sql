-- Merge duplicate DELETE policies while preserving effective permissions.
DROP POLICY IF EXISTS courses_tenant_delete ON public.courses;
DROP POLICY IF EXISTS p_courses_superuser_delete ON public.courses;
CREATE POLICY courses_delete_authorized
ON public.courses
FOR DELETE
TO authenticated
USING (
  is_superuser()
  OR (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])
  )
);

DROP POLICY IF EXISTS students_tenant_delete ON public.students;
DROP POLICY IF EXISTS p_students_superuser_delete ON public.students;
CREATE POLICY students_delete_authorized
ON public.students
FOR DELETE
TO authenticated
USING (
  is_superuser()
  OR (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])
  )
);
