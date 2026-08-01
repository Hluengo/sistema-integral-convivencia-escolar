-- @license SPDX-License-Identifier: Apache-2.0
-- ============================================================
-- Migración: Rol de plataforma `superadmin`
-- ------------------------------------------------------------
-- Habilita el rol `superadmin` para la gestión multi-tenant desde
-- el panel de plataforma. El superadministrador pertenece al tenant
-- por defecto y opera cross-tenant mediante la service role key
-- (bypass de RLS) en las rutas /api/platform/*.
--
-- Esta migración:
--   1. Amplía el constraint profiles_role_check para admitir 'superadmin'.
--   2. Backfill idempotente del superadministrador inicial.
--   3. Extiende policies RLS para que el superadmin pueda leer todos
--      los tenants y perfiles (lectura transversal para listados).
-- No modifica migraciones anteriores ni altera datos beyond backfill.
-- ============================================================

BEGIN;

-- 1. Constraint de rol: admitir 'superadmin'
DO $$
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN (
      'superadmin',
      'admin', 'direccion', 'convivencia', 'inspectoria', 'profesor_jefe',
      'teacher', 'inspector', 'user', 'staff'
    ));
EXCEPTION WHEN others THEN NULL;
END $$;

-- 2. Backfill idempotente del superadministrador inicial.
--    El correo no se hardcodea en middleware: la identificación es
--    exclusivamente por rol. Este backfill solo inicializa la primera
--    cuenta operativa; el alta de futuros superadmin se hace vía BD.
UPDATE public.profiles
SET role = 'superadmin', updated_at = NOW()
WHERE email = 'superusuario@colegio.cl'
  AND role <> 'superadmin';

-- 3. RLS: lectura transversal para superadmin

-- tenants: el superadmin puede ver TODOS los tenants; el resto solo el suyo.
DROP POLICY IF EXISTS "tenants_select_own" ON public.tenants;
CREATE POLICY "tenants_select_own" ON public.tenants
  FOR SELECT TO authenticated
  USING (
    id = public.current_tenant_id()
    OR public.current_app_role() = 'superadmin'
  );

-- tenants: el superadmin puede crear tenants (la ruta usa service role,
-- pero se habilita la policy por completitud y futuras vías anon).
DROP POLICY IF EXISTS "tenants_insert_admin" ON public.tenants;
CREATE POLICY "tenants_insert_admin" ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_app_role() IN ('admin', 'superadmin')
  );

-- profiles: el superadmin puede leer todos los perfiles (listados de
-- usuarios por colegio); el resto mantiene el alcance por tenant.
DROP POLICY IF EXISTS "profiles_tenant_select" ON public.profiles;
CREATE POLICY "profiles_tenant_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (tenant_id = public.current_tenant_id()
        AND public.current_app_role() IN ('admin', 'direccion'))
    OR public.current_app_role() = 'superadmin'
  );

COMMIT;

SELECT pg_notify('pgrst', 'reload schema');