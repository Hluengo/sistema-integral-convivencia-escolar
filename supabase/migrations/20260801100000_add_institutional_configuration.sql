/** @license SPDX-License-Identifier: Apache-2.0 */

CREATE TABLE IF NOT EXISTS public.institution_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  official_name text NOT NULL,
  institution_rut text,
  address text,
  commune text,
  region text,
  phone text,
  institutional_email text,
  proprietor text,
  director_name text,
  education_levels text[] NOT NULL DEFAULT '{}',
  logo_path text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.institution_rule_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  version text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  effective_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  published_by uuid REFERENCES auth.users(id),
  UNIQUE (tenant_id, version)
);

CREATE INDEX IF NOT EXISTS institution_rule_versions_tenant_status_idx
  ON public.institution_rule_versions (tenant_id, status, updated_at DESC);

DROP TRIGGER IF EXISTS institution_settings_updated_at ON public.institution_settings;
CREATE TRIGGER institution_settings_updated_at
  BEFORE UPDATE ON public.institution_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS institution_rule_versions_updated_at ON public.institution_rule_versions;
CREATE TRIGGER institution_rule_versions_updated_at
  BEFORE UPDATE ON public.institution_rule_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.institution_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_rule_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS institution_settings_select ON public.institution_settings;
CREATE POLICY institution_settings_select ON public.institution_settings
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.current_app_role() = 'superadmin');

DROP POLICY IF EXISTS institution_settings_write ON public.institution_settings;
CREATE POLICY institution_settings_write ON public.institution_settings
  FOR ALL TO authenticated
  USING (
    public.current_app_role() = 'superadmin'
    OR (tenant_id = public.current_tenant_id() AND public.current_app_role() IN ('admin', 'direccion'))
  )
  WITH CHECK (
    public.current_app_role() = 'superadmin'
    OR (tenant_id = public.current_tenant_id() AND public.current_app_role() IN ('admin', 'direccion'))
  );

DROP POLICY IF EXISTS institution_rules_select ON public.institution_rule_versions;
CREATE POLICY institution_rules_select ON public.institution_rule_versions
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.current_app_role() = 'superadmin');

DROP POLICY IF EXISTS institution_rules_write ON public.institution_rule_versions;
CREATE POLICY institution_rules_write ON public.institution_rule_versions
  FOR ALL TO authenticated
  USING (
    public.current_app_role() = 'superadmin'
    OR (tenant_id = public.current_tenant_id() AND public.current_app_role() IN ('admin', 'direccion'))
  )
  WITH CHECK (
    public.current_app_role() = 'superadmin'
    OR (tenant_id = public.current_tenant_id() AND public.current_app_role() IN ('admin', 'direccion'))
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('institution-assets', 'institution-assets', false, 2097152, ARRAY['image/png', 'image/jpeg', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 2097152,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS institution_assets_select ON storage.objects;
CREATE POLICY institution_assets_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'institution-assets'
    AND (
      (storage.foldername(name))[1] = public.current_tenant_id()::text
      OR public.current_app_role() = 'superadmin'
    )
  );

DROP POLICY IF EXISTS institution_assets_write ON storage.objects;
CREATE POLICY institution_assets_write ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'institution-assets'
    AND (
      public.current_app_role() = 'superadmin'
      OR (
        (storage.foldername(name))[1] = public.current_tenant_id()::text
        AND public.current_app_role() IN ('admin', 'direccion')
      )
    )
  )
  WITH CHECK (
    bucket_id = 'institution-assets'
    AND (
      public.current_app_role() = 'superadmin'
      OR (
        (storage.foldername(name))[1] = public.current_tenant_id()::text
        AND public.current_app_role() IN ('admin', 'direccion')
      )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.institution_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.institution_rule_versions TO authenticated;
GRANT ALL ON public.institution_settings, public.institution_rule_versions TO service_role;
