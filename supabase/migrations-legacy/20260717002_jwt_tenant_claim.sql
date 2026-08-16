-- ============================================================
-- Migration 20260717002: JWT Tenant Claim
-- Agrega tenant_id como claim JWT para RLS más rápido
-- (sin subquery a profiles en cada acceso).
--
-- Pasos:
--   1. Función para actualizar app_metadata del usuario
--   2. Trigger en profiles AFTER INSERT/UPDATE
--   3. Actualizar current_tenant_id() con fast-path JWT
--   4. Backfill: actualizar claim de usuarios existentes
-- ============================================================

-- ============================================================
-- 1. Función sync_tenant_to_jwt()
--     Actualiza raw_app_meta_data del usuario en auth.users
--     para incluir tenant_id como claim JWT.
--     Se ejecuta con SECURITY DEFINER (superuser).
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_tenant_to_jwt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('tenant_id', NEW.tenant_id::text)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Trigger en profiles AFTER INSERT OR UPDATE
--     Sincroniza tenant_id al JWT automáticamente.
-- ============================================================

DROP TRIGGER IF EXISTS trg_profiles_sync_tenant_to_jwt ON profiles;
CREATE TRIGGER trg_profiles_sync_tenant_to_jwt
  AFTER INSERT OR UPDATE OF tenant_id ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_tenant_to_jwt();

-- ============================================================
-- 3. Actualizar current_tenant_id() con fast-path JWT
--     Primero intenta leer del JWT (sin DB query).
--     Si no está en JWT, cae a query en profiles.
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'app_metadata'::text)::jsonb ->> 'tenant_id',
    (SELECT tenant_id::text FROM public.profiles WHERE user_id = auth.uid())
  )::UUID
$$;

-- ============================================================
-- 4. Backfill: actualizar claim JWT de usuarios existentes
-- ============================================================

UPDATE auth.users u
SET raw_app_meta_data =
  COALESCE(raw_app_meta_data, '{}'::jsonb) ||
  jsonb_build_object('tenant_id', p.tenant_id::text)
FROM public.profiles p
WHERE u.id = p.user_id
  AND (
    raw_app_meta_data IS NULL
    OR raw_app_meta_data->>'tenant_id' IS NULL
    OR raw_app_meta_data->>'tenant_id' != p.tenant_id::text
  );

-- ============================================================
-- Refresh PostgREST schema cache
-- ============================================================
SELECT pg_notify('pgrst', 'reload schema');
