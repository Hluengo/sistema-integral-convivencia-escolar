---
name: supabase-safe
description: Diagnostico y revision segura de Supabase - esquema, RLS, Storage, Auth, migraciones
agent: supabase-reviewer
---

# Supabase Safe Skill

## Reglas de seguridad

- **Lectura**: autonomo sin restriccion
- **Escritura (UPDATE, DELETE, ALTER, DROP)**: requiere confirmacion explicita
- **Migraciones nuevas**: revisar y confirmar antes de aplicar
- **Cambios RLS**: solo con confirmacion
- **Storage**: solo lectura por defecto
- **Auth**: solo lectura por defecto
- Nunca exponer service_role_key en frontend
- Mantener tenant_id y aislamiento multi-tenant
- Preservar privacidad de datos de estudiantes

## Comandos de revision

- `opencode db pull` para esquema actual
- Consultas SELECT para verificar datos
- Revision de RLS policies de tablas relevantes
- Revision de buckets de Storage
- Revision de migraciones pendientes

## Verificacion pre-escritura

1. Cual es el impacto en tenant_id?
2. Las RLS policies cubren el nuevo acceso?
3. Hay cambios en datos historicos?
4. La migracion es reversible?
5. Preserva la privacidad de estudiantes?
