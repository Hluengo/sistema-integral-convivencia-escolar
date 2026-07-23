# 06 — Permissions (RLS + Roles)

> **Referencia detallada:** `docs/architecture/security.md`, `docs/architecture/supabase.md`

## Role Hierarchy

```
admin (full access)
  └── direccion (CRUD, no delete destructivo)
      └── convivencia (CRUD causas + anotaciones)
          └── inspectoria (CRUD inspectorate_records)
              └── profesor_jefe (su curso)
                  └── teacher (solo lectura)
```

## RLS Policy Map

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| tenants | propio | admin | admin/direccion | admin |
| profiles | propio + same tenant | admin/direccion | propio + admin/direccion | admin/direccion |
| causas | same tenant | staff | staff | admin/direccion |
| bitacora_entries | same tenant | same tenant | same tenant | same tenant |
| checklist_items | same tenant | same tenant | same tenant | same tenant |
| inspectorate_records | same tenant | same tenant | same tenant | same tenant |
| cartas_disciplinarias | same tenant | same tenant | same tenant | same tenant |
| etapas_disciplinarias | same tenant | same tenant | same tenant | same tenant |
| students | same tenant | same tenant | same tenant | admin/direccion |
| courses | same tenant | same tenant | same tenant | admin/direccion |
| document_templates | same tenant | same tenant | same tenant | admin/direccion |
| document_analyses | same tenant | same tenant | same tenant | same tenant |
| disciplinary_processes | same tenant | same tenant | same tenant | same tenant |
| disciplinary_process_files | same tenant | same tenant | same tenant | same tenant |
| disciplinary_annotations_detected | same tenant | same tenant | same tenant | same tenant |
| disciplinary_rules | same tenant | same tenant | same tenant | same tenant |
| usage_events | admin/direccion | propio | — | — |

## RLS Functions

```sql
-- Fast path: lee tenant_id del JWT (sin query a DB)
current_tenant_id() → UUID
  └── auth.jwt() -> 'app_metadata' ->> 'tenant_id'
  └── Fallback: SELECT tenant_id FROM profiles

-- Role check
current_app_role() → TEXT
  └── SELECT role FROM profiles WHERE user_id = auth.uid()

-- Staff check
is_staff() → BOOLEAN
  └── current_app_role() IN (staff, admin, direccion, ...)
```

## Trigger: JWT Sync

```sql
TRIGGER trg_profiles_sync_tenant_to_jwt
  ON profiles AFTER INSERT OR UPDATE OF tenant_id
  EXECUTE FUNCTION sync_tenant_to_jwt()
```
Sincroniza `tenant_id` a `auth.users.raw_app_meta_data` para JWT fast path.
