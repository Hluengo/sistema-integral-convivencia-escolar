-- ============================================================
-- MIGRACIÓN: Esquema completo para Gestión de Convivencia Escolar
-- Ejecutar en el SQL Editor de Supabase (https://supabase.com/dashboard)
-- ============================================================

-- 1. TABLA: causas
CREATE TABLE IF NOT EXISTS causas (
  id TEXT PRIMARY KEY,
  estudiante_nombre TEXT NOT NULL,
  estudiante_curso TEXT NOT NULL,
  nna_protected_name TEXT NOT NULL,
  run_estudiante TEXT NOT NULL,
  fecha_apertura TEXT NOT NULL,
  estado_actual TEXT NOT NULL,
  tipo_infraccion TEXT NOT NULL,
  responsable TEXT NOT NULL,
  compromete_aula_segura BOOLEAN DEFAULT false,
  fecha_ultima_actualizacion TEXT NOT NULL,
  observaciones TEXT DEFAULT '',
  conducta_rice_id TEXT,
  medidas_ejecutadas JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: bitacora_entries
CREATE TABLE IF NOT EXISTS bitacora_entries (
  id TEXT PRIMARY KEY,
  causa_id TEXT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  fecha TEXT NOT NULL,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  participantes JSONB DEFAULT '[]',
  documento_adjunto TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: checklist_items
CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT NOT NULL,
  causa_id TEXT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  completado BOOLEAN DEFAULT false,
  fecha_completado TEXT,
  requerido_por TEXT NOT NULL,
  registrado_por TEXT,
  observaciones TEXT,
  documento_nombre TEXT,
  documento_url TEXT,
  PRIMARY KEY (id, causa_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ÍNDICES para rendimiento
CREATE INDEX IF NOT EXISTS idx_bitacora_causa_id ON bitacora_entries(causa_id);
CREATE INDEX IF NOT EXISTS idx_checklist_causa_id ON checklist_items(causa_id);
CREATE INDEX IF NOT EXISTS idx_causas_estado ON causas(estado_actual);
CREATE INDEX IF NOT EXISTS idx_causas_fecha ON causas(fecha_ultima_actualizacion DESC);

-- 5. FUNCIÓN: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_causas_updated_at ON causas;
CREATE TRIGGER trigger_causas_updated_at
  BEFORE UPDATE ON causas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. RLS (Row Level Security) - Acceso restringido a usuarios autenticados
ALTER TABLE causas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitacora_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- Políticas: sólo usuarios autenticados pueden operar (bloquea acceso con anon key sin sesión)
-- Si tu app usa autenticación de Supabase, estas políticas son las mínimas seguras.
-- Para producción, considera afinar con auth.uid() por institución/establecimiento.

DROP POLICY IF EXISTS "Allow all on causas" ON causas;
CREATE POLICY "Authenticated users only on causas" ON causas
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow all on bitacora_entries" ON bitacora_entries;
CREATE POLICY "Authenticated users only on bitacora_entries" ON bitacora_entries
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow all on checklist_items" ON checklist_items;
CREATE POLICY "Authenticated users only on checklist_items" ON checklist_items
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 7. BUCKET DE STORAGE para documentos adjuntos
-- Ejecutar esto en la sección Storage de Supabase, o mediante SQL:
-- NOTA: Los buckets deben crearse desde el Dashboard de Supabase > Storage
-- Nombre del bucket: 'documentos_convivencia'
-- Política: Permitir lectura/escritura pública para desarrollo