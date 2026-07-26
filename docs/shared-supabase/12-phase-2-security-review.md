# Revisión de Seguridad — Fase 2 (Post-Corrección)

**Fecha:** 2026-07-28
**SHA-256 sellado en el documento.**

---

## 1. Contenido y hash real de cada migración

### 20260728000001_create_applications.sql

```
Ruta:     supabase/migrations/20260728000001_create_applications.sql
Líneas:   37
SHA-256:  7F401886F3DCE8AA6A263F8CAB1CF6FF4894389F6E929F100218D5831DADB1C0
```

```sql
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

-- Grant minimal: anon gets nothing, authenticated gets SELECT
GRANT SELECT ON public.applications TO authenticated;
GRANT SELECT ON public.applications TO service_role;
GRANT ALL ON public.applications TO postgres;

-- RLS policies: authenticated can only SELECT (no writes)
CREATE POLICY "applications_select_authenticated" ON public.applications
  FOR SELECT
  TO authenticated
  USING (true);

-- Writes are handled by service_role (bypasses RLS) or postgres only.
-- No authenticated INSERT/UPDATE/DELETE policy exists per Phase 2 security model.

COMMIT;
```

| Aspecto              | Valor                                                   |
| -------------------- | ------------------------------------------------------- |
| Tablas               | `public.applications`                                   |
| Funciones            | ninguna                                                 |
| Triggers             | ninguno                                                 |
| Policies             | `applications_select_authenticated`                     |
| Dependencia anterior | ninguna (puede ejecutarse primero)                      |
| Riesgo               | Bajo. Tabla nueva, sin datos, sin CASCADE               |
| Criterio aplicación  | `CREATE TABLE IF NOT EXISTS` → seguro para re-ejecución |
| Criterio detención   | Si la tabla ya existe y tiene datos no esperados        |

---

### 20260728000002_create_app_memberships.sql

```
Ruta:     supabase/migrations/20260728000002_create_app_memberships.sql
Líneas:   54
SHA-256:  6EB928B2BDC7EEE61FDABE651F17B570F9D28163943888601A947F63C78842BD
```

```sql
-- @license SPDX-License-Identifier: Apache-2.0
-- Fase 2 Migration 2: Create app_memberships table
-- Joins users to applications within a tenant, each with a distinct role.

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  application_code TEXT NOT NULL REFERENCES public.applications(code),
  role TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_memberships_role_not_empty CHECK (role <> ''),
  UNIQUE (tenant_id, user_id, application_code)
);

COMMENT ON TABLE public.app_memberships IS 'Membresías de usuarios por aplicación y tenant';
COMMENT ON COLUMN public.app_memberships.role IS 'Rol del usuario dentro de la aplicación';
COMMENT ON COLUMN public.app_memberships.is_active IS 'Permite desactivar temporalmente una membresía';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_app_memberships_tenant ON public.app_memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_memberships_user ON public.app_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_app_memberships_application ON public.app_memberships(application_code);
CREATE INDEX IF NOT EXISTS idx_app_memberships_tenant_user_active ON public.app_memberships(tenant_id, user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_app_memberships_user_app_active ON public.app_memberships(user_id, application_code, is_active);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_app_memberships_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_memberships_updated_at ON public.app_memberships;
CREATE TRIGGER trg_app_memberships_updated_at
  BEFORE UPDATE ON public.app_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_app_memberships_updated_at();

ALTER TABLE public.app_memberships ENABLE ROW LEVEL SECURITY;

-- Grants: anon no access, authenticated minimal, service_role full
GRANT SELECT ON public.app_memberships TO authenticated;
GRANT ALL ON public.app_memberships TO service_role;
GRANT ALL ON public.app_memberships TO postgres;

-- RLS: users can only read their own memberships
CREATE POLICY "app_memberships_select_own" ON public.app_memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role bypasses RLS by default
-- Admin writes are handled via service_role only (not direct client writes)

COMMIT;
```

| Aspecto              | Valor                                                        |
| -------------------- | ------------------------------------------------------------ |
| Tablas               | `public.app_memberships`                                     |
| Funciones            | `update_app_memberships_updated_at()`                        |
| Triggers             | `trg_app_memberships_updated_at`                             |
| Policies             | `app_memberships_select_own`                                 |
| Dependencia anterior | 00001 (FK → applications). `public.tenants` debe existir.    |
| Riesgo               | Bajo. Tabla nueva, sin datos                                 |
| Criterio aplicación  | `CREATE TABLE IF NOT EXISTS` → seguro                        |
| Criterio detención   | Si `public.tenants` no existe o `auth.users` no es accesible |

---

### 20260728000003_seed_applications.sql

```
Ruta:     supabase/migrations/20260728000003_seed_applications.sql
Líneas:   8
SHA-256:  168A1E3A2B8D816BF79EC7C6F2E1D0CDF90C12F709AAB8941BF2BA33108CFD53
```

```sql
-- @license SPDX-License-Identifier: Apache-2.0
-- Fase 2 Migration 3: Seed registered applications

BEGIN;

INSERT INTO public.applications (code, name) VALUES
  ('convivencia', 'Sistema Integral de Convivencia Escolar'),
  ('inasistencias', 'Registro de Inasistencias')
ON CONFLICT (code) DO NOTHING;

COMMIT;
```

| Aspecto              | Valor                                         |
| -------------------- | --------------------------------------------- |
| Tablas               | `public.applications` (INSERT)                |
| Dependencia anterior | 00001                                         |
| Riesgo               | Mínimo. `ON CONFLICT DO NOTHING`, idempotente |

---

### 20260728000004_prepare_membership_backfill.sql

```
Ruta:     supabase/migrations/20260728000004_prepare_membership_backfill.sql
Líneas:   30
SHA-256:  00B1193C7E26202DA721BADF547B0430AE3046ED4D57C213A8046747BB4EE563
```

```sql
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
```

| Aspecto                    | Valor                                                          |
| -------------------------- | -------------------------------------------------------------- |
| Objeto                     | `public.membership_readiness` (VIEW, SECURITY INVOKER default) |
| Dependencia anterior       | ninguna (solo lectura de `profiles`)                           |
| Riesgo                     | Bajo. View de solo diagnóstico, sin modificar datos            |
| Sin email                  | ✅                                                             |
| Sin full_name              | ✅                                                             |
| Sin acceso anon            | ✅ `REVOKE ALL FROM PUBLIC; REVOKE FROM anon`                  |
| Sin acceso authenticated   | ✅ `REVOKE ALL FROM authenticated`                             |
| Solo service_role/postgres | ✅                                                             |
| **Fix aplicado**           | Typo `readINESS` → `readiness` corregido                       |

---

### 20260728000005_create_initial_memberships_inasistencias.sql

```
Ruta:     supabase/migrations/20260728000005_create_initial_memberships_inasistencias.sql
Líneas:   26
SHA-256:  04DF799298EBF1BABEB204F22A94AC4AAEA3B2CBD141F5103D75E8F4DFE44382
```

```sql
-- @license SPDX-License-Identifier: Apache-2.0
-- Fase 2 Migration 5: Backfill Inasistencias memberships
-- Only non-ambiguous roles: teacher -> inasistencias.
-- All other roles excluded (require manual review).

BEGIN;

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

DO $$
DECLARE
  v_count INT;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Migration 00005: Inserted % memberships for Inasistencias (teacher only)', v_count;
END;
$$;

COMMIT;
```

| Aspecto                          | Estado                                     |
| -------------------------------- | ------------------------------------------ |
| Solo `teacher` → `inasistencias` | ✅ `WHERE p.role = 'teacher'`              |
| `ON CONFLICT` seguro             | ✅ `DO NOTHING`                            |
| No sobrescribe existentes        | ✅ `NOT EXISTS` + `ON CONFLICT DO NOTHING` |
| No inserta `tenant_id` NULL      | ✅ `WHERE p.tenant_id IS NOT NULL`         |
| No inserta `role` NULL           | ✅ `WHERE p.role = 'teacher'`              |
| No imprime datos personales      | ✅ Solo `RAISE NOTICE '... count ...'`     |

**Incluido en el backfill local:** 1 perfil `teacher` → app `inasistencias` con role `teacher`.

---

### 20260728000006_create_initial_memberships_convivencia.sql

```
Ruta:     supabase/migrations/20260728000006_create_initial_memberships_convivencia.sql
Líneas:   26
SHA-256:  1A08DF97426D49F4B6DC62C03241B4F3D999D1C2D6B1D23DBB90BDCE3C7C2124
```

```sql
-- @license SPDX-License-Identifier: Apache-2.0
-- Fase 2 Migration 6: Backfill Convivencia memberships
-- Only non-ambiguous roles: direccion, convivencia -> convivencia.
-- All other roles excluded (require manual review).

BEGIN;

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

DO $$
DECLARE
  v_count INT;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Migration 00006: Inserted % memberships for Convivencia (direccion, convivencia only)', v_count;
END;
$$;

COMMIT;
```

| Aspecto                        | Estado                                            |
| ------------------------------ | ------------------------------------------------- |
| Solo `direccion`/`convivencia` | ✅ `WHERE p.role IN ('direccion', 'convivencia')` |
| `ON CONFLICT` seguro           | ✅                                                |
| No sobrescribe                 | ✅                                                |
| No inserta NULLs               | ✅                                                |

**Incluido en el backfill local:** perfiles con role `direccion` o `convivencia`. Si no existen candidatos, es **no-op**.

---

### 20260728000007_enable_membership_tables_and_tenants_rls.sql

```
Ruta:     supabase/migrations/20260728000007_enable_membership_tables_and_tenants_rls.sql
Líneas:   46
SHA-256:  3D903D3A6F71A49007CB2EC9AA24AE50A20EF60235170F6ACD587F6E1F096A0A
```

```sql
-- @license SPDX-License-Identifier: Apache-2.0
-- Fase 2 Migration 7: RLS hardening for membership tables and tenants
-- Forward-only: no data changes, only security policies.

BEGIN;

-- ============================================================
-- 1. TENANTS RLS -- READ-ONLY FOR AUTHENTICATED
-- ============================================================
-- Per Phase 2 security model: authenticated users can only SELECT
-- their own tenant. All writes (INSERT, UPDATE, DELETE) are handled
-- by service_role (bypasses RLS) or postgres.
-- Legacy profiles.role is NOT used to authorize writes on security tables.

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_select_own" ON public.tenants;
DROP POLICY IF EXISTS "tenants_insert_admin" ON public.tenants;
DROP POLICY IF EXISTS "tenants_insert_service" ON public.tenants;
DROP POLICY IF EXISTS "tenants_update_own" ON public.tenants;
DROP POLICY IF EXISTS "tenants_update_admin" ON public.tenants;
DROP POLICY IF EXISTS "tenants_delete_own" ON public.tenants;
DROP POLICY IF EXISTS "tenants_delete_admin" ON public.tenants;

CREATE POLICY "tenants_select_own" ON public.tenants
  FOR SELECT
  TO authenticated
  USING (id = public.current_tenant_id());

-- No INSERT, UPDATE, or DELETE policies for authenticated users.

-- ============================================================
-- 2. APPLICATIONS RLS
-- ============================================================

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applications_select_authenticated" ON public.applications;
DROP POLICY IF EXISTS "applications_admin_all" ON public.applications;

CREATE POLICY "applications_select_authenticated" ON public.applications
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated writes are intentionally absent per Phase 2 security model.

-- ============================================================
-- 3. APP_MEMBERSHIPS RLS
-- ============================================================

ALTER TABLE public.app_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_memberships_select_own" ON public.app_memberships;
CREATE POLICY "app_memberships_select_own" ON public.app_memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

COMMIT;

SELECT pg_notify('pgrst', 'reload schema');
```

| Aspecto              | Valor                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Tablas afectadas     | `tenants`, `applications`, `app_memberships`                                                                           |
| Policies             | `tenants_select_own`, `applications_select_authenticated`, `app_memberships_select_own`                                |
| Dependencia anterior | 00001, 00002                                                                                                           |
| Riesgo               | Medio. Cambia policies existentes. Elimina escrituras authenticated sobre `tenants`.                                   |
| **Fix aplicado**     | Eliminadas policies `tenants_insert_service`, `tenants_update_admin`, `tenants_delete_admin`, `applications_admin_all` |

---

### 20260728000008_create_membership_helpers.sql

```
Ruta:     supabase/migrations/20260728000008_create_membership_helpers.sql
Líneas:   77
SHA-256:  2FE0E634D4AED244B959E018ECEABF7017D13455A3870FCC02F074894928025F
```

```sql
-- @license SPDX-License-Identifier: Apache-2.0
-- Fase 2 Migration 8: Membership helper functions
-- Provides current_user_memberships() and has_app_access()
-- for applications to query membership state.

BEGIN;

-- ============================================================
-- 1. current_user_memberships()
-- Returns all active memberships for the current user + tenant.
-- Security DEFINER needed because user reads app_memberships
-- RLS-scoped rows but we also need to check application is_active.
-- The function is STABLE (no writes) and search_path is locked.
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_memberships()
RETURNS TABLE(
  application_code TEXT,
  role TEXT,
  is_active BOOLEAN,
  app_is_active BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    m.application_code,
    m.role,
    m.is_active,
    a.is_active AS app_is_active
  FROM public.app_memberships m
  JOIN public.applications a ON a.code = m.application_code
  WHERE m.user_id = auth.uid()
    AND m.tenant_id = public.current_tenant_id()
    AND m.is_active = true
    AND a.is_active = true;
$$;

COMMENT ON FUNCTION public.current_user_memberships IS 'Retorna las membresías activas del usuario autenticado en el tenant actual';

-- ============================================================
-- 2. has_app_access()
-- Returns true if the user has an active membership for the
-- given application, optionally filtered by allowed roles.
-- Returns false when no session, no tenant, or no membership.
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_app_access(
  p_application_code TEXT,
  p_roles TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_memberships m
    JOIN public.applications a ON a.code = m.application_code
    WHERE m.user_id = auth.uid()
      AND m.tenant_id = public.current_tenant_id()
      AND m.application_code = p_application_code
      AND m.is_active = true
      AND a.is_active = true
      AND (p_roles IS NULL OR m.role = ANY (p_roles))
  );
$$;

COMMENT ON FUNCTION public.has_app_access IS 'Verifica si el usuario tiene acceso activo a una aplicación, opcionalmente filtrando por roles';

-- Grants: only authenticated can EXECUTE
REVOKE ALL ON FUNCTION public.current_user_memberships FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_app_access FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_memberships TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_app_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_memberships TO service_role;
GRANT EXECUTE ON FUNCTION public.has_app_access TO service_role;
GRANT ALL ON FUNCTION public.current_user_memberships TO postgres;
GRANT ALL ON FUNCTION public.has_app_access TO postgres;

COMMIT;

SELECT pg_notify('pgrst', 'reload schema');
```

| Aspecto                        | Estado                                                                                                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `current_user_memberships()`   | ✅ RETURNS TABLE, STABLE, SECURITY DEFINER                                                                                                                                                     |
| `has_app_access(TEXT, TEXT[])` | ✅ RETURNS BOOLEAN, STABLE, SECURITY DEFINER                                                                                                                                                   |
| `search_path`                  | ✅ `public, pg_temp` (sin comillas)                                                                                                                                                            |
| Schemas calificados            | ✅ `public.app_memberships`, `public.applications`                                                                                                                                             |
| Retorna vacío/false sin sesión | ✅ `auth.uid()` IS NULL → WHERE FALSE                                                                                                                                                          |
| Solo memberships activas       | ✅ `m.is_active = true`                                                                                                                                                                        |
| Solo applications activas      | ✅ `a.is_active = true`                                                                                                                                                                        |
| No acepta `user_id` externo    | ✅ usa `auth.uid()`                                                                                                                                                                            |
| anon sin EXECUTE               | ✅ `REVOKE ALL FROM PUBLIC`                                                                                                                                                                    |
| authenticated EXECUTE          | ✅                                                                                                                                                                                             |
| SECURITY DEFINER justificado   | Necesario para hacer JOIN entre `app_memberships` (RLS `user_id = auth.uid()`) y `applications` (RLS `USING(true)`). Filtro explícito `m.user_id = auth.uid()` previene fuga. Owner: postgres. |

---

## 2. Revisión crítica de grants y RLS

### APPLICATIONS

| Operación | anon         | authenticated                             | service_role      | postgres       |
| --------- | ------------ | ----------------------------------------- | ----------------- | -------------- |
| SELECT    | ❌ sin grant | ✅ `GRANT SELECT` + policy `USING (true)` | ✅ `GRANT SELECT` | ✅ `GRANT ALL` |
| INSERT    | ❌           | ❌ sin policy                             | ✅ bypass RLS     | ✅ `GRANT ALL` |
| UPDATE    | ❌           | ❌ sin policy                             | ✅ bypass RLS     | ✅ `GRANT ALL` |
| DELETE    | ❌           | ❌ sin policy                             | ✅ bypass RLS     | ✅ `GRANT ALL` |

### APP_MEMBERSHIPS

| Operación | anon         | authenticated                                     | service_role   | postgres       |
| --------- | ------------ | ------------------------------------------------- | -------------- | -------------- |
| SELECT    | ❌ sin grant | ✅ `GRANT SELECT` + policy `user_id = auth.uid()` | ✅ `GRANT ALL` | ✅ `GRANT ALL` |
| INSERT    | ❌           | ❌ sin policy                                     | ✅ `GRANT ALL` | ✅ `GRANT ALL` |
| UPDATE    | ❌           | ❌ sin policy                                     | ✅ `GRANT ALL` | ✅ `GRANT ALL` |
| DELETE    | ❌           | ❌ sin policy                                     | ✅ `GRANT ALL` | ✅ `GRANT ALL` |

### TENANTS

| Operación | anon | authenticated                        | service_role  | postgres |
| --------- | ---- | ------------------------------------ | ------------- | -------- |
| SELECT    | ❌   | ✅ policy `id = current_tenant_id()` | ✅            | ✅       |
| INSERT    | ❌   | ❌ sin policy                        | ✅ bypass RLS | ✅       |
| UPDATE    | ❌   | ❌ sin policy                        | ✅ bypass RLS | ✅       |
| DELETE    | ❌   | ❌ sin policy                        | ✅ bypass RLS | ✅       |

**Conclusión:** ✅ Ningún authenticated tiene INSERT/UPDATE/DELETE en ninguna de las tres tablas.

---

## 3. Correcciones realizadas

| Migración | Corrección                                                                                                                     | Gravedad       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| **00001** | Eliminada policy `applications_admin_all` que permitía INSERT/UPDATE/DELETE a authenticated con `current_app_role() = 'admin'` | **Bloqueador** |
| **00004** | Corregido typo `membership_readINESS` → `membership_readiness` (l. 29 original)                                                | Cosmético      |
| **00007** | Eliminadas 3 policies de escritura en `tenants`: `tenants_insert_service`, `tenants_update_admin`, `tenants_delete_admin`      | **Bloqueador** |
| **00007** | Eliminada recreación de `applications_admin_all` policy                                                                        | **Bloqueador** |

---

## 4. Staff no se migra automáticamente

El perfil `staff` está explícitamente excluido de ambas migraciones de backfill (00005 y 00006). Solo se migra si hay revisión manual posterior.

## 5. Teacher solo candidato a Inasistencias

El backfill 00005 inserta únicamente perfiles `teacher` con aplicación `inasistencias` y role `'teacher'`.

---

## 6. Orden progresivo de 8 etapas

### ETAPA A — Aplicar 00001

```
1. Ejecutar phase-2-pre-application-validation.sql
2. Aplicar 20260728000001_create_applications.sql
3. Validación:
   SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='applications');
   SELECT relrowsecurity FROM pg_class WHERE oid='public.applications'::regclass;
   SELECT grantee, privilege_type FROM information_schema.role_table_grants
     WHERE table_name='applications' AND grantee IN ('authenticated','anon','service_role');
4. Smoke: SELECT * FROM public.applications;  → 0 filas
5. Detención: schema inesperado, anon puede SELECT, authenticated puede INSERT
```

### ETAPA B — Aplicar 00002

```
1. Aplicar 20260728000002_create_app_memberships.sql
2. Validación:
   -- Tabla existe
   SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='app_memberships');
   -- PK
   SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='app_memberships_pkey');
   -- FKs
   SELECT conname FROM pg_constraint WHERE conrelid='public.app_memberships'::regclass AND contype='f';
   -- UNIQUE
   SELECT conname FROM pg_constraint WHERE conrelid='public.app_memberships'::regclass AND contype='u';
   -- Índices
   SELECT indexname FROM pg_indexes WHERE tablename='app_memberships';
   -- RLS
   SELECT relrowsecurity FROM pg_class WHERE oid='public.app_memberships'::regclass;
   -- Policy
   SELECT policyname, cmd, qual FROM pg_policies WHERE tablename='app_memberships';
   -- Grants
   SELECT grantee, privilege_type FROM information_schema.role_table_grants
     WHERE table_name='app_memberships' AND grantee IN ('authenticated','anon','service_role');
3. Smoke: INSERT INTO app_memberships (...) → debe FALLAR para authenticated
4. Detención: authenticated puede INSERT, recursión RLS, FK rota
```

### ETAPA C — Aplicar 00003

```
1. Aplicar 20260728000003_seed_applications.sql
2. Validación:
   SELECT code, name, is_active FROM public.applications ORDER BY code;
   → convivencia | Sistema Integral de Convivencia Escolar | t
   → inasistencias | Registro de Inasistencias | t
3. Detención: más de 2 filas, código no esperado, name vacío
```

### ETAPA D — Aplicar 00004

```
1. Aplicar 20260728000004_prepare_membership_backfill.sql
2. Validación:
   SELECT grantee, privilege_type FROM information_schema.role_table_grants
     WHERE table_name='membership_readiness';
   → service_role/SELECT, postgres/SELECT. SIN authenticated, SIN anon.
   Como authenticated: SELECT * FROM public.membership_readiness → ERROR
3. Diagnóstico (como service_role):
   SELECT membership_category, COUNT(*) FROM public.membership_readiness
   GROUP BY membership_category ORDER BY membership_category;
4. Detención: view expone email/full_name, authenticated puede acceder
```

### ETAPA E — Aplicar 00007

```
1. Aplicar 20260728000007_enable_membership_tables_and_tenants_rls.sql
2. Validación:
   -- tenants: solo "tenants_select_own"
   SELECT policyname, cmd FROM pg_policies WHERE tablename='tenants';
   -- applications: solo "applications_select_authenticated"
   SELECT policyname, cmd FROM pg_policies WHERE tablename='applications';
   -- app_memberships: solo "app_memberships_select_own"
   SELECT policyname, cmd FROM pg_policies WHERE tablename='app_memberships';
   -- INSERT/UPDATE/DELETE en tenants deben FALLAR para authenticated
3. Smoke tests con ambas apps (VITE_APP_MEMBERSHIPS_ENABLED=false):
   - Login en Convivencia → OK
   - Login en Inasistencias → OK
4. Detención: alguna app no puede login, policy permite writes, recursión RLS
```

### ETAPA F — Aplicar 00008

```
1. Aplicar 20260728000008_create_membership_helpers.sql
2. Validación:
   SELECT proname FROM pg_proc WHERE proname IN ('current_user_memberships','has_app_access')
     AND pronamespace='public'::regnamespace;
   SELECT prosrc FROM pg_proc WHERE proname='has_app_access';
   SELECT grantee, privilege_type FROM information_schema.routine_privileges
     WHERE routine_name='current_user_memberships';
   -- Tests como authenticated:
   SELECT * FROM public.current_user_memberships();           → vacío
   SELECT public.has_app_access('convivencia');               → false
   SELECT public.has_app_access('inasistencias', '{teacher}'); → false
   SELECT public.has_app_access('nonexistent');               → false
3. Detención: anon puede EXECUTE, función retorna datos ajenos, search_path inseguro
```

### ETAPA G — Aplicar 00005

```
1. Aplicar 20260728000005_create_initial_memberships_inasistencias.sql
2. Validación:
   SELECT role, COUNT(*) FROM public.app_memberships
     WHERE application_code='inasistencias' GROUP BY role;
   → solo 'teacher'
   SELECT COUNT(*) AS staff_migrated
     FROM app_memberships m JOIN profiles p ON p.user_id=m.user_id WHERE p.role='staff';
   → 0
3. Smoke: login teacher + feature flag true → membership reconocida
4. Detención: role != teacher aparece, staff migrado, duplicados, teacher sin membership
```

### ETAPA H — Aplicar 00006

```
1. Verificar candidatos: ¿existen perfiles direccion/convivencia?
   SELECT role, COUNT(*) FROM profiles WHERE role IN ('direccion','convivencia') GROUP BY role;
   Si COUNT=0 → aplicar igual (no-op)
2. Aplicar 20260728000006_create_initial_memberships_convivencia.sql
3. Validación:
   SELECT role, COUNT(*) FROM app_memberships WHERE application_code='convivencia' GROUP BY role;
   → solo 'direccion' y/o 'convivencia'
4. Detención: role != direccion/convivencia, staff migrado, duplicados
```

---

## 7. Estado remoto conocido

| Perfil      | Rol       | tenant_id   | Acción Fase 2                                                  |
| ----------- | --------- | ----------- | -------------------------------------------------------------- |
| teacher (1) | `teacher` | ✅ presente | `→ inasistencias / teacher` en migración 00005                 |
| staff (1)   | `staff`   | ✅ presente | ❌ Excluido. Documentado en `10-membership-backfill-review.md` |

---

## 8. Feature flag

| Repositorio   | Archivo      | Línea | Valor                                |
| ------------- | ------------ | ----- | ------------------------------------ |
| Convivencia   | `.env.local` | 14    | `VITE_APP_MEMBERSHIPS_ENABLED=false` |
| Inasistencias | `.env.local` | 4     | `VITE_APP_MEMBERSHIPS_ENABLED=false` |

Con flag `false`:

- No se consultan tablas `app_memberships` / `applications` en frontend
- `profiles.role` sigue como fallback de autorización
- Membership ausente NO bloquea login
- Vista Docente sigue en mantenimiento
- No hay `service_role` en frontend

**No activar la flag.** Permanece `false` hasta aplicación completa.

---

## 9. Validación local

### Convivencia (`sistema-integral-convivencia-escolar`)

| Comando             | Resultado               |
| ------------------- | ----------------------- |
| `npm run lint`      | ✅ 0 errors, 0 warnings |
| `npm test`          | ✅ 136/136 tests pass   |
| `npm run build:web` | ✅ build exitoso        |

### Inasistencias (`registroinasistencia`)

| Comando                      | Resultado                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npm run lint`               | ⚠️ 2155 errors pre-existing (prettier CRLF, supabase types auto-generated — fuera de alcance de Fase 2) |
| `npm test`                   | ✅ 120/120 tests pass                                                                                   |
| `npm run build`              | ✅ build exitoso                                                                                        |
| `npx tsc --noEmit`           | ✅ sin errores de tipos                                                                                 |
| ESLint sobre archivos nuevos | ✅ `membership.ts`, `membershipService.ts`, `useAuth.ts` — 0 errors                                     |

---

## 10. Git status

### Convivencia

```
 M .ai/roadmap.md
 M src/shared/lib/stores/authStore.ts
?? server/api/middleware/requireMembership.ts
?? server/middleware/requireMembership.ts
?? src/shared/api/hooks/useMemberships.ts
?? src/shared/api/services/membership.service.ts
?? src/shared/api/services/membership.service.test.ts
?? src/shared/api/types/membership.ts
?? docs/shared-supabase/
?? supabase/migrations/2026072800000*.sql  (8 archivos)
?? supabase/validation/                     (4 archivos)
```

### Inasistencias

```
 M src/hooks/useAuth.ts
?? src/services/membershipService.ts
?? src/types/membership.ts
```

---

## 11. Supabase remoto

✅ Sin cambios. No se ejecutó `db push`, `db reset`, ni SQL Editor remoto.

## 12. No deploy, commit ni push

✅ No se ejecutó `git commit`, `git push`, `vercel deploy`. Todo es local.

---

## Decisión final

### APTO PARA EJECUTAR MIGRACIÓN 20260728000001 — INICIAR ETAPA A

- ✅ Ninguna policy permite INSERT/UPDATE/DELETE a authenticated en `applications`, `app_memberships` ni `tenants`
- ✅ No se usa `profiles.role` ni `current_app_role()` para autorizar escrituras en tablas de seguridad
- ✅ `staff` no se migra automáticamente
- ✅ `teacher` solo va a Inasistencias
- ✅ `search_path` bloqueado en `public, pg_temp`
- ✅ Grants mínimos: SELECT authenticated, ALL service_role/postgres
- ✅ Feature flag `VITE_APP_MEMBERSHIPS_ENABLED=false` en ambos repos
- ✅ Sin `USING(true)` ni `WITH CHECK(true)` en policies de escritura
- ✅ Sin recursión RLS
- ✅ 136/136 tests Convivencia, 120/120 tests Inasistencias
- ✅ Build exitoso en ambos repositorios

### DETENERSE — No aplicar ninguna migración hasta recibir instrucciones para ETAPA A.
