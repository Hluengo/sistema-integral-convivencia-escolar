# Correcciones Finales — Fase 2 (Pre-Aplicación)

**Fecha:** 2026-07-28
**SHA-256 sellado en el documento.**

---

## 1. Correcciones aplicadas

| Archivo      | Cambio                                                                    | Gravedad        |
| ------------ | ------------------------------------------------------------------------- | --------------- |
| `00001`      | `USING(true)` → `USING(is_active = true)` en policy SELECT                | **Bloqueador**  |
| `00001`      | `GRANT SELECT` → `GRANT SELECT, INSERT, UPDATE, DELETE` para service_role | **Bloqueador**  |
| `00007`      | `USING(true)` → `USING(is_active = true)` en recreación de policy         | **Bloqueador**  |
| `00005`      | INSERT + GET DIAGNOSTICS unificados en mismo DO block                     | **Correctitud** |
| `00006`      | INSERT + GET DIAGNOSTICS unificados en mismo DO block                     | **Correctitud** |
| `validation` | Nuevos checks 6.1a (is_active), 6.1b (no USING(true)), 7.2–7.4 (grants)   | Mejora          |

---

## 2. Contenido final de archivos modificados

### 20260728000001_create_applications.sql

```
SHA-256: 24A60E502900F6FFAEAA710F390A3614956690CB2C5921489E97444E9F40488E
Líneas:  29
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
```

### 20260728000007 — Sección APPLICATIONS RLS (única sección modificada)

```
SHA-256: 2F49E1FC50B6C8B6D877404DC2E0FEA7DAAEAE8E25D6EC1951CDDCF4013C7165
Líneas:  47
```

```sql
-- ============================================================
-- 2. APPLICATIONS RLS
-- ============================================================

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applications_select_authenticated" ON public.applications;
DROP POLICY IF EXISTS "applications_admin_all" ON public.applications;

CREATE POLICY "applications_select_authenticated" ON public.applications
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Authenticated writes are intentionally absent per Phase 2 security model.
-- service_role grants (SELECT, INSERT, UPDATE, DELETE) are defined in
-- migration 00001 and are not modified here.
```

### 20260728000005_create_initial_memberships_inasistencias.sql

```
SHA-256: 423DE0EEFEA66D78129426F6D504E580946CD3F3475E83DD68376AE22CAB742A
Líneas:  26
```

```sql
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
```

### 20260728000006_create_initial_memberships_convivencia.sql

```
SHA-256: A636D976897C49425289913E5BD805E780047DDC41A5C376ED3E6E2C88CF8E38
Líneas:  26
```

```sql
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
```

---

## 3. SHA-256 completo de todos los archivos

| Archivo      | SHA-256                                                            |
| ------------ | ------------------------------------------------------------------ |
| `00001`      | `24A60E502900F6FFAEAA710F390A3614956690CB2C5921489E97444E9F40488E` |
| `00002`      | `6EB928B2BDC7EEE61FDABE651F17B570F9D28163943888601A947F63C78842BD` |
| `00003`      | `168A1E3A2B8D816BF79EC7C6F2E1D0CDF90C12F709AAB8941BF2BA33108CFD53` |
| `00004`      | `00B1193C7E26202DA721BADF547B0430AE3046ED4D57C213A8046747BB4EE563` |
| `00005`      | `423DE0EEFEA66D78129426F6D504E580946CD3F3475E83DD68376AE22CAB742A` |
| `00006`      | `A636D976897C49425289913E5BD805E780047DDC41A5C376ED3E6E2C88CF8E38` |
| `00007`      | `2F49E1FC50B6C8B6D877404DC2E0FEA7DAAEAE8E25D6EC1951CDDCF4013C7165` |
| `00008`      | `2FE0E634D4AED244B959E018ECEABF7017D13455A3870FCC02F074894928025F` |
| `validation` | `70E8181D0E3AE094B36717078048427778DA3647AF764611944D888620352EF9` |

---

## 4. Validación de grants efectivos

### APPLICATIONS

| Role          | SELECT                                        | INSERT        | UPDATE        | DELETE        |
| ------------- | --------------------------------------------- | ------------- | ------------- | ------------- |
| anon          | ❌ sin grant                                  | ❌            | ❌            | ❌            |
| authenticated | ✅ `GRANT SELECT` + policy `is_active = true` | ❌ sin policy | ❌ sin policy | ❌ sin policy |
| service_role  | ✅ `GRANT SELECT, INSERT, UPDATE, DELETE`     | ✅            | ✅            | ✅            |
| postgres      | ✅ `GRANT ALL`                                | ✅            | ✅            | ✅            |

### APP_MEMBERSHIPS (sin cambios)

| Role          | SELECT                                            | INSERT | UPDATE | DELETE |
| ------------- | ------------------------------------------------- | ------ | ------ | ------ |
| anon          | ❌                                                | ❌     | ❌     | ❌     |
| authenticated | ✅ `GRANT SELECT` + policy `user_id = auth.uid()` | ❌     | ❌     | ❌     |
| service_role  | ✅ `GRANT ALL`                                    | ✅     | ✅     | ✅     |
| postgres      | ✅ `GRANT ALL`                                    | ✅     | ✅     | ✅     |

### TENANTS (sin cambios desde revisión anterior)

| Role          | SELECT                               | INSERT | UPDATE | DELETE |
| ------------- | ------------------------------------ | ------ | ------ | ------ |
| anon          | ❌                                   | ❌     | ❌     | ❌     |
| authenticated | ✅ policy `id = current_tenant_id()` | ❌     | ❌     | ❌     |
| service_role  | ✅ bypass RLS                        | ✅     | ✅     | ✅     |
| postgres      | ✅                                   | ✅     | ✅     | ✅     |

---

## 5. Diff preciso

### 00001 — diff

```diff
--- antes
+++ después
@@ -1,14 +1,14 @@
--- Grant minimal: anon gets nothing, authenticated gets SELECT
-GRANT SELECT ON public.applications TO authenticated;
-GRANT SELECT ON public.applications TO service_role;
+-- Grant minimal: anon gets nothing, authenticated gets SELECT only
+GRANT SELECT ON public.applications TO authenticated;
+GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO service_role;
 GRANT ALL ON public.applications TO postgres;

--- RLS policies: authenticated can only SELECT (no writes)
+-- RLS policies: authenticated can only SELECT active applications (no writes)
 CREATE POLICY "applications_select_authenticated" ON public.applications
   FOR SELECT
   TO authenticated
-  USING (true);
+  USING (is_active = true);
```

### 00007 — diff (solo sección APPLICATIONS)

```diff
--- antes
+++ después
 CREATE POLICY "applications_select_authenticated" ON public.applications
   FOR SELECT
   TO authenticated
-  USING (true);
+  USING (is_active = true);

--- Authenticated writes are intentionally absent per Phase 2 security model.
+-- Authenticated writes are intentionally absent per Phase 2 security model.
+-- service_role grants (SELECT, INSERT, UPDATE, DELETE) are defined in migration 00001 and are not modified here.
```

### 00005 — diff

```diff
--- antes
+++ después
-INSERT INTO public.app_memberships ...
-SELECT ...
-...
-ON CONFLICT ... DO NOTHING;
-
-DO $$
+DO $$
 DECLARE
   v_count INT;
 BEGIN
+  INSERT INTO public.app_memberships ...
+  SELECT ...
+  ...
+  ON CONFLICT ... DO NOTHING;
+
   GET DIAGNOSTICS v_count = ROW_COUNT;
   RAISE NOTICE 'Migration 00005: Inserted % memberships for Inasistencias (teacher only)', v_count;
 END;
```

### 00006 — diff (análogo a 00005)

Misma transformación: INSERT movido dentro del DO block.

---

## 6. Validación local

| Comando             | Resultado               |
| ------------------- | ----------------------- |
| `npm run lint`      | ✅ 0 errors, 0 warnings |
| `npm test`          | ✅ 136/136 tests pass   |
| `npm run build:web` | ✅ built in 20.96s      |

---

## 7. Git status (solo archivos Fase 2)

```
?? supabase/migrations/20260728000001_create_applications.sql
?? supabase/migrations/20260728000002_create_app_memberships.sql
?? supabase/migrations/20260728000003_seed_applications.sql
?? supabase/migrations/20260728000004_prepare_membership_backfill.sql
?? supabase/migrations/20260728000005_create_initial_memberships_inasistencias.sql
?? supabase/migrations/20260728000006_create_initial_memberships_convivencia.sql
?? supabase/migrations/20260728000007_enable_membership_tables_and_tenants_rls.sql
?? supabase/migrations/20260728000008_create_membership_helpers.sql
?? supabase/validation/phase-2-*.sql
```

Sin cambios en remoto. Sin commit. Sin push. Sin deploy.

---

## 8. Confirmaciones

| Aspecto                                                  | Estado |
| -------------------------------------------------------- | ------ |
| Supabase remoto sin modificar                            | ✅     |
| Sin commit, push ni deploy                               | ✅     |
| anon sin privilegios en applications                     | ✅     |
| authenticated solo SELECT en applications                | ✅     |
| Policy SELECT filtra `is_active = true`                  | ✅     |
| Sin `USING(true)` en applications                        | ✅     |
| service_role tiene SELECT/INSERT/UPDATE/DELETE           | ✅     |
| authenticated sin escrituras en ninguna tabla            | ✅     |
| Backfill 00005: solo teacher → inasistencias             | ✅     |
| Backfill 00006: solo direccion/convivencia → convivencia | ✅     |
| staff excluido de backfill                               | ✅     |
| ROW_COUNT en mismo DO block que INSERT                   | ✅     |

---

## Decisión final

### APTO PARA EJECUTAR MIGRACIÓN 20260728000001

Todas las correcciones bloqueantes aplicadas. Iniciar ETAPA A del orden progresivo.

### DETENERSE

Esperar instrucciones para comenzar.
