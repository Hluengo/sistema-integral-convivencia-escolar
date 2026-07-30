# Plan de Rollback

## Principios generales

- Todo cambio relevante debe poder revertirse
- Antes de modificar datos reales, respaldar
- Mantener un commit estable de referencia
- Documentar el impacto esperado de cada rollback

## Rollback de codigo

1. Identificar el commit anterior estable: `git log --oneline -5`
2. Revertir con `git revert <commit-hash>` (preferido) o `git reset --hard <commit-hash>`
3. Verificar que el revert no introduzca conflictos
4. Ejecutar quality gate post-rollback
5. Hacer push del revert

**Prohibido**: `git reset --hard` en ramas compartidas sin coordinacion

## Rollback de Vercel

1. Ir a Vercel Dashboard > Deployments
2. Identificar el ultimo deployment estable
3. Usar "Promote to Production" en ese deployment
4. Verificar que la URL productiva cargue correctamente
5. Revisar errores post-rollback

## Rollback de Supabase (migraciones)

1. Toda migracion debe tener su comando DOWN documentado
2. Ejecutar `supabase db reset` solo en local
3. Para produccion, aplicar el SQL DOWN manualmente
4. Verificar integridad de datos post-rollback
5. Verificar RLS policies post-rollback

## Respaldo antes de modificaciones

Antes de ejecutar en Produccion:

- DDL (ALTER, DROP, CREATE): respaldar esquema actual
- DML (UPDATE, DELETE): respaldar datos afectados con SELECT INTO temporal
- RLS: respaldar policies actuales
- Storage: respaldar buckets y politicas

## Verificacion post-rollback

- [ ] Tipo: 0 errores de TypeScript
- [ ] Tests: pasan todos
- [ ] Build: compila correctamente
- [ ] Vercel: deployment READY
- [ ] URL productiva: responde 200
- [ ] Auth: login funciona
- [ ] RLS: policies activas
- [ ] Datos: no hay perdida ni corrupcion
