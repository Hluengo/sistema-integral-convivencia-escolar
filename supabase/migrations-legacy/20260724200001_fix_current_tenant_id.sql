-- ============================================================
-- Migration 20260724200001: Fix current_tenant_id()
-- Restaura JWT fast-path y validación UUID, eliminando la
-- regresión de 20260720003 que eliminó el fast-path JWT.
--
-- La función anterior (20260720003) solo hacía:
--   SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
--
-- Esta versión:
--   1. Intenta leer tenant_id desde JWT app_metadata (fast-path, sin DB query)
--   2. Valida que el valor sea un UUID válido
--   3. Fallback a profiles si no está en JWT
--   4. No incorpora fallback demo inseguro en producción
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claim_tenant TEXT;
  profile_tenant UUID;
BEGIN
  -- Fast-path: leer tenant_id desde JWT app_metadata (sin DB query)
  BEGIN
    claim_tenant := (auth.jwt() ->> 'app_metadata')::jsonb ->> 'tenant_id';
  EXCEPTION WHEN OTHERS THEN
    claim_tenant := NULL;
  END;

  -- Validar que sea un UUID válido
  IF claim_tenant IS NOT NULL
     AND claim_tenant ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN
    RETURN claim_tenant::uuid;
  END IF;

  -- Fallback: buscar en profiles
  SELECT tenant_id INTO profile_tenant
  FROM public.profiles
  WHERE user_id = auth.uid();

  RETURN profile_tenant;
END;
$$;

SELECT pg_notify('pgrst', 'reload schema');
