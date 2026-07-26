-- @license SPDX-License-Identifier: Apache-2.0
-- Fase 2 Migration 1: Create applications catalog table
-- Central registry of applications in the shared Supabase ecosystem.

BEGIN;

CREATE TABLE IF NOT EXISTS public.applications (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT applications_code_not_empty CHECK (code <> ''),
  CONSTRAINT applications_name_not_empty CHECK (name <> '')
);

COMMENT ON TABLE public.applications IS 'Catálogo de aplicaciones registradas en el ecosistema Supabase compartido';
COMMENT ON COLUMN public.applications.code IS 'Identificador corto de la aplicación (ej. convivencia, inasistencias)';
COMMENT ON COLUMN public.applications.name IS 'Nombre legible de la aplicación';
COMMENT ON COLUMN public.applications.is_active IS 'Permite deshabilitar una aplicación sin borrar membresías';

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Grant minimal: anon gets nothing, authenticated gets SELECT only
GRANT SELECT ON public.applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO service_role;
GRANT ALL ON public.applications TO postgres;

-- RLS policies: authenticated can only SELECT active applications (no writes)
CREATE POLICY "applications_select_authenticated" ON public.applications
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Writes are handled by service_role (bypasses RLS) or postgres only.
-- No authenticated INSERT/UPDATE/DELETE policy exists per Phase 2 security model.

COMMIT;
