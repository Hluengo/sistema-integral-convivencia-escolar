---
name: supabase-audit
description: Audita configuración Supabase: RLS, auth, storage, tablas, rendimiento. Trigger: Supabase, RLS, auth, storage,tablas.
---

# Supabase Audit

Audita y optimiza la configuración de Supabase.

## Checklist de Auditoría

### 1. Seguridad
- [ ] RLS habilitado en todas las tablas
- [ ] Policies específicas (no `Allow all`)
- [ ] Service role key solo en server-side
- [ ] Anon key con permisos mínimos
- [ ] Auth configurado correctamente

### 2. Tablas
- [ ] Tipos de datos correctos
- [ ] Índices en columnas frecuentemente consultadas
- [ ] Foreign keys definidas
- [ ] Default values apropiados
- [ ] Timestamps (created_at, updated_at)

### 3. Storage
- [ ] Buckets con RLS
- [ ] Tamaños máximos configurados
- [ ] MIME types restringidos
- [ ] Políticas de lectura/escritura

### 4. Performance
- [ ] Queries lentas identificadas
- [ ] Índices faltantes
- [ ] Tablas sin vacuum
- [ ] Conexiones excesivas

## Tablas del Proyecto
- `causas` — Casos de convivencia
- `bitacora_entries` — Registro de actividades
- `checklist_items` — Items de proceso
- `document_templates` — Plantillas de documentos

## Comandos Útiles
```sql
-- Verificar RLS
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Ver policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Ver índices
SELECT * FROM pg_indexes WHERE schemaname = 'public';
```

## Comandos Relacionados
- `@database` para migraciones
- `@security` para auditoría de seguridad
- `@supabase` para configuración
