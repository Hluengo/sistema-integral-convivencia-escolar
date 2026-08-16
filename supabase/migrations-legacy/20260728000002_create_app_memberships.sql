-- @license SPDX-License-Identifier: Apache-2.0
-- Fase 2 Migration 2: Create app_memberships table
-- Joins users to applications within a tenant, each with a distinct role.

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  application_code TEXT NOT NULL REFERENCES public.applications(code),
  role TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_memberships_role_not_empty CHECK (role <> ''),
  UNIQUE (tenant_id, user_id, application_code)
);

COMMENT ON TABLE public.app_memberships IS 'Membresías de usuarios por aplicación y tenant';
COMMENT ON COLUMN public.app_memberships.role IS 'Rol del usuario dentro de la aplicación';
COMMENT ON COLUMN public.app_memberships.is_active IS 'Permite desactivar temporalmente una membresía';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_app_memberships_tenant ON public.app_memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_memberships_user ON public.app_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_app_memberships_application ON public.app_memberships(application_code);
CREATE INDEX IF NOT EXISTS idx_app_memberships_tenant_user_active ON public.app_memberships(tenant_id, user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_app_memberships_user_app_active ON public.app_memberships(user_id, application_code, is_active);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_app_memberships_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_memberships_updated_at ON public.app_memberships;
CREATE TRIGGER trg_app_memberships_updated_at
  BEFORE UPDATE ON public.app_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_app_memberships_updated_at();

ALTER TABLE public.app_memberships ENABLE ROW LEVEL SECURITY;

-- Grants: anon no access, authenticated minimal, service_role full
GRANT SELECT ON public.app_memberships TO authenticated;
GRANT ALL ON public.app_memberships TO service_role;
GRANT ALL ON public.app_memberships TO postgres;

-- RLS: users can only read their own memberships
CREATE POLICY "app_memberships_select_own" ON public.app_memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role bypasses RLS by default
-- Admin writes are handled via service_role only (not direct client writes)

COMMIT;
