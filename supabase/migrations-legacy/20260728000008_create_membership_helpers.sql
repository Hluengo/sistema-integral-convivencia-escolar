-- @license SPDX-License-Identifier: Apache-2.0
-- Fase 2 Migration 8: Membership helper functions
-- Provides current_user_memberships() and has_app_access()
-- for applications to query membership state.

BEGIN;

-- ============================================================
-- 1. current_user_memberships()
-- Returns all active memberships for the current user + tenant.
-- Security DEFINER needed because user reads app_memberships
-- RLS-scoped rows but we also need to check application is_active.
-- The function is STABLE (no writes) and search_path is locked.
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_memberships()
RETURNS TABLE(
  application_code TEXT,
  role TEXT,
  is_active BOOLEAN,
  app_is_active BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    m.application_code,
    m.role,
    m.is_active,
    a.is_active AS app_is_active
  FROM public.app_memberships m
  JOIN public.applications a ON a.code = m.application_code
  WHERE m.user_id = auth.uid()
    AND m.tenant_id = public.current_tenant_id()
    AND m.is_active = true
    AND a.is_active = true;
$$;

COMMENT ON FUNCTION public.current_user_memberships IS 'Retorna las membresías activas del usuario autenticado en el tenant actual';

-- ============================================================
-- 2. has_app_access()
-- Returns true if the user has an active membership for the
-- given application, optionally filtered by allowed roles.
-- Returns false when no session, no tenant, or no membership.
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_app_access(
  p_application_code TEXT,
  p_roles TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_memberships m
    JOIN public.applications a ON a.code = m.application_code
    WHERE m.user_id = auth.uid()
      AND m.tenant_id = public.current_tenant_id()
      AND m.application_code = p_application_code
      AND m.is_active = true
      AND a.is_active = true
      AND (p_roles IS NULL OR m.role = ANY (p_roles))
  );
$$;

COMMENT ON FUNCTION public.has_app_access IS 'Verifica si el usuario tiene acceso activo a una aplicación, opcionalmente filtrando por roles';

-- Grants: only authenticated can EXECUTE
REVOKE ALL ON FUNCTION public.current_user_memberships FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_app_access FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_memberships TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_app_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_memberships TO service_role;
GRANT EXECUTE ON FUNCTION public.has_app_access TO service_role;
GRANT ALL ON FUNCTION public.current_user_memberships TO postgres;
GRANT ALL ON FUNCTION public.has_app_access TO postgres;

COMMIT;

SELECT pg_notify('pgrst', 'reload schema');
