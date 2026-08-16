# Fase 0 — Contención de acceso anónimo en Supabase compartido

## Resumen ejecutivo

Se detectó una fuga de datos **remotamente verificada** en el proyecto Supabase compartido:

- `current_tenant_id()` retornaba el tenant default (`00000000-0000-0000-0000-000000000001`) para usuarios no autenticados.
- Las políticas RLS tenant-aware (`tenant_id = current_tenant_id()`) autorizaban por error a `anon` a leer tablas escolares.
- `p_courses_public_select USING (true)` permitía lectura pública de cursos.
- `p_documents_public_read` y `p_docs_conv_public_read` exponían archivos de storage a `anon`/`public`.
- El bucket `documentos_convivencia` estaba configurado como público.
- Políticas `Allow public ...` con `USING (true)` / `WITH CHECK (true)` existían en `absences`, `audit_logs`, `coexistence_cases`, `instant_messages`, `tests`, `feriados_chile` y `profiles`.
- Los RPCs `get_student_annotation_summary()` y `get_annotation_stage_counts()` estaban accesibles para `anon` y exponían datos personales.
- Los RPCs docentes (`teacher_get_public_absences`, `teacher_get_public_absence_detail`, `teacher_get_instant_messages`) tenían overloads múltiples que provocaban `300 Multiple Choices` y permanecían accesibles a `anon`.
- Los overloads duplicados **no se eliminan en Fase 0**. `anon` pierde EXECUTE, pero los usuarios autenticados pueden seguir recibiendo `300 Multiple Choices` de PostgREST. La corrección definitiva ocurrirá en la fase de RPC docente tokenizado.
- Funciones `SECURITY DEFINER` (`clean_old_logs`, `count_affected_tests`, `process_audit_log`, `set_tenant_id`) tenían `search_path` vacío.

## Alcance de esta fase

Esta fase es **únicamente contención**. No implementa la unificación completa de roles, `app_memberships`, `teacher_access_tokens` ni la tenantización de tablas de Inasistencias.

## Archivos creados

- `supabase/diagnostics/shared_supabase_preflight.sql`
- `supabase/migrations/20260726000001_emergency_anon_data_containment.sql`
- `supabase/migrations/20260726000002_security_definer_search_path_hardening.sql`
- `supabase/migrations/20260726000003_revoke_anon_sensitive_rpc_execute.sql`
- `docs/shared-supabase/00-emergency-containment.md` (este archivo)
- `docs/shared-supabase/01-remote-preflight-instructions.md`
- `docs/shared-supabase/02-emergency-validation-checklist.md`

## Cambios contenidos en la migración de emergencia

### A. `current_tenant_id()`

- Retorna `NULL` si `auth.uid()` es `NULL`.
- Para usuarios autenticados, lee `app_metadata.tenant_id` del JWT, valida formato UUID y hace fallback a `profiles.tenant_id`.
- No usa `raw_user_meta_data`.
- No usa UUID fijo como fallback.
- `SECURITY DEFINER` con `search_path = public`.
- `GRANT EXECUTE` solo a `authenticated`.

### B. Tablas escolares

`REVOKE ALL` a `anon` y `PUBLIC` sobre:

- `tenants`
- `courses`
- `students`
- `causas`
- `bitacora_entries`
- `checklist_items`
- `cartas_disciplinarias`
- `etapas_disciplinarias`
- `inspectorate_records`
- `document_templates`
- `document_analyses`
- `disciplinary_processes`
- `disciplinary_process_files`
- `disciplinary_annotations_detected`
- `disciplinary_rules`
- `carta_events`
- `audit_logs`
- `profiles`
- `absences`
- `tests`
- `instant_messages`
- `coexistence_cases`
- `feriados_chile`
- `usage_events`

Los privilegios de `authenticated` se conservan en esta fase.

### C. Políticas públicas abiertas

Elimina las siguientes policies detectadas en el remoto con `USING (true)` / `WITH CHECK (true)` para roles `public`:

- `public.absences`: `Allow public insert absences`, `Allow public read absences`
- `public.audit_logs`: `Allow public insert audit_logs`, `Allow public read audit_logs`
- `public.coexistence_cases`: `Allow public insert cases`, `Allow public insert coexistence_cases`, `Allow public read cases`, `Allow public read coexistence_cases`, `Permitir actualización pública de casos`, `Permitir inserción pública de casos`, `Permitir lectura pública de casos`
- `public.feriados_chile`: `Allow public insert feriados_chile`, `Allow public read feriados_chile`
- `public.instant_messages`: `Allow public insert instant_messages`, `Allow public read instant_messages`, `Allow public read messages`
- `public.profiles`: `Allow public insert profiles`
- `public.tests`: `Allow public insert tests`, `Allow public read tests`
- `public.courses`: `p_courses_public_select`

No se crean policies finales tenantizadas en esta fase.

### D. RPCs con datos personales

- `get_student_annotation_summary()` → solo `authenticated`.
- `get_annotation_stage_counts()` → solo `authenticated`.

> ⚠️ El bloque `DO` de `20260726000001` no revocó las ACL directas
> de anon. Fue necesaria la migración correctiva **`20260726000003`**
> con `REVOKE` directo por firma.

### E. RPCs docentes

Todas las firmas reales detectadas en el remoto de:

- `teacher_get_public_absences`
- `teacher_get_public_absence_detail`
- `teacher_get_instant_messages`

quedan revocadas para `anon` y `PUBLIC`; se concede `EXECUTE` solo a `authenticated`.

> ⚠️ El bloque `DO` de `20260726000001` no revocó las ACL directas
> de anon para las 5 firmas docentes. Fue necesaria la migración
> correctiva **`20260726000003`** con `REVOKE` directo por firma.

> ⚠️ **Los overloads duplicados permanecen.** `anon` ya no puede invocarlos, pero los
> usuarios autenticados pueden seguir recibiendo `300 Multiple Choices` de PostgREST
> cuando existen firmas con el mismo número de parámetros. La corrección definitiva
> (RPC único o ruta explícita) ocurrirá en la fase de RPC docente tokenizado.
>
> La Vista Docente sin login quedará temporalmente deshabilitada.
> Se restaurará con tokens seguros en una fase posterior.

### F. Storage

- Buckets `documents`, `documentos_convivencia`, `anotaciones`, `disciplinary-processes` pasan a `public = false`.
- Se eliminan las políticas `p_documents_public_read` y `p_docs_conv_public_read` de `storage.objects`.
- No se borran ni renombran objetos.

## Cambios en la migración de hardening

### `supabase/migrations/20260726000002_security_definer_search_path_hardening.sql`

Preserva la lógica exacta de las funciones detectadas en el remoto y les agrega `SET search_path = public, pg_temp`:

- `clean_old_logs(days_to_keep integer DEFAULT 365)`
- `count_affected_tests(p_student_id uuid, p_start date, p_end date)`
- `process_audit_log()`
- `set_tenant_id(p_tenant_id uuid)`

**Privilegios aplicados (mínimo privilegio):**

| Función                | Revoca   | Concede | Motivo                                                                   |
| ---------------------- | -------- | ------- | ------------------------------------------------------------------------ |
| `clean_old_logs`       | `PUBLIC` | Nada    | Solo superuser; no se determina rol exacto                               |
| `count_affected_tests` | `PUBLIC` | Nada    | Interna; invocada por RPCs SECURITY DEFINER                              |
| `process_audit_log`    | `PUBLIC` | Nada    | Trigger; no requiere invocación directa                                  |
| `set_tenant_id`        | `PUBLIC` | Nada    | Permite elegir cualquier tenant sin validación. Documentado como riesgo. |

> ⚠️ `REVOKE ALL FROM PUBLIC` no eliminó las ACL directas preexistentes
> (`anon=X/postgres`, `authenticated=X/postgres`). Las 4 funciones
> conservaban grants directos a `anon` y `authenticated`.
> La migración **`20260726000004`** corrige esto con `REVOKE EXECUTE`
> específico para `anon`, `authenticated` y `PUBLIC`.

## Migración correctiva: 20260726000003

### `supabase/migrations/20260726000003_revoke_anon_sensitive_rpc_execute.sql`

**Problema:** El bloque `DO` de `20260726000001` usaba `pg_get_function_identity_arguments` para verificar la existencia de cada función antes de revocar. Aunque las firmas coincidían con el remoto, las ACL directas de `anon` no fueron revocadas. Las comprobaciones `IF EXISTS` dentro del `DO` no detectaron error, pero el `REVOKE` no tuvo efecto sobre los grants directos existentes.

**Solución:** `REVOKE EXECUTE ON FUNCTION` directo (sin bloque condicional) para las 6 firmas verificadas:

| Función                             | Firma                            |
| ----------------------------------- | -------------------------------- |
| `get_annotation_stage_counts`       | `()`                             |
| `get_student_annotation_summary`    | `()`                             |
| `teacher_get_instant_messages`      | `(text, uuid, uuid)`             |
| `teacher_get_public_absence_detail` | `(uuid)`                         |
| `teacher_get_public_absences`       | `(integer, integer, text)`       |
| `teacher_get_public_absences`       | `(integer, integer, text, uuid)` |

**Privilegios:** Solo revoca `anon` y `PUBLIC`. No modifica `authenticated`, `service_role` ni `postgres`.

**Estado:** Aplicada en producción.

## Migración correctiva: 20260726000004

### `supabase/migrations/20260726000004_revoke_unsafe_security_definer_execute.sql`

**Problema:** `20260726000002` corrigió el `search_path` de las 4 funciones SECURITY DEFINER mediante `CREATE OR REPLACE FUNCTION` y aplicó `REVOKE ALL FROM PUBLIC`. Sin embargo, las ACL directas preexistentes (`anon=X/postgres`, `authenticated=X/postgres`) permanecieron intactas:

```
{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
```

**Solución:** `REVOKE EXECUTE` directo sobre `anon`, `authenticated` y `PUBLIC` para las 4 funciones.

| Función                                | Revoca                      | Conserva               |
| -------------------------------------- | --------------------------- | ---------------------- |
| `clean_old_logs(integer)`              | anon, authenticated, PUBLIC | service_role, postgres |
| `count_affected_tests(uuid,date,date)` | anon, authenticated, PUBLIC | service_role, postgres |
| `process_audit_log()`                  | anon, authenticated, PUBLIC | service_role, postgres |
| `set_tenant_id(uuid)`                  | anon, authenticated, PUBLIC | service_role, postgres |

**Estado:** Creada localmente, pendiente de aplicación remota.

## Impacto esperado

### Convivencia

- Usuarios autenticados conservan acceso.
- Anónimos dejan de ver cursos, estudiantes, causas y documentos.
- El dashboard público (si existía) deja de mostrar datos.

### Inasistencias

- Usuarios autenticados conservan acceso.
- La Vista Docente sin login queda temporalmente fuera de servicio.
- No se afectan login, administración de ausencias ni funcionalidades staff.

## Riesgos de aplicar la migración

| Riesgo                                                        | Mitigación                                                                        |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Usuarios autenticados pierden acceso                          | `current_tenant_id()` mantiene el fast-path JWT y fallback a `profiles.tenant_id` |
| Vista Docente deja de funcionar                               | Aceptado temporalmente; se restaurará con tokens seguros                          |
| PostgREST cache                                               | La migración ejecuta `pg_notify('pgrst', 'reload schema')`                        |
| Procesos que usaban `get_student_annotation_summary` sin auth | Requieren autenticación                                                           |
| Funciones SECURITY DEFINER con search_path vacío              | Corregidas en `20260726000002_security_definer_search_path_hardening.sql`         |
| Archivos en `documentos_convivencia` dejan de ser públicos    | Se hace privado; luego se aplicará tenantización                                  |

## Orden de aplicación

### Método A: Supabase SQL Editor (web)

1. Abrir **SQL Editor** del proyecto Supabase.
2. Crear una **New query**.
3. Abrir `20260726000001_emergency_anon_data_containment.sql` en un editor local, copiar **todo** el contenido y pegarlo en el SQL Editor.
4. **Ejecutar.**
5. Si falla: guardar el error exacto. **No ejecutar `20260726000002`.**
6. Validar con las consultas de la sección "Validación post-migración 1".
7. Crear una **nueva New query**.
8. Abrir `20260726000002_security_definer_search_path_hardening.sql`, copiar **todo** el contenido y pegarlo.
9. **Ejecutar.**
10. Validar con las consultas de validación final.

### Método B: psql (local)

```bash
# Requiere conexión directa a la base de datos Supabase
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260726000001_emergency_anon_data_containment.sql

# Validar
psql "$SUPABASE_DB_URL" -f supabase/diagnostics/shared_supabase_preflight.sql

# Aplicar hardening
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260726000002_security_definer_search_path_hardening.sql

# Validación final
psql "$SUPABASE_DB_URL" -f supabase/diagnostics/shared_supabase_preflight.sql
```

> ⚠️ El comando `\i` solo funciona en `psql`, no en el SQL Editor web de Supabase.

### Transaccionalidad

Cada migración está envuelta en `BEGIN`/`COMMIT`:

| Migración        | Transacción         | Idempotente                                                                                 |
| ---------------- | ------------------- | ------------------------------------------------------------------------------------------- |
| `20260726000001` | ✅ `BEGIN`+`COMMIT` | Sí: usa `IF EXISTS`, `CREATE OR REPLACE`, `DROP POLICY IF EXISTS`. `REVOKE` es idempotente. |
| `20260726000002` | ✅ `BEGIN`+`COMMIT` | Sí: usa `CREATE OR REPLACE`. `REVOKE` de `PUBLIC` es idempotente.                           |

Si una operación falla dentro de la transacción:

- **No volver a ejecutar partes manualmente** sin revisar el estado.
- Revisar `supabase_migrations.schema_migrations` para ver si el migration name quedó registrado. Si no, el `BEGIN`/`COMMIT` garantiza que no hay cambios parciales.
- `UPDATE storage.buckets` es transaccional (no se ejecuta si falla la migración).

### Validación post-migración 1 (después de 20260726000001)

```sql
-- 1. current_tenant_id() retorna NULL para anon
SELECT auth.uid() IS NULL AND public.current_tenant_id() IS NULL AS anon_tenant_null;

-- 2. Anon sin acceso a tablas
SELECT has_table_privilege('anon', 'public.students', 'SELECT') = false AS anon_no_students;
SELECT has_table_privilege('anon', 'public.courses', 'SELECT') = false AS anon_no_courses;
SELECT has_table_privilege('anon', 'public.profiles', 'SELECT') = false AS anon_no_profiles;

-- 3. Anon no puede ejecutar RPCs sensibles
SELECT has_function_privilege('anon', 'public.get_student_annotation_summary()', 'EXECUTE') = false AS anon_no_annot_summary;
SELECT has_function_privilege('anon', 'public.teacher_get_public_absences(int,int,text)', 'EXECUTE') = false AS anon_no_absences;

-- 4. No hay policies public USING(true)
SELECT count(*) = 0 AS no_public_open_policies
FROM pg_policies
WHERE schemaname = 'public' AND roles::text ILIKE '%public%' AND (qual = 'true' OR with_check = 'true');

-- 5. Buckets privados
SELECT count(*) = 4 AS buckets_private
FROM storage.buckets
WHERE id IN ('documents','documentos_convivencia','anotaciones','disciplinary-processes') AND public = false;
```

### Validación post-migración 2 (después de 20260726000002)

Además de lo anterior:

```sql
-- Funciones SECURITY DEFINER con search_path seguro
SELECT count(*) = 4 AS all_secure
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef = true
  AND p.proname IN ('clean_old_logs','count_affected_tests','process_audit_log','set_tenant_id')
  AND EXISTS (
    SELECT 1 FROM unnest(p.proconfig) AS s
    WHERE s LIKE 'search_path=public, pg_temp%'
  );

-- Anon no puede ejecutar las funciones hardening
SELECT has_function_privilege('anon', 'public.clean_old_logs(integer)', 'EXECUTE') = false AS anon_no_clean;
SELECT has_function_privilege('anon', 'public.count_affected_tests(uuid,date,date)', 'EXECUTE') = false AS anon_no_count;
SELECT has_function_privilege('anon', 'public.set_tenant_id(uuid)', 'EXECUTE') = false AS anon_no_set_tenant;

-- Authenticated tampoco debe ejecutar las funciones hardening
SELECT has_function_privilege('authenticated', 'public.clean_old_logs(integer)', 'EXECUTE') = false AS auth_no_clean;
SELECT has_function_privilege('authenticated', 'public.count_affected_tests(uuid,date,date)', 'EXECUTE') = false AS auth_no_count;
SELECT has_function_privilege('authenticated', 'public.process_audit_log()', 'EXECUTE') = false AS auth_no_process;
SELECT has_function_privilege('authenticated', 'public.set_tenant_id(uuid)', 'EXECUTE') = false AS auth_no_set;

-- service_role y postgres conservan EXECUTE
SELECT has_function_privilege('service_role', 'public.clean_old_logs(integer)', 'EXECUTE') = true AS sr_can_clean;
SELECT has_function_privilege('postgres', 'public.clean_old_logs(integer)', 'EXECUTE') = true AS pg_can_clean;
```

## Forward-fix

Si surge algún problema, el procedimiento es:

1. No hacer rollback destructivo.
2. Crear una nueva migración que corrija el estado.
3. Validar en staging antes de producción.

## Nota sobre datos personales

Este documento y todos los archivos de Fase 0 no contienen nombres de estudiantes, RUT, correos, observaciones, nombres de archivos ni contenido de documentos.

## Estado de la ejecución — Fase 0

**Estado: ✅ Cerrada**

### Aplicadas en producción (orden real)

| #   | Migración        | Estado      | Efecto                                                                                     |
| --- | ---------------- | ----------- | ------------------------------------------------------------------------------------------ |
| 1   | `20260726000001` | ✅ Aplicada | current_tenant_id(), tablas, policies, Storage OK. RPCs REVOKE no efectivo desde DO block. |
| 2   | `20260726000003` | ✅ Aplicada | REVOKE directo de las 6 firmas RPC sensibles.                                              |
| 3   | `20260726000002` | ✅ Aplicada | search_path=public,pg_temp en 4 funciones SECURITY DEFINER. ACL directas no revocadas.     |
| 4   | `20260726000004` | ✅ Aplicada | Cierre de ACL directas anon/authenticated en 4 funciones SECURITY DEFINER.                 |

### Resultados confirmados

- `current_tenant_id()` retorna `NULL` para anon.
- anon no tiene SELECT en tablas escolares.
- anon no tiene EXECUTE en RPCs sensibles.
- No quedan policies public/anon con `USING(true)` o `WITH CHECK(true)`.
- Buckets sensibles en `public=false`.
- SECURITY DEFINER con `search_path=public, pg_temp`.
- anon y authenticated sin EXECUTE en funciones internas.
- `service_role` conserva EXECUTE.

### Riesgos residuales

| Riesgo                                  | Impacto                                                        | Plan                           |
| --------------------------------------- | -------------------------------------------------------------- | ------------------------------ |
| Overloads `teacher_get_public_absences` | PostgREST 300 para `authenticated` si no se usa ruta explícita | Fase de RPC docente tokenizado |
| Vista Docente sin login deshabilitada   | Usuarios no autenticados no ven inasistencias                  | Fase de RPC docente tokenizado |
| Tablas de Inasistencias sin `tenant_id` | No hay RLS tenant-aware en esas tablas                         | Fase 1 — reconciliación        |
| Esquema remoto no reconciliado          | Drift entre migraciones locales y remoto                       | Fase 1 — reconciliación        |
| Migraciones históricas (001, 002, 003)  | No deben aplicarse en bloque contra el remoto                  | Aplicación manual controlada   |

### Fase 1 — Reconciliación canónica ✅ Cerrada

- Inventario remoto completo (25 tablas, 28 funciones, 4 buckets, 98 policies)
- Adoption ledger: 60+ objetos clasificados por propiedad y riesgo
- Migración reconciliation: 46 migraciones locales + 9 manuales analizadas
- Baseline canónico post-Fase 0.5b documentado
- Code consumption matrix: ~60 referencias mapeadas en ambos repositorios
- Phase 2 architecture (applications + app_memberships) preparada sin aplicar
- 6 borradores de migraciones Fase 2 creados localmente
- Validación local: Convivencia lint ✅, tests ✅, build ✅; Inasistencias lint ✅, tests ✅, build ✅
- No se modificó Supabase, no se ejecutó SQL de escritura, no se hizo deploy/commit/push

**Próximo paso:** **Fase 2 — Implementación de applications + app_memberships.****
