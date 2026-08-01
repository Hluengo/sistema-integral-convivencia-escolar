-- @license SPDX-License-Identifier: Apache-2.0
-- Fase 2 Migration 4: Diagnostic view for membership readiness
-- ONLY accessible by service_role and postgres.
-- NO access for anon or authenticated.
-- NO personal data (emails, names) exposed.

BEGIN;

CREATE OR REPLACE VIEW public.membership_readiness AS
SELECT
  p.user_id,
  p.tenant_id,
  p.role AS current_role,
  CASE
    WHEN p.tenant_id IS NULL THEN 'no-tenant'
    WHEN p.role IS NULL THEN 'no-role'
    WHEN p.role IN ('direccion', 'convivencia') THEN 'convivencia-only'
    WHEN p.role = 'teacher' THEN 'inasistencias-only'
    WHEN p.role IN ('admin', 'profesor_jefe', 'inspectoria', 'inspector', 'staff', 'user', 'superuser') THEN 'ambiguous'
    ELSE 'unknown'
  END AS membership_category
FROM public.profiles p
WHERE p.tenant_id IS NOT NULL;

COMMENT ON VIEW public.membership_readiness IS 'Diagnóstico de backfill Phase 2: clasifica perfiles por categoría de membresía. Solo accessible por service_role.';

-- Revoke all from public and authenticated
REVOKE ALL ON public.membership_readiness FROM PUBLIC;
REVOKE ALL ON public.membership_readiness FROM anon;
REVOKE ALL ON public.membership_readiness FROM authenticated;

-- Grant only to service_role and postgres
GRANT SELECT ON public.membership_readiness TO service_role;
GRANT SELECT ON public.membership_readiness TO postgres;

COMMIT;
