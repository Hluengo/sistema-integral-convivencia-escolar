ALTER POLICY profiles_select_consolidated ON public.profiles
USING (
  user_id = (SELECT auth.uid())
  OR is_superuser()
  OR current_app_role() = 'superadmin'
  OR (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])
  )
);

ALTER POLICY profiles_insert_consolidated ON public.profiles
WITH CHECK (
  is_superuser()
  OR user_id = (SELECT auth.uid())
  OR (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])
  )
);

ALTER POLICY profiles_update_consolidated ON public.profiles
USING (
  is_superuser()
  OR user_id = (SELECT auth.uid())
  OR (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])
  )
)
WITH CHECK (
  is_superuser()
  OR user_id = (SELECT auth.uid())
  OR (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])
  )
);
