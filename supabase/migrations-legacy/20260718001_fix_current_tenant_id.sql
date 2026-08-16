-- ============================================================
-- Migration 20260718001: Fix current_tenant_id() for dev/demo
-- Permite fallback al tenant por defecto cuando no hay auth
-- ============================================================

-- Modificar current_tenant_id() para retornar tenant default
-- cuando no hay usuario autenticado (modo desarrollo/local)
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()),
    '00000000-0000-0000-0000-000000000001'::UUID  -- tenant default
  );
$$;

-- Nota: En producción con Supabase Auth, auth.uid() siempre tiene valor
-- para usuarios autenticados. Este fallback solo aplica en desarrollo
-- donde no hay autenticación real (ej. VITE_ALLOW_LOCAL_DEMO).