-- ============================================================
-- Fix: GRANTs + RLS para todas las tablas (rol anon)
-- Ejecutar en: Supabase SQL Editor
-- ============================================================

-- ============================================================
-- inspectorate_records (SIN GRANTS PARA anon)
-- ============================================================
GRANT SELECT, INSERT, UPDATE ON inspectorate_records TO anon;

-- ============================================================
-- students
-- ============================================================
DO $$ BEGIN GRANT SELECT, INSERT, UPDATE ON students TO anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ============================================================
-- courses
-- ============================================================
DO $$ BEGIN GRANT SELECT, INSERT, UPDATE ON courses TO anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ============================================================
-- causas
-- ============================================================
DO $$ BEGIN GRANT SELECT, INSERT, UPDATE ON causas TO anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ============================================================
-- cartas_disciplinarias
-- ============================================================
DO $$ BEGIN GRANT SELECT, INSERT, UPDATE, DELETE ON cartas_disciplinarias TO anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ============================================================
-- etapas_disciplinarias
-- ============================================================
DO $$ BEGIN GRANT SELECT, INSERT, UPDATE, DELETE ON etapas_disciplinarias TO anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ============================================================
-- Sequences (necesarios para INSERT con UUIDs generados)
-- ============================================================
DO $$ BEGIN GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;
