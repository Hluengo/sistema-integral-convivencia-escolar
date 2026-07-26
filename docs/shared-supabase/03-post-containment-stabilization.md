# Post-Containment Stabilization — Fase 0.5b

> **Status:** ✅ Cerrada — Aplicada y validada en remoto
> **Fecha de cierre:** 2026-07-27

## Precondiciones

Fase 0 (emergency containment) ya aplicada y validada en remoto:

1. `20260726000001_emergency_anon_data_containment.sql` ✅
2. `20260726000003_revoke_anon_sensitive_rpc_execute.sql` ✅
3. `20260726000002_security_definer_search_path_hardening.sql` ✅
4. `20260726000004_revoke_unsafe_security_definer_execute.sql` ✅

## Estado remoto actual (post-Fase 0)

| Componente                                                                                          | Estado                                                      |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `current_tenant_id()`                                                                               | Retorna NULL sin auth, no usa UUID default                  |
| anon SELECT en tablas                                                                               | Revocado                                                    |
| anon EXECUTE en RPC sensibles                                                                       | Revocado                                                    |
| authenticated/service_role EXECUTE                                                                  | Conservado                                                  |
| Buckets (documents, documentos_convivencia, anotaciones, disciplinary-processes)                    | Todos `public=false`                                        |
| SECURITY DEFINER functions (clean_old_logs, count_affected_tests, process_audit_log, set_tenant_id) | `search_path=public, pg_temp`                               |
| Profiles RLS                                                                                        | Híbrido: legacy (profiles_tenant__) + Fase 0 (p_profiles__) |

## Problemas detectados (por corregir)

### 1. `handle_new_user()` inseguro

- Lee `raw_user_meta_data` para `tenant_id` y `role`
- Default `tenant_id` = `00000000-0000-0000-0000-000000000001`
- Default `role` = `'inspectoria'`
- Sin `pg_temp` en `search_path`
- Drive: nuevo perfil creado con tenant/role de cliente → violación de seguridad

### 2. Trigger duplicado en `auth.users`

- `on_auth_user_created` (Convivencia) + `on_auth_user_created_profile` (Inasistencias)
- `handle_new_user_profile()` intenta insertar `(user_id, role='teacher')` sin `tenant_id`
- Falla con NOT NULL violation porque `profiles.tenant_id` es NOT NULL

### 3. `profiles.tenant_id` y `profiles.role` NOT NULL

- No permiten crear perfil mínimo `(user_id, email)` sin acceso configurado
- No hay DEFAULT para ninguna columna

### 4. Bucket `documents` sin aislamiento tenant

- Policies actuales: solo staff por rol (`is_staff()`, `role IN ('staff','superuser')`)
- 149 objetos legacy en `absences/` sin prefijo tenant
- No hay policies de tenant-aware para nuevos objetos

### 5. Convivencia: 7 tablas sin DEFAULT `current_tenant_id()`

- Todos los inserts pasan `tenant_id` explícito → bajo riesgo
- DEFAULT sería defensa secundaria fail-closed

### 6. Inasistencias: `useAuth` no resuelve `tenant_id`

- Solo resuelve `role`
- `inspectorateService` omitía `tenant_id` en inserts

## Migraciones pendientes (Fase 0.5b)

| Migración | Descripción       | Depende de | Hash SHA-256                                                       |
| --------- | ----------------- | ---------- | ------------------------------------------------------------------ |
| 00001     | profiles nullable | —          | `041C764D3E6311DCDB514305D567A618374A70BF58733BFEE577C1EAD2E7C4F7` |
| 00002     | trigger canónico  | 00001      | `213E40158F0F7A7BF02B2189110C5F1BFB2A1B6AB6C2019A23BC3F76B18E59E6` |
| 00003     | tenant defaults   | 00002      | `F7D2102965687B6C3BD8091A67C7056C31225C5AA52517C048D1B4937930BDFE` |
| 00004     | documents RLS     | 00003      | `C29010E2543892A108A2A2FDBCADAA361D5E1EA53DE39C7F28666173C6642303` |

### Orden de aplicación

```
00001 → 00002 → 00003 → 00004
```

### Consultas post-aplicación

```sql
-- Verificar nullable
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name IN ('tenant_id', 'role');

-- Verificar trigger único
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;

-- Verificar DEFAULTs
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_default IS NOT NULL
  AND column_name = 'tenant_id';

-- Verificar policies documents
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname LIKE 'p_documents_%';
```

### Criterios de detención

- `profiles.tenant_id` sigue NOT NULL → DETENER
- Más de un trigger activo en `auth.users` → DETENER
- `handle_new_user()` lee `raw_user_meta_data` → DETENER
- Bucket documents tiene `public=true` → DETENER
- Policy con `USING(true)` o `WITH CHECK(true)` en documents → DETENER
- Tests fallan en cualquiera de los dos repos → DETENER

## Riesgos residuales

1. **Objetos legacy en `absences/`:** 148 objetos sin prefijo tenant. Se leen via signed URL vinculada a `absences.tenant_id`. Si la tabla absences no tiene tenant_id, la resolución falla. Actualmente `absences` NO tiene columna `tenant_id`.
2. **`document_templates` service_role PATCH:** Templates se actualizan desde servidor con `service_role`, que bypass RLS. El DEFAULT `current_tenant_id()` mitiga solo inserción, no actualización. Riesgo bajo porque solo admin puede PUT.
3. **`tenants` sin RLS:** `tenants` tiene RLS deshabilitado (advertencia de Supabase). No se aborda en Fase 0.5b.

## Tests manuales post-aplicación

1. Registrar nuevo usuario → verificar perfil creado con `tenant_id=NULL, role=NULL`
2. Asignar tenant y role desde app → verificar UPDATE en profiles
3. Subir archivo a documents → verificar path con prefijo tenant
4. Leer objeto legacy en absences/ → verificar acceso staff
5. Insert a cada tabla con tenant defaults → omitir tenant_id → verificar error FK NOT NULL
