-- ============================================================
-- Migration 20260720001: Cleanup stale RLS policies
--
-- Las migraciones previas (20260717001) intentaron dropear
-- políticas antiguas pero los nombres no coincidieron con las
-- realmente creadas en la BD. Estas políticas stale conviven
-- con las tenant-aware y, como RLS combina políticas permissive
-- con OR, anulan el tenant isolation.
--
-- Se dropean todas las políticas anteriores a la migración
-- multi-tenant que aún estén activas.
-- ============================================================

-- ============================================================
-- bitacora_entries
-- ============================================================
DROP POLICY IF EXISTS "Allow all on bitacora_entries" ON bitacora_entries;
DROP POLICY IF EXISTS "Allow anon and authenticated on bitacora_entries" ON bitacora_entries;

-- ============================================================
-- checklist_items
-- ============================================================
DROP POLICY IF EXISTS "Allow all on checklist_items" ON checklist_items;
DROP POLICY IF EXISTS "Allow anon and authenticated on checklist_items" ON checklist_items;

-- ============================================================
-- cartas_disciplinarias
-- ============================================================
DROP POLICY IF EXISTS "cartas_delete_admin" ON cartas_disciplinarias;
DROP POLICY IF EXISTS "cartas_select_staff" ON cartas_disciplinarias;
DROP POLICY IF EXISTS "cartas_update_convivencia" ON cartas_disciplinarias;
DROP POLICY IF EXISTS "cartas_write_convivencia" ON cartas_disciplinarias;

-- ============================================================
-- causas
-- ============================================================
DROP POLICY IF EXISTS "causas_select_staff" ON causas;
DROP POLICY IF EXISTS "causas_write_staff" ON causas;
DROP POLICY IF EXISTS "causas_update_staff" ON causas;

-- ============================================================
-- inspectorate_records
-- ============================================================
DROP POLICY IF EXISTS "inspectorate_delete_admin" ON inspectorate_records;
DROP POLICY IF EXISTS "inspectorate_insert_staff" ON inspectorate_records;
DROP POLICY IF EXISTS "inspectorate_select_staff" ON inspectorate_records;
DROP POLICY IF EXISTS "inspectorate_update_staff" ON inspectorate_records;

-- ============================================================
-- Refresh PostgREST schema cache
-- ============================================================
SELECT pg_notify('pgrst', 'reload schema');
