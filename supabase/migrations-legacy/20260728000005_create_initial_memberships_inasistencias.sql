-- @license SPDX-License-Identifier: Apache-2.0
-- Fase 2 Migration 5: Backfill Inasistencias memberships
-- Only non-ambiguous roles: teacher → inasistencias.
-- All other roles excluded (require manual review).

BEGIN;

DO $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO public.app_memberships (tenant_id, user_id, application_code, role)
  SELECT p.tenant_id, p.user_id, 'inasistencias'::TEXT, 'teacher'::TEXT
  FROM public.profiles p
  WHERE p.tenant_id IS NOT NULL
    AND p.role = 'teacher'
    AND NOT EXISTS (
      SELECT 1 FROM public.app_memberships m
      WHERE m.tenant_id = p.tenant_id
        AND m.user_id = p.user_id
        AND m.application_code = 'inasistencias'
    )
  ON CONFLICT (tenant_id, user_id, application_code) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Migration 00005: Inserted % memberships for Inasistencias (teacher only)', v_count;
END;
$$;

COMMIT;
