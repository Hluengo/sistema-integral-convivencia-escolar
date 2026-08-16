-- @license SPDX-License-Identifier: Apache-2.0
-- Fase 2 Migration 6: Backfill Convivencia memberships
-- Only non-ambiguous roles: direccion, convivencia → convivencia.
-- All other roles excluded (require manual review).

BEGIN;

DO $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO public.app_memberships (tenant_id, user_id, application_code, role)
  SELECT p.tenant_id, p.user_id, 'convivencia'::TEXT, p.role
  FROM public.profiles p
  WHERE p.tenant_id IS NOT NULL
    AND p.role IN ('direccion', 'convivencia')
    AND NOT EXISTS (
      SELECT 1 FROM public.app_memberships m
      WHERE m.tenant_id = p.tenant_id
        AND m.user_id = p.user_id
        AND m.application_code = 'convivencia'
    )
  ON CONFLICT (tenant_id, user_id, application_code) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Migration 00006: Inserted % memberships for Convivencia (direccion, convivencia only)', v_count;
END;
$$;

COMMIT;
