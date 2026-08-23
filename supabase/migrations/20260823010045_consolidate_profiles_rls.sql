DROP POLICY IF EXISTS p_profiles_self_select ON public.profiles;
DROP POLICY IF EXISTS p_profiles_superuser_select ON public.profiles;
DROP POLICY IF EXISTS p_profiles_superuser_insert ON public.profiles;
DROP POLICY IF EXISTS p_profiles_superuser_update ON public.profiles;
DROP POLICY IF EXISTS p_profiles_superuser_delete ON public.profiles;
DROP POLICY IF EXISTS profiles_tenant_select ON public.profiles;
DROP POLICY IF EXISTS profiles_tenant_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_tenant_update ON public.profiles;
DROP POLICY IF EXISTS profiles_tenant_delete ON public.profiles;

CREATE POLICY profiles_select_consolidated
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR is_superuser()
  OR current_app_role() = 'superadmin'
  OR (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])
  )
);

CREATE POLICY profiles_insert_consolidated
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  is_superuser()
  OR user_id = auth.uid()
  OR (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])
  )
);

CREATE POLICY profiles_update_consolidated
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  is_superuser()
  OR user_id = auth.uid()
  OR (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])
  )
)
WITH CHECK (
  is_superuser()
  OR user_id = auth.uid()
  OR (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])
  )
);

CREATE POLICY profiles_delete_consolidated
ON public.profiles
FOR DELETE
TO authenticated
USING (
  is_superuser()
  OR (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])
  )
);
