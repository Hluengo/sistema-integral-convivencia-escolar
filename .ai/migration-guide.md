# Migration Guide — Supabase

## Cómo Crear una Migración

```bash
# 1. Usar Supabase CLI
supabase migration new descripcion_de_la_migracion

# 2. Editar el archivo creado en supabase/migrations/
# Formato: YYYYMMDDHHMMSS_descripcion.sql

# 3. Aplicar localmente
supabase db push

# 4. Probar
supabase db diff

# 5. Commit
git add supabase/migrations/ && git commit -m "feat: agrega migración X"
```

## Convenciones

- **Naming**: `YYYYMMDDHHMMSS_descripcion_breve.sql`
- **NUNCA** modificar migraciones existentes
- **Siempre** agregar `tenant_id` con FK a `tenants(id)` en tablas multi-tenant
- **Siempre** crear RLS policies (SELECT + INSERT + UPDATE + DELETE)
- **Siempre** agregar índices para columnas de filtro
- **Siempre** probar con `supabase db push` antes de commit

## Checklist de Migración

- [ ] Nuevo archivo SQL con timestamp prefix
- [ ] CREATE TABLE o ALTER TABLE con todas las columnas
- [ ] FK constraints (including tenant_id → tenants(id))
- [ ] RLS policies (SELECT, INSERT, UPDATE, DELETE)
- [ ] Índices (tenant_id, FKs, fechas, status)
- [ ] Comentarios explicativos en SQL
- [ ] Si hay seed data, actualizar supabase/seed.sql

## Estructura Típica

```sql
-- 20260716100000_new_feature.sql

-- 1. Crear tabla
CREATE TABLE public.new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  ...
);

-- 2. Habilitar RLS
ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies
CREATE POLICY "new_table_tenant_select" ON public.new_table
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY "new_table_tenant_insert" ON public.new_table
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY "new_table_tenant_update" ON public.new_table
  FOR UPDATE USING (tenant_id = current_tenant_id());
CREATE POLICY "new_table_tenant_delete" ON public.new_table
  FOR DELETE USING (tenant_id = current_tenant_id());

-- 4. Índices
CREATE INDEX idx_new_table_tenant_id ON public.new_table(tenant_id);
CREATE INDEX idx_new_table_created_at ON public.new_table(created_at);
```
