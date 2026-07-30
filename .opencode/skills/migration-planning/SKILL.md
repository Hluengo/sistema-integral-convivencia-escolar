---
name: migration-planning
description: Diseno seguro de cambios de base de datos con respaldo y reversibilidad
agent: data-architect
---

# Migration Planning Skill

## Separacion de cambios

1. **Interfaz**: componentes, formularios
2. **Servicios**: hooks, API calls
3. **Esquema**: tablas, columnas, tipos
4. **Migraciones**: archivos SQL incrementales
5. **Reparacion**: datos historicos (solo con respaldo)

## Requisitos de toda migracion

- Reversible cuando sea posible (siempre tener DOWN)
- Preservar tenant_id
- Considerar RLS policies
- Incluir verificacion previa y posterior
- No eliminar informacion
- Respetar datos existentes

## Prohibido sin confirmacion

- ALTER TABLE que afecte datos
- DROP COLUMN
- Cambios en RLS de tablas con datos
- TRUNCATE o DELETE masivo
- Modificar buckets de Storage con datos
