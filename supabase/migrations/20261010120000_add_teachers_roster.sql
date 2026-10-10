/** @license SPDX-License-Identifier: Apache-2.0 */

CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, full_name)
);

CREATE INDEX IF NOT EXISTS teachers_tenant_idx
  ON public.teachers (tenant_id);

DROP TRIGGER IF EXISTS teachers_updated_at ON public.teachers;
CREATE TRIGGER teachers_updated_at
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teachers_select ON public.teachers;
CREATE POLICY teachers_select ON public.teachers
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.current_app_role() = 'superadmin');

DROP POLICY IF EXISTS teachers_write ON public.teachers;
CREATE POLICY teachers_write ON public.teachers
  FOR ALL TO authenticated
  USING (
    public.current_app_role() = 'superadmin'
    OR (tenant_id = public.current_tenant_id() AND public.current_app_role() IN ('admin', 'direccion'))
  )
  WITH CHECK (
    public.current_app_role() = 'superadmin'
    OR (tenant_id = public.current_tenant_id() AND public.current_app_role() IN ('admin', 'direccion'))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;
