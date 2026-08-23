DROP POLICY IF EXISTS p_inspectorate_staff_select ON public.inspectorate_records;
DROP POLICY IF EXISTS p_inspectorate_staff_insert ON public.inspectorate_records;
DROP POLICY IF EXISTS p_inspectorate_staff_update ON public.inspectorate_records;

DROP POLICY IF EXISTS inspectorate_tenant_delete ON public.inspectorate_records;
DROP POLICY IF EXISTS p_inspectorate_superuser_delete ON public.inspectorate_records;

CREATE POLICY inspectorate_tenant_delete
ON public.inspectorate_records
FOR DELETE
TO authenticated
USING (
  public.is_superuser()
  OR tenant_id = public.current_tenant_id()
);
