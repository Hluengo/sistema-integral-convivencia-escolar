-- @license SPDX-License-Identifier: Apache-2.0
-- Fase 2 Migration 7: RLS hardening for membership tables and tenants
-- Forward-only: no data changes, only security policies.

BEGIN;

-- ============================================================
-- 1. TENANTS RLS — READ-ONLY FOR AUTHENTICATED
-- ============================================================
-- Per Phase 2 security model: authenticated users can only SELECT
-- their own tenant. All writes (INSERT, UPDATE, DELETE) are handled
-- by service_role (bypasses RLS) or postgres.
-- Legacy profiles.role is NOT used to authorize writes on security tables.

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_select_own" ON public.tenants;
DROP POLICY IF EXISTS "tenants_insert_admin" ON public.tenants;
DROP POLICY IF EXISTS "tenants_insert_service" ON public.tenants;
DROP POLICY IF EXISTS "tenants_update_own" ON public.tenants;
DROP POLICY IF EXISTS "tenants_update_admin" ON public.tenants;
DROP POLICY IF EXISTS "tenants_delete_own" ON public.tenants;
DROP POLICY IF EXISTS "tenants_delete_admin" ON public.tenants;

CREATE POLICY "tenants_select_own" ON public.tenants
  FOR SELECT
  TO authenticated
  USING (id = public.current_tenant_id());

-- No INSERT, UPDATE, or DELETE policies for authenticated users.

-- ============================================================
-- 2. APPLICATIONS RLS
-- ============================================================

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applications_select_authenticated" ON public.applications;
DROP POLICY IF EXISTS "applications_admin_all" ON public.applications;

CREATE POLICY "applications_select_authenticated" ON public.applications
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Authenticated writes are intentionally absent per Phase 2 security model.
-- service_role grants (SELECT, INSERT, UPDATE, DELETE) are defined in migration 00001 and are not modified here.

-- ============================================================
-- 3. APP_MEMBERSHIPS RLS
-- ============================================================

ALTER TABLE public.app_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_memberships_select_own" ON public.app_memberships;
CREATE POLICY "app_memberships_select_own" ON public.app_memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

COMMIT;

SELECT pg_notify('pgrst', 'reload schema');
