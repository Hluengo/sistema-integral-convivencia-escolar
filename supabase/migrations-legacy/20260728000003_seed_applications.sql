-- @license SPDX-License-Identifier: Apache-2.0
-- Fase 2 Migration 3: Seed registered applications

BEGIN;

INSERT INTO public.applications (code, name) VALUES
  ('convivencia', 'Sistema Integral de Convivencia Escolar'),
  ('inasistencias', 'Registro de Inasistencias')
ON CONFLICT (code) DO NOTHING;

COMMIT;
