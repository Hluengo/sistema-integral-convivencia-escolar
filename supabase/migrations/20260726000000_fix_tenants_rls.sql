-- @license SPDX-License-Identifier: Apache-2.0

-- Rehabilita RLS en public.tenants y normaliza policies tenant-aware.
-- No altera datos existentes ni modifica migraciones anteriores.

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_select_own" ON public.tenants;
CREATE POLICY "tenants_select_own"
ON public.tenants
FOR SELECT
TO authenticated
USING (id = public.current_tenant_id());

DROP POLICY IF EXISTS "tenants_insert_admin" ON public.tenants;
CREATE POLICY "tenants_insert_admin"
ON public.tenants
FOR INSERT
TO authenticated
WITH CHECK (public.current_app_role() = 'admin');

DROP POLICY IF EXISTS "tenants_update_own" ON public.tenants;
DROP POLICY IF EXISTS "tenants_update_admin" ON public.tenants;
CREATE POLICY "tenants_update_admin"
ON public.tenants
FOR UPDATE
TO authenticated
USING (
  id = public.current_tenant_id()
  AND public.current_app_role() IN ('admin', 'direccion')
)
WITH CHECK (id = public.current_tenant_id());

DROP POLICY IF EXISTS "tenants_delete_own" ON public.tenants;
DROP POLICY IF EXISTS "tenants_delete_admin" ON public.tenants;
CREATE POLICY "tenants_delete_admin"
ON public.tenants
FOR DELETE
TO authenticated
USING (
  id = public.current_tenant_id()
  AND public.current_app_role() = 'admin'
);

SELECT pg_notify('pgrst', 'reload schema');
