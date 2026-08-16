---
name: postgres-review
description: Revisa queries PostgreSQL: performance, índices, RLS, optimización. Trigger: PostgreSQL, SQL, query, índices, optimización.
---

# PostgreSQL Review

Guía para revisar y optimizar PostgreSQL.

## Checklist de Revisión

### 1. Queries
- [ ] Sin SELECT *
- [ ] JOINs optimizados
- [ ] WHERE indexado
- [ ] LIMIT aplicado
- [ ] Subqueries evitadas cuando es posible

### 2. Índices
- [ ] Índices en columnas de JOIN
- [ ] Índices en columnas de WHERE frecuente
- [ ] Índices compuestos cuando aplica
- [ ] Sin índices excesivos

### 3. Seguridad
- [ ] RLS habilitado
- [ ] Policies específicas
- [ ] Sin permisos excesivos
- [ ] Service role solo server-side

### 4. Performance
- [ ] EXPLAIN ANALYZE en queries lentas
- [ ] Sin N+1 queries
- [ ] Batch operations
- [ ] Connection pooling

### 5. Mantenibilidad
- [ ] Nombres descriptivos
- [ ] Comentarios en queries complejas
- [ ] Migraciones versionadas
- [ ] Backups configurados

## Herramientas
```sql
-- Analizar query
EXPLAIN ANALYZE SELECT ...;

-- Ver índices
SELECT * FROM pg_indexes WHERE tablename = 'causas';

-- Ver queries lentas
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

## Supabase
- Usar Supabase CLI para migraciones
- Verificar RLS policies
- Monitorear uso de Storage
- Revisar Realtime subscriptions

## Comandos Relacionados
- `@database` para migraciones
- `@supabase-audit` para Supabase
- `@postgres-review` para PostgreSQL
