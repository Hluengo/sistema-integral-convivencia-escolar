-- ============================================================
-- Migration 20260717001: Multi-Tenant Isolation
-- Agrega soporte multi-tenant a todas las tablas del sistema
-- de convivencia escolar.
--
-- Pasos:
--   1. Crear tabla `tenants`
--   2. Agregar `tenant_id` a todas las tablas de datos
--   3. Insertar tenant por defecto (backward compatibility)
--   4. Backfill datos existentes con el tenant por defecto
--   5. Hacer `tenant_id` NOT NULL en todas las tablas
--   6. Crear índices en `tenant_id`
--   7. Crear función helper `current_tenant_id()`
--   8. Reemplazar políticas RLS con políticas tenant-aware
--   9. Actualizar trigger `handle_new_user`
--  10. Habilitar RLS en tablas que falten
-- ============================================================

-- ============================================================
-- 1. CREAR TABLA TENANTS
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. AGREGAR tenant_id A TODAS LAS TABLAS
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE causas ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE bitacora_entries ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE cartas_disciplinarias ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE etapas_disciplinarias ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE inspectorate_records ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE document_templates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- ============================================================
-- 3. INSERTAR TENANT POR DEFECTO
--     UUID fijo '00000000-0000-0000-0000-000000000001' para
--     compatibilidad hacia atrás con datos existentes.
-- ============================================================

INSERT INTO tenants (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default School', 'default')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 4. BACKFILL: ASIGNAR TENANT POR DEFECTO A FILAS EXISTENTES
-- ============================================================

UPDATE profiles SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

UPDATE causas SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

UPDATE bitacora_entries SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

UPDATE checklist_items SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

UPDATE cartas_disciplinarias SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

UPDATE etapas_disciplinarias SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

UPDATE inspectorate_records SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

UPDATE document_templates SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

UPDATE students SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

UPDATE courses SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- ============================================================
-- 5. HACER tenant_id NOT NULL
-- ============================================================

ALTER TABLE profiles ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE causas ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE bitacora_entries ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE checklist_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE cartas_disciplinarias ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE etapas_disciplinarias ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE inspectorate_records ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE document_templates ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE students ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE courses ALTER COLUMN tenant_id SET NOT NULL;

-- ============================================================
-- 6. CREAR ÍNDICES EN tenant_id
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_causas_tenant_id ON causas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_entries_tenant_id ON bitacora_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_tenant_id ON checklist_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cartas_disciplinarias_tenant_id ON cartas_disciplinarias(tenant_id);
CREATE INDEX IF NOT EXISTS idx_etapas_disciplinarias_tenant_id ON etapas_disciplinarias(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inspectorate_records_tenant_id ON inspectorate_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_tenant_id ON document_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_students_tenant_id ON students(tenant_id);
CREATE INDEX IF NOT EXISTS idx_courses_tenant_id ON courses(tenant_id);

-- ============================================================
-- 7. FUNCIÓN HELPER: current_tenant_id()
--     Retorna el tenant_id del usuario autenticado.
--     Útil para políticas RLS y consultas.
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- ============================================================
-- 8. REEMPLAZAR POLÍTICAS RLS CON POLÍTICAS TENANT-AWARE
-- ============================================================

-- 8a. DROP de políticas existentes (ordenadas por tabla)

DROP POLICY IF EXISTS "Allow authenticated on causas" ON causas;
DROP POLICY IF EXISTS "causas_write_staff" ON causas;
DROP POLICY IF EXISTS "causas_update_staff" ON causas;

DROP POLICY IF EXISTS "Allow authenticated on bitacora_entries" ON bitacora_entries;

DROP POLICY IF EXISTS "Allow authenticated on checklist_items" ON checklist_items;

DROP POLICY IF EXISTS "inspectorate_select_auth" ON inspectorate_records;
DROP POLICY IF EXISTS "inspectorate_insert_auth" ON inspectorate_records;
DROP POLICY IF EXISTS "inspectorate_update_auth" ON inspectorate_records;
DROP POLICY IF EXISTS "inspectorate_delete_auth" ON inspectorate_records;

DROP POLICY IF EXISTS "cartas_select_auth" ON cartas_disciplinarias;
DROP POLICY IF EXISTS "cartas_insert_auth" ON cartas_disciplinarias;
DROP POLICY IF EXISTS "cartas_update_auth" ON cartas_disciplinarias;
DROP POLICY IF EXISTS "cartas_delete_auth" ON cartas_disciplinarias;

DROP POLICY IF EXISTS "etapas_select_auth" ON etapas_disciplinarias;
DROP POLICY IF EXISTS "etapas_insert_auth" ON etapas_disciplinarias;
DROP POLICY IF EXISTS "etapas_update_auth" ON etapas_disciplinarias;
DROP POLICY IF EXISTS "etapas_delete_auth" ON etapas_disciplinarias;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_service" ON profiles;

-- 8b. Crear políticas tenant-aware

-- --- causas ---
CREATE POLICY "causas_tenant_select" ON causas
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "causas_tenant_insert" ON causas
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY[
      'admin', 'direccion', 'convivencia', 'inspectoria',
      'profesor_jefe', 'teacher', 'staff'
    ])
  );

CREATE POLICY "causas_tenant_update" ON causas
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY[
      'admin', 'direccion', 'convivencia', 'inspectoria',
      'profesor_jefe', 'teacher', 'staff'
    ])
  );

CREATE POLICY "causas_tenant_delete" ON causas
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND current_app_role() IN ('admin', 'direccion')
  );

-- --- bitacora_entries ---
CREATE POLICY "bitacora_tenant_select" ON bitacora_entries
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "bitacora_tenant_insert" ON bitacora_entries
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "bitacora_tenant_update" ON bitacora_entries
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "bitacora_tenant_delete" ON bitacora_entries
  FOR DELETE USING (tenant_id = current_tenant_id());

-- --- checklist_items ---
CREATE POLICY "checklist_tenant_select" ON checklist_items
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "checklist_tenant_insert" ON checklist_items
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "checklist_tenant_update" ON checklist_items
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "checklist_tenant_delete" ON checklist_items
  FOR DELETE USING (tenant_id = current_tenant_id());

-- --- inspectorate_records ---
CREATE POLICY "inspectorate_tenant_select" ON inspectorate_records
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "inspectorate_tenant_insert" ON inspectorate_records
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "inspectorate_tenant_update" ON inspectorate_records
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "inspectorate_tenant_delete" ON inspectorate_records
  FOR DELETE USING (tenant_id = current_tenant_id());

-- --- cartas_disciplinarias ---
CREATE POLICY "cartas_tenant_select" ON cartas_disciplinarias
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "cartas_tenant_insert" ON cartas_disciplinarias
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "cartas_tenant_update" ON cartas_disciplinarias
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "cartas_tenant_delete" ON cartas_disciplinarias
  FOR DELETE USING (tenant_id = current_tenant_id());

-- --- etapas_disciplinarias ---
CREATE POLICY "etapas_tenant_select" ON etapas_disciplinarias
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "etapas_tenant_insert" ON etapas_disciplinarias
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "etapas_tenant_update" ON etapas_disciplinarias
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "etapas_tenant_delete" ON etapas_disciplinarias
  FOR DELETE USING (tenant_id = current_tenant_id());

-- --- students ---
CREATE POLICY "students_tenant_select" ON students
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "students_tenant_insert" ON students
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "students_tenant_update" ON students
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "students_tenant_delete" ON students
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND current_app_role() IN ('admin', 'direccion')
  );

-- --- courses ---
CREATE POLICY "courses_tenant_select" ON courses
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "courses_tenant_insert" ON courses
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "courses_tenant_update" ON courses
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "courses_tenant_delete" ON courses
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND current_app_role() IN ('admin', 'direccion')
  );

-- --- document_templates ---
CREATE POLICY "templates_tenant_select" ON document_templates
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "templates_tenant_insert" ON document_templates
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "templates_tenant_update" ON document_templates
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "templates_tenant_delete" ON document_templates
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND current_app_role() IN ('admin', 'direccion')
  );

-- --- profiles (políticas especiales: el usuario ve su propio perfil
--     o todos los perfiles de su tenant si es admin/dirección) ---

CREATE POLICY "profiles_tenant_select" ON profiles
  FOR SELECT USING (
    user_id = auth.uid()
    OR (tenant_id = current_tenant_id() AND current_app_role() IN ('admin', 'direccion'))
  );

CREATE POLICY "profiles_tenant_insert" ON profiles
  FOR INSERT WITH CHECK (
    (tenant_id = current_tenant_id() AND current_app_role() IN ('admin', 'direccion'))
    OR user_id = auth.uid()
  );

CREATE POLICY "profiles_tenant_update" ON profiles
  FOR UPDATE USING (
    user_id = auth.uid()
    OR (tenant_id = current_tenant_id() AND current_app_role() IN ('admin', 'direccion'))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (tenant_id = current_tenant_id() AND current_app_role() IN ('admin', 'direccion'))
  );

CREATE POLICY "profiles_tenant_delete" ON profiles
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND current_app_role() IN ('admin', 'direccion')
  );

-- ============================================================
-- 9. ACTUALIZAR TRIGGER handle_new_user PARA INCLUIR tenant_id
--     Lee tenant_id de raw_user_meta_data o asigna el default.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := COALESCE(
    (NEW.raw_user_meta_data->>'tenant_id')::UUID,
    '00000000-0000-0000-0000-000000000001'::UUID
  );

  INSERT INTO public.profiles (user_id, email, full_name, role, tenant_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'usuario'), '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'inspectoria'),
    v_tenant_id
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN others THEN
  BEGIN
    INSERT INTO public.profiles (user_id, email, full_name, role, tenant_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'usuario'), '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'role', 'inspectoria'),
      v_tenant_id
    );
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 10. HABILITAR RLS EN TABLAS QUE FALTEN
--     (students, courses ya tienen RLS de su migración original;
--      cartas_disciplinarias, etapas_disciplinarias,
--      document_templates se habilitan aquí si no lo estaban)
-- ============================================================

ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cartas_disciplinarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS etapas_disciplinarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS document_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Refresh PostgREST schema cache
-- ============================================================
SELECT pg_notify('pgrst', 'reload schema');
