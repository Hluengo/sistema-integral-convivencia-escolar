# Canonical Baseline — Shared Supabase Project

**Ref:** `jjzwwhnofiepvliugowr`
**Date:** 2026-07-27
**Status:** Post-Fase 0 + Fase 0.5b
**Purpose:** Documentación canónica del estado actual del proyecto Supabase compartido entre
`sistema-integral-convivencia-escolar` (Convivencia) y `registroinasistencia` (Inasistencias).

---

## 1. TABLES (28 total: 27 tablas + 1 view)

### 1.1 Convivencia Tables (tenant-aware, default `tenant_id = current_tenant_id()`)

| #   | Tabla                               | Filas | RLS | tenant_id          | Default               | FK a tenants |
| --- | ----------------------------------- | ----- | --- | ------------------ | --------------------- | ------------ |
| 1   | `causas`                            | 1     | SÍ  | UUID, NOT NULL     | `current_tenant_id()` | SÍ           |
| 2   | `bitacora_entries`                  | 1     | SÍ  | UUID, NOT NULL     | `current_tenant_id()` | SÍ           |
| 3   | `checklist_items`                   | 30    | SÍ  | UUID, NOT NULL     | `current_tenant_id()` | SÍ           |
| 4   | `cartas_disciplinarias`             | 7     | SÍ  | UUID, NOT NULL     | `current_tenant_id()` | SÍ           |
| 5   | `etapas_disciplinarias`             | 7     | SÍ  | UUID, NOT NULL     | `current_tenant_id()` | SÍ           |
| 6   | `document_templates`                | 4     | SÍ  | UUID, NOT NULL     | `current_tenant_id()` | SÍ           |
| 7   | `document_analyses`                 | 18    | SÍ  | UUID, NOT NULL     | _none_                | SÍ           |
| 8   | `disciplinary_processes`            | 7     | SÍ  | UUID, NOT NULL     | _none_                | SÍ           |
| 9   | `disciplinary_process_files`        | 7     | SÍ  | UUID, NOT NULL     | _none_                | SÍ           |
| 10  | `disciplinary_annotations_detected` | 78    | SÍ  | UUID, NOT NULL     | _none_                | SÍ           |
| 11  | `disciplinary_rules`                | 4     | SÍ  | UUID, NOT NULL     | _none_                | SÍ           |
| 12  | `carta_events`                      | 80    | SÍ  | UUID, **NULLABLE** | _none_                | SÍ           |

### 1.2 Inasistencias Tables (is_staff() pattern, NO tenant_id column)

| #   | Tabla              | Filas | RLS | tenant_id | Notas                      |
| --- | ------------------ | ----- | --- | --------- | -------------------------- |
| 13  | `absences`         | 13    | SÍ  | NO existe | Tabla legacy Inasistencias |
| 14  | `tests`            | 0     | SÍ  | NO existe | Tabla legacy Inasistencias |
| 15  | `instant_messages` | 1     | SÍ  | NO existe | Tabla legacy Inasistencias |
| 16  | `feriados_chile`   | 0     | SÍ  | NO existe | Tabla legacy Inasistencias |

### 1.3 Hybrid Tables (ambos patrones: tenant-aware + is_staff())

| #   | Tabla                  | Filas | RLS | tenant_id          | Notas                                          |
| --- | ---------------------- | ----- | --- | ------------------ | ---------------------------------------------- |
| 17  | `profiles`             | 2     | SÍ  | UUID, **NULLABLE** | `tenant_id` y `role` son nullable (transición) |
| 18  | `courses`              | 0     | SÍ  | UUID, NOT NULL     | Sin default automático                         |
| 19  | `students`             | 808   | SÍ  | UUID, NOT NULL     | Sin default automático                         |
| 20  | `inspectorate_records` | 78    | SÍ  | UUID, NOT NULL     | `default current_tenant_id()`                  |

### 1.4 System / Shared Tables

| #   | Tabla               | Filas | RLS                          | tenant_id        |
| --- | ------------------- | ----- | ---------------------------- | ---------------- |
| 21  | `tenants`           | 1     | **NO** (advertencia crítica) | N/A (tabla raíz) |
| 22  | `audit_logs`        | 7214  | SÍ                           | NO               |
| 23  | `usage_events`      | 2     | SÍ                           | NO               |
| 24  | `coexistence_cases` | 0     | SÍ                           | NO existe        |

### 1.5 Membership Tables (Phase 2)

| #   | Tabla             | Filas | RLS | tenant_id | Notas                                         |
| --- | ----------------- | ----- | --- | --------- | --------------------------------------------- |
| 25  | `applications`    | 2     | SÍ  | N/A       | Catálogo de apps (convivencia, inasistencias) |
| 26  | `app_memberships` | 1     | SÍ  | UUID      | Membresías por app y tenant                   |

### 1.6 Views

| #   | Vista                  | Filas (aprox) | Definición                                                                                                                                                                                 |
| --- | ---------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 27  | `membership_readiness` | —             | Vista de diagnóstico para backfill (solo service_role)                                                                                                                                     |
| 28  | `teacher_public_view`  | ~13           | `SELECT a.id, s.full_name, c.name, c.level, a.start_date, a.end_date, a.status, a.observation FROM absences a JOIN students s ON s.id = a.student_id JOIN courses c ON c.id = s.course_id` |

**Nota sobre `teacher_public_view`:** No filtra por `tenant_id` porque `absences` no tiene la columna. Depende de RLS en las tablas base (`students`, `courses`) para aislamiento. GRANT `SELECT` a `authenticated` únicamente.

**Nota sobre `membership_readiness`:** Vista de diagnóstico para clasificar perfiles por categoría de membresía. Solo accesible por service_role y postgres.

---

## 2. RLS POLICIES (84 en public + 14 en storage = 98 total)

### 2.1 Patrón Convivencia: `tenant_id = current_tenant_id()`

Todas las tablas de Convivencia usan RLS con roles `{public}` (ejecutan como anon/auth por igual) y filtran por:

```sql
tenant_id = current_tenant_id()
```

**Tablas con este patrón puro (4 políticas c/u: SELECT, INSERT, UPDATE, DELETE):**

- `bitacora_entries`, `cartas_disciplinarias`, `checklist_items`, `etapas_disciplinarias`, `inspectorate_records`

**Tablas con políticas adicionales por rol (`current_app_role()`):**

- `causas` — DELETE/INSERT/UPDATE restringido a ciertos roles (admin, direccion, convivencia, inspectoria, profesor_jefe, teacher, staff)
- `document_templates` — DELETE solo admin/direccion
- `courses` — DELETE solo admin/direccion

**Tablas con política ALL (una política cubre SELECT+INSERT+UPDATE+DELETE):**

- `disciplinary_annotations_detected` — `tenant_detected_annotations`
- `disciplinary_process_files` — `tenant_files`
- `disciplinary_processes` — `tenant_processes`
- `disciplinary_rules` — `tenant_rules`
- `document_analyses` — `tenant_analyses`

**`carta_events`** — solo SELECT e INSERT (eventos de solo lectura después de creados).

### 2.2 Patrón Inasistencias: `is_staff()`

Todas las tablas de Inasistencias usan RLS con roles `{authenticated}` y filtran por:

```sql
is_staff()
```

**Tablas (4 políticas c/u: staff INSERT, staff SELECT, staff UPDATE, superuser DELETE):**

- `absences`, `tests`, `feriados_chile`

**`instant_messages`** — INSERT adicional: `created_by = auth.uid()`.

### 2.3 Patrón Híbrido (ambos patrones simultáneos)

**`courses`** — 7 políticas: 4 tenant-aware (public) + 3 staff (authenticated) + 1 superuser DELETE.
**`students`** — 7 políticas: 4 tenant-aware (public) + 3 staff (authenticated) + 1 superuser DELETE.
**`inspectorate_records`** — 8 políticas: 4 tenant-aware (public) + 3 staff (authenticated) + 1 superuser DELETE.
**`profiles`** — 10 políticas: 4 tenant-aware (public, con role checks en DELETE/INSERT) + 4 staff/superuser (authenticated) + `p_profiles_self_select`.

### 2.4 Otras políticas

**`audit_logs`** — 2 políticas: staff INSERT, superuser SELECT.
**`usage_events`** — 2 políticas: INSERT propio, SELECT admin/direccion.

### 2.5 Storage Policies (14 en `storage.objects`)

| Bucket                   | Políticas                                                                                | Tenant-aware                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `documents`              | 6: SELECT legacy (absences/), SELECT tenant, INSERT tenant, UPDATE tenant, DELETE tenant | SÍ (`(storage.foldername(name))[1] = current_tenant_id()::text`)                                          |
| `documentos_convivencia` | 2: INSERT auth, DELETE auth                                                              | NO (solo `bucket_id = 'documentos_convivencia'`)                                                          |
| `anotaciones`            | 3: SELECT, INSERT, DELETE                                                                | SÍ (`(storage.foldername(name))[1] = current_tenant_id()::text`)                                          |
| `disciplinary-processes` | 4: SELECT, INSERT, UPDATE, DELETE                                                        | SÍ (`(storage.foldername(name))[1] IN (SELECT tenant_id::text FROM profiles WHERE user_id = auth.uid())`) |

---

## 3. FUNCTIONS (29 signatures, 28 unique names)

### 3.1 Helper Functions (seguridad y tenant)

| Función               | Return  | Lang    | SECURITY | search_path       | Grants                   | App           |
| --------------------- | ------- | ------- | -------- | ----------------- | ------------------------ | ------------- |
| `app_role()`          | text    | sql     | INVOKER  | —                 | public/anon/auth/service | Convivencia   |
| `current_app_role()`  | text    | sql     | DEFINER  | `public`          | public/anon/auth/service | Convivencia   |
| `current_role()`      | text    | sql     | DEFINER  | `public`          | anon/auth/service        | Inasistencias |
| `current_tenant_id()` | uuid    | plpgsql | DEFINER  | `public`          | anon/auth/service        | Convivencia   |
| `is_staff()`          | boolean | sql     | INVOKER  | `public`          | public/anon/auth/service | Inasistencias |
| `is_superuser()`      | boolean | sql     | INVOKER  | `public`          | public/anon/auth/service | Inasistencias |
| `is_management()`     | boolean | sql     | INVOKER  | —                 | public/anon/auth/service | Inasistencias |
| `set_tenant_id(uuid)` | void    | plpgsql | DEFINER  | `public, pg_temp` | service_role             | Convivencia   |

### 3.2 Trigger Functions

| Función                               | Return  | Lang    | SECURITY | search_path       | Grants                   |
| ------------------------------------- | ------- | ------- | -------- | ----------------- | ------------------------ |
| `handle_new_user()`                   | trigger | plpgsql | DEFINER  | `public, pg_temp` | service_role             |
| `sync_tenant_to_jwt()`                | trigger | plpgsql | DEFINER  | `public`          | public/anon/auth/service |
| `process_audit_log()`                 | trigger | plpgsql | DEFINER  | `public, pg_temp` | service_role             |
| `audit_logs_sync_actor_columns()`     | trigger | plpgsql | INVOKER  | —                 | public/anon/auth/service |
| `touch_instant_messages_updated_at()` | trigger | plpgsql | INVOKER  | `public`          | public/anon/auth/service |
| `update_updated_at_column()`          | trigger | plpgsql | INVOKER  | —                 | public/anon/auth/service |

### 3.3 Business Logic Functions

| Función                                           | Return | Lang    | SECURITY | Grants                   | App           |
| ------------------------------------------------- | ------ | ------- | -------- | ------------------------ | ------------- |
| `generate_process_number(uuid)`                   | text   | plpgsql | DEFINER  | public/anon/auth/service | Convivencia   |
| `get_suggested_letter_type(int,int,int,uuid)`     | text   | plpgsql | DEFINER  | public/anon/auth/service | Convivencia   |
| `get_annotation_stage_counts()`                   | TABLE  | sql     | DEFINER  | auth/service             | Convivencia   |
| `get_student_annotation_summary()`                | TABLE  | sql     | DEFINER  | auth/service             | Convivencia   |
| `get_latest_analysis(uuid)`                       | TABLE  | sql     | DEFINER  | public/anon/auth/service | Convivencia   |
| `get_absence_stats(text,uuid,date,date)`          | TABLE  | sql     | INVOKER  | public/anon/auth/service | Inasistencias |
| `get_teacher_dashboard()`                         | TABLE  | sql     | DEFINER  | public/anon/auth/service | Inasistencias |
| `get_daily_active_users(timestamptz,timestamptz)` | TABLE  | sql     | DEFINER  | public/anon/auth/service | Shared        |
| `get_usage_stats(timestamptz,timestamptz)`        | TABLE  | sql     | DEFINER  | public/anon/auth/service | Shared        |
| `count_affected_tests(uuid,date,date)`            | bigint | sql     | DEFINER  | service_role             | Inasistencias |

### 3.4 Teacher Functions (Vista Docente)

| Función                                          | Return | Lang    | SECURITY | Grants       |
| ------------------------------------------------ | ------ | ------- | -------- | ------------ |
| `teacher_get_public_absences(int,int,text)`      | TABLE  | plpgsql | DEFINER  | auth/service |
| `teacher_get_public_absences(int,int,text,uuid)` | TABLE  | plpgsql | DEFINER  | auth/service |
| `teacher_get_public_absence_detail(uuid)`        | TABLE  | sql     | DEFINER  | auth/service |
| `teacher_get_instant_messages(text,uuid,uuid)`   | TABLE  | sql     | DEFINER  | auth/service |

### 3.5 Maintenance

| Función                           | Return | Lang    | SECURITY | Grants       |
| --------------------------------- | ------ | ------- | -------- | ------------ |
| `clean_old_logs(int DEFAULT 365)` | text   | plpgsql | DEFINER  | service_role |

---

## 4. TRIGGERS (14 no-internos: 10 aplicación + 4 storage)

### 4.1 Application Triggers

| Trigger                                     | Tabla                    | Evento                              | Función                               |
| ------------------------------------------- | ------------------------ | ----------------------------------- | ------------------------------------- |
| `on_auth_user_created`                      | `auth.users`             | AFTER INSERT                        | `handle_new_user()`                   |
| `trg_profiles_sync_tenant_to_jwt`           | `profiles`               | AFTER INSERT OR UPDATE OF tenant_id | `sync_tenant_to_jwt()`                |
| `tr_audit_absences`                         | `absences`               | AFTER INSERT OR DELETE OR UPDATE    | `process_audit_log()`                 |
| `tr_audit_students`                         | `students`               | AFTER INSERT OR DELETE OR UPDATE    | `process_audit_log()`                 |
| `trg_audit_logs_sync_actor_columns`         | `audit_logs`             | BEFORE INSERT OR UPDATE             | `audit_logs_sync_actor_columns()`     |
| `trg_touch_instant_messages_updated_at`     | `instant_messages`       | BEFORE UPDATE                       | `touch_instant_messages_updated_at()` |
| `trigger_causas_updated_at`                 | `causas`                 | BEFORE UPDATE                       | `update_updated_at_column()`          |
| `trigger_disciplinary_processes_updated_at` | `disciplinary_processes` | BEFORE UPDATE                       | `update_updated_at_column()`          |
| `trigger_disciplinary_rules_updated_at`     | `disciplinary_rules`     | BEFORE UPDATE                       | `update_updated_at_column()`          |
| `update_objects_updated_at`                 | `storage.objects`        | BEFORE UPDATE                       | `storage.update_updated_at_column()`  |

### 4.2 Storage Infrastructure (internos de Supabase)

| Trigger                              | Tabla                   | Propósito                       |
| ------------------------------------ | ----------------------- | ------------------------------- |
| `enforce_bucket_name_length_trigger` | `storage.buckets`       | Validar longitud nombre bucket  |
| `protect_buckets_delete`             | `storage.buckets`       | Proteger eliminación de buckets |
| `protect_objects_delete`             | `storage.objects`       | Proteger eliminación de objetos |
| `tr_check_filters`                   | `realtime.subscription` | Validar filtros Realtime        |

**Validación:** Solamente 1 trigger no-interno en `auth.users` (`on_auth_user_created`). No hay triggers redundantes.
**`handle_new_user`** NO usa `raw_user_meta_data` — solo inserta `user_id` y `email` desde `NEW`.

---

## 5. STORAGE (4 buckets, todos privados)

| Bucket                   | Privado | File Size Limit | MIME Types                | Tenant Isolation                                     | Objetos                   |
| ------------------------ | ------- | --------------- | ------------------------- | ---------------------------------------------------- | ------------------------- |
| `documents`              | SÍ      | 5 MB            | PDF, DOC, DOCX, JPEG, PNG | Por carpeta raíz (`tenant_id/`) + legado `absences/` | ~215 (148 en `absences/`) |
| `documentos_convivencia` | SÍ      | 50 MB           | PDF, DOC, DOCX, JPEG, PNG | **NO** (solo auth)                                   | —                         |
| `anotaciones`            | SÍ      | 10 MB           | PDF, MD, TXT              | Por carpeta raíz (`tenant_id/`)                      | —                         |
| `disciplinary-processes` | SÍ      | 10 MB           | PDF                       | Por carpeta raíz (`tenant_id/`)                      | —                         |

**Nota:** `documents/absences/` contiene 148 objetos legacy del sistema de Inasistencias anterior. Estos son accesibles vía `p_documents_legacy_select` que requiere `is_staff()`.

---

## 6. INDEXES (76 total)

Cobertura completa:

- PK en todas las tablas (24)
- `tenant_id` indexado en todas las tablas que lo tienen (12)
- Índices compuestos clave: `(tenant_id, student_id)`, `(tenant_id, course_id)`, `(tenant_id, fecha_ultima_actualizacion DESC)`
- Índices funcionales: `idx_disciplinary_rules_unique_threshold` (con COALESCE)
- Índices GIN: `idx_cartas_disciplinarias_content_snapshot_gin`
- Índices únicos compuestos: `idx_disciplinary_files_storage_path` (tenant_id, storage_path), `idx_disciplinary_processes_number` (process_number, tenant_id)

---

## 7. LEGACY DEBT

### 7.1 Tablas sin `tenant_id` (riesgo de fuga cross-tenant)

| Tabla               | Filas | Riesgo                                 |
| ------------------- | ----- | -------------------------------------- |
| `absences`          | 13    | ALTO — datos de estudiantes sin tenant |
| `tests`             | 0     | BAJO — sin datos                       |
| `instant_messages`  | 1     | MEDIO — mensajes sin tenant            |
| `feriados_chile`    | 0     | BAJO — datos públicos                  |
| `coexistence_cases` | 0     | BAJO — tabla abandonada, 0 filas       |

### 7.2 Nullables Transicionales

| Columna                       | Problema                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `profiles.tenant_id` NULL     | Temporal para migración; impide RLS por tenant para perfiles sin tenant asignado |
| `profiles.role` NULL          | Temporal; `current_role()` devuelve 'teacher' como fallback                      |
| `carta_events.tenant_id` NULL | Columna agregada sin NOT NULL; 80 eventos podrían tener NULL                     |

### 7.3 Storage Legacy

| Item                                          | Detalle                                                 |
| --------------------------------------------- | ------------------------------------------------------- |
| 148 objetos en `documents/absences/`          | Archivos legacy del sistema anterior de inasistencias   |
| `documentos_convivencia` sin tenant isolation | Bucket que solo filtra por autenticación, no por tenant |

### 7.4 Funciones Problemáticas

| Función                                     | Problema                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| `is_management()`                           | Referencia `profiles.id` (columna inexistente — PK es `user_id`)       |
| `teacher_get_public_absences` (2 overloads) | Sobrecarga confusa; 3 params vs 4 params                               |
| `get_teacher_dashboard()`                   | Depende de `teacher_dashboard_absences` (vista o tabla no documentada) |

### 7.5 `tenants` sin RLS

**CRÍTICO:** La tabla `tenants` (1 fila) no tiene RLS habilitado. Aunque solo hay 1 tenant, cualquier usuario con la anon key podría modificarla.

---

## 8. FASE 0 — CLOSED

**Objetivo:** Establecer base multi-tenant funcional con RLS, migraciones y JWT sync.

### Logros

1. **Tabla `tenants`** creada con slug único
2. **Columna `tenant_id`** agregada a 16 tablas con FK a `tenants.id`
3. **Default `current_tenant_id()`** en 7 tablas de Convivencia
4. **Función `current_tenant_id()`** implementada con JWT fast-path + fallback a profiles
5. **Trigger `sync_tenant_to_jwt()`** sincroniza `tenant_id` al `raw_app_meta_data` de `auth.users`
6. **RLS policies** implementadas en los 3 patrones (tenant-aware, is_staff, híbrido)
7. **Migraciones aplicadas:** `20260717001_add_tenant_rls.sql`, `20260717002_jwt_tenant_claim.sql`, `20260717003_performance_indexes.sql`
8. **76 índices** creados/verificados para rendimiento multi-tenant
9. **Storage policies** implementadas para `documents`, `anotaciones`, `disciplinary-processes`
10. **`set_tenant_id()`** función para configuración programática de tenant

---

## 9. FASE 0.5b — CLOSED

**Objetivo:** Extender tenant-awareness al módulo de procesos disciplinarios (document processing pipeline).

### Logros

1. **Tablas `disciplinary_processes`, `disciplinary_process_files`, `disciplinary_annotations_detected`, `disciplinary_rules`, `document_analyses`** verificadas con `tenant_id` y RLS
2. **RLS policies ALL** (una política que cubre todas las operaciones) para tablas de procesos
3. **Storage bucket `disciplinary-processes`** con RLS tenant-aware por carpeta
4. **Políticas storage** para disciplinary-processes: SELECT, INSERT, UPDATE, DELETE con verificación de tenant
5. **Índices** compuestos y de búsqueda para procesos disciplinarios
6. **Función `generate_process_number()`** secuencial por año+tenant
7. **Documentación** del pipeline de procesamiento con parser versions
8. **Validación de columnas `raw_text` y `normalized_text`** en annotations_detected

---

## 10. PROPIEDAD

| Aspecto                                                                     | Dueño                   |
| --------------------------------------------------------------------------- | ----------------------- |
| Schema y RLS                                                                | Supabase Architect      |
| Tablas Convivencia (`causas`..`carta_events`)                               | @convivencia / @backend |
| Tablas Inasistencias (`absences`..`feriados_chile`)                         | @inasistencias          |
| Tablas Híbridas (`students`, `courses`, `profiles`, `inspectorate_records`) | Compartido              |
| Procesos Disciplinarios (`disciplinary_*`)                                  | @convivencia            |
| Storage                                                                     | @supabase-architect     |
| Funciones helper (`current_tenant_id`, `is_staff`, etc.)                    | @supabase-architect     |

---

## 11. NEXT STEPS

### Phase 2 — COMPLETED (reconciliada 2026-07-28)

- ✅ Tabla `applications` creada (code, name, is_active)
- ✅ Tabla `app_memberships` creada (user_id, application_code, tenant_id, role)
- ✅ Membresías iniciales backfilled (teacher → inasistencias)
- ✅ RLS policies correctas (least-privilege, sin USING(true) en escritura)
- ✅ Helpers SECURITY DEFINER (`current_user_memberships`, `has_app_access`)
- ✅ Feature flag `VITE_APP_MEMBERSHIPS_ENABLED=false` en ambos repos
- ⚠️ Staff excluido del backfill (requiere decisión manual)
- ⏳ Enforcement no conectado a login (pendiente Fase 3)

### Phase 3 — Teacher Access Tokens + Vista Docente Restoration

- Implementar `teacher_access_tokens` para acceso sin login
- Restaurar `teacher_public_view` con tenant-awareness
- Refactorizar overloads de `teacher_get_public_absences` a una sola función

### Phase 4 — Storage Migration

- Mover 148 objetos de `documents/absences/` a bucket `absences` (o subcarpeta tenant-aware)
- Agregar tenant isolation a `documentos_convivencia`
- Eliminar `p_documents_legacy_select`
- Considerar migración a bucket público separado para `feriados_chile`

### Phase 5 — Legacy Retirement

- `coexistence_cases`: confirmar sin código consumidor → DROP
- `profiles.tenant_id` → NOT NULL (poblar todos los registros existentes)
- `profiles.role` → NOT NULL (poblar todos los registros existentes)
- `carta_events.tenant_id` → NOT NULL (poblar NULLs existentes)
- Agregar `tenant_id` a `absences`, `tests`, `instant_messages`
- Habilitar RLS en `tenants` con política de solo SELECT para authenticated

### Tech Debt (no planificado)

- Corregir `is_management()` (referencia `profiles.id` inexistente)
- Unificar `teacher_get_public_absences` overloads
- Documentar `teacher_dashboard_absences` (vista/materializada)
