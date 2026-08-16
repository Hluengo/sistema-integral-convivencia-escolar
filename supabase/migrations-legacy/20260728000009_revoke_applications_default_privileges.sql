-- @license SPDX-License-Identifier: Apache-2.0
-- Fase 2 corrective migration:
-- Remove Supabase inherited/default privileges from applications
-- and restore the approved least-privilege ACL.

BEGIN;

REVOKE ALL PRIVILEGES
ON TABLE public.applications
FROM PUBLIC;

REVOKE ALL PRIVILEGES
ON TABLE public.applications
FROM anon;

REVOKE ALL PRIVILEGES
ON TABLE public.applications
FROM authenticated;

REVOKE ALL PRIVILEGES
ON TABLE public.applications
FROM service_role;

GRANT SELECT
ON TABLE public.applications
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.applications
TO service_role;

GRANT ALL PRIVILEGES
ON TABLE public.applications
TO postgres;

COMMIT;
