# Canonical Object Ledger — Shared Supabase

> **Proyecto compartido:** `mjhbcqwtjzgvqssfiore` (Supabase)
> **Última actualización:** 2026-07-26
> **Propósito:** Inventario canónico de todos los objetos (tablas, funciones, storage buckets, migraciones) en el proyecto Supabase compartido entre Convivencia Escolar y Registro de Inasistencias. Cada fila documenta propiedad, estado, riesgo y acción futura acordada.

---

## Convenciones

| Columna                         | Descripción                                                                                                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objeto**                      | Nombre del objeto en la base de datos remota                                                                                                                                       |
| **Tipo**                        | TABLE \| VIEW \| FUNCTION \| STORAGE BUCKET \| MIGRATION                                                                                                                           |
| **Schema**                      | `public` salvo que se indique otra cosa                                                                                                                                            |
| **Propietario**                 | `COMPARTIDO` (responsabilidad compartida), `CONVIVENCIA`, `INASISTENCIAS`                                                                                                          |
| **App consumidora**             | `convivencia` \| `inasistencias` \| `ambas`                                                                                                                                        |
| **Creado por**                  | `postgres` \| `convivencia_migration` \| `inasistencias_migration` \| `legacy`                                                                                                     |
| **Presente remoto**             | `SÍ` \| `NO` \| `PARCIAL`                                                                                                                                                          |
| **Migración local relacionada** | Archivo(s) de migración que crearon/modificaron el objeto                                                                                                                          |
| **Tenant-aware**                | `SÍ` (tiene tenant_id y RLS por tenant) \| `NO` \| `N/A` \| `PARCIAL`                                                                                                              |
| **RLS**                         | `SÍ` \| `NO` \| row-level security habilitada                                                                                                                                      |
| **Policies**                    | Lista de políticas RLS relevantes                                                                                                                                                  |
| **Estado**                      | `CANÓNICO COMPARTIDO` \| `PROPIEDAD DE CONVIVENCIA` \| `PROPIEDAD DE INASISTENCIAS` \| `LEGACY ACTIVO` \| `LEGACY SIN USO` \| `DUPLICADO` \| `CANDIDATO A RETIRO` \| `DESCONOCIDO` |
| **Riesgo**                      | `CRÍTICO` \| `ALTO` \| `MEDIO` \| `BAJO`                                                                                                                                           |
| **Acción futura**               | `Migrar a Fase 2` \| `Tenantizar Fase 3` \| `Tokenizar Fase 3` \| `Retirar Fase 5` \| `Conservar` \| `Monitorear`                                                                  |

---

## 1. Tablas y Vistas

### 1.1 Compartidas (objetos de infraestructura multi-tenant)

| Objeto                 | Tipo  | Schema | Propietario | App consumidora                                | Creado por | Presente remoto | Migración local relacionada                      | Tenant-aware                                         | RLS | Policies                                                                                                       | Estado              | Riesgo  | Acción futura    |
| ---------------------- | ----- | ------ | ----------- | ---------------------------------------------- | ---------- | --------------- | ------------------------------------------------ | ---------------------------------------------------- | --- | -------------------------------------------------------------------------------------------------------------- | ------------------- | ------- | ---------------- |
| `tenants`              | TABLE | public | COMPARTIDO  | ambas                                          | postgres   | SÍ              | 001_init (convivencia), 001_init (inasistencias) | N/A (es el root)                                     | NO  | —                                                                                                              | CANÓNICO COMPARTIDO | CRÍTICO | Conservar        |
| `profiles`             | TABLE | public | COMPARTIDO  | ambas                                          | postgres   | SÍ              | 001_init (convivencia), 001_init (inasistencias) | PARCIAL (tenant_id NULLABLE)                         | SÍ  | p_profiles_self_select, p_profiles_superuser_select/insert/update/delete, profiles_tenant_select/insert/update | CANÓNICO COMPARTIDO | CRÍTICO | Tokenizar Fase 3 |
| `courses`              | TABLE | public | COMPARTIDO  | ambas                                          | postgres   | SÍ              | 001_init (convivencia), 001_init (inasistencias) | SÍ (tenant_id NOT NULL)                              | SÍ  | courses_tenant_select/insert/update/delete, p_courses_staff_select, p_courses_superuser_delete                 | CANÓNICO COMPARTIDO | ALTO    | Migrar a Fase 2  |
| `students`             | TABLE | public | COMPARTIDO  | ambas                                          | postgres   | SÍ              | 001_init (convivencia), 001_init (inasistencias) | SÍ (tenant_id NOT NULL)                              | SÍ  | students_tenant_select/insert/update/delete, p_students_staff_select, p_students_superuser_delete              | CANÓNICO COMPARTIDO | CRÍTICO | Migrar a Fase 2  |
| `inspectorate_records` | TABLE | public | COMPARTIDO  | convivencia (origen), inasistencias (consulta) | postgres   | SÍ              | 001_init (convivencia)                           | SÍ (tenant_id NOT NULL, DEFAULT current_tenant_id()) | SÍ  | inspectorate_tenant_select/insert/update/delete, p_inspectorate_staff_select, p_inspectorate_superuser_delete  | CANÓNICO COMPARTIDO | ALTO    | Conservar        |
| `audit_logs`           | TABLE | public | COMPARTIDO  | ambas                                          | postgres   | SÍ              | 001_init (convivencia)                           | NO                                                   | SÍ  | p_audit_logs_staff_insert, p_audit_logs_superuser_select                                                       | CANÓNICO COMPARTIDO | MEDIO   | Conservar        |
| `usage_events`         | TABLE | public | COMPARTIDO  | ambas                                          | postgres   | SÍ              | No identificada                                  | NO                                                   | SÍ  | usage_events_insert_own, usage_events_select_admin                                                             | CANÓNICO COMPARTIDO | BAJO    | Monitorear       |

### 1.2 Propiedad de Convivencia (módulo disciplinario)

| Objeto                              | Tipo  | Schema | Propietario | App consumidora | Creado por            | Presente remoto | Migración local relacionada          | Tenant-aware                                         | RLS | Policies                                               | Estado                   | Riesgo | Acción futura |
| ----------------------------------- | ----- | ------ | ----------- | --------------- | --------------------- | --------------- | ------------------------------------ | ---------------------------------------------------- | --- | ------------------------------------------------------ | ------------------------ | ------ | ------------- |
| `causas`                            | TABLE | public | CONVIVENCIA | convivencia     | convivencia_migration | SÍ              | 003_causas, 004_bitacora             | SÍ (tenant_id NOT NULL, DEFAULT current_tenant_id()) | SÍ  | causas_tenant_select/insert/update/delete              | PROPIEDAD DE CONVIVENCIA | ALTO   | Conservar     |
| `bitacora_entries`                  | TABLE | public | CONVIVENCIA | convivencia     | convivencia_migration | SÍ              | 003_causas, 004_bitacora             | SÍ (tenant_id NOT NULL, DEFAULT current_tenant_id()) | SÍ  | bitacora_tenant_select/insert/update + bitacora_tenant_delete (1D: DELETE solo admin/direccion/superadmin) | PROPIEDAD DE CONVIVENCIA | ALTO   | Conservar     |
| `checklist_items`                   | TABLE | public | CONVIVENCIA | convivencia     | convivencia_migration | SÍ              | 005_checklist                        | SÍ (tenant_id NOT NULL, DEFAULT current_tenant_id()) | SÍ  | checklist_tenant_select/insert/update + checklist_tenant_delete (1D: DELETE solo admin/direccion/superadmin) | PROPIEDAD DE CONVIVENCIA | MEDIO  | Conservar     |
| `cartas_disciplinarias`             | TABLE | public | CONVIVENCIA | convivencia     | convivencia_migration | SÍ              | 006_cartas                           | SÍ (tenant_id NOT NULL, DEFAULT current_tenant_id()) | SÍ  | cartas_tenant_select/insert/update + cartas_tenant_delete (1D: DELETE solo admin/direccion/superadmin) | PROPIEDAD DE CONVIVENCIA | MEDIO  | Conservar     |
| `etapas_disciplinarias`             | TABLE | public | CONVIVENCIA | convivencia     | convivencia_migration | SÍ              | 006_cartas                           | SÍ (tenant_id NOT NULL, DEFAULT current_tenant_id()) | SÍ  | etapas_tenant_select/insert/update + etapas_tenant_delete (1D: DELETE solo admin/direccion/superadmin) | PROPIEDAD DE CONVIVENCIA | MEDIO  | Conservar     |
| `document_templates`                | TABLE | public | CONVIVENCIA | convivencia     | convivencia_migration | SÍ              | 007_templates                        | SÍ (tenant_id NOT NULL, DEFAULT current_tenant_id()) | SÍ  | templates_tenant_select/insert/update/delete           | PROPIEDAD DE CONVIVENCIA | BAJO   | Conservar     |
| `document_analyses`                 | TABLE | public | CONVIVENCIA | convivencia     | convivencia_migration | SÍ              | Migración IA (no identificada)       | SÍ (tenant_id NOT NULL)                              | SÍ  | tenant_analyses_select/insert/update + tenant_analyses_delete (1D: DELETE solo admin/direccion/superadmin) | PROPIEDAD DE CONVIVENCIA | MEDIO  | Conservar     |
| `disciplinary_processes`            | TABLE | public | CONVIVENCIA | convivencia     | convivencia_migration | SÍ              | Migración procesos (no identificada) | SÍ (tenant_id NOT NULL)                              | SÍ  | tenant_processes_select/insert + tenant_processes_update/delete (1D: UPDATE/DELETE solo admin/direccion/superadmin) | PROPIEDAD DE CONVIVENCIA | ALTO   | Conservar     |
| `disciplinary_process_files`        | TABLE | public | CONVIVENCIA | convivencia     | convivencia_migration | SÍ              | Migración procesos (no identificada) | SÍ (tenant_id NOT NULL)                              | SÍ  | tenant_files (ALL)                                     | PROPIEDAD DE CONVIVENCIA | MEDIO  | Conservar     |
| `disciplinary_annotations_detected` | TABLE | public | CONVIVENCIA | convivencia     | convivencia_migration | SÍ              | Migración procesos (no identificada) | SÍ (tenant_id NOT NULL)                              | SÍ  | tenant_detected_annotations (ALL)                      | PROPIEDAD DE CONVIVENCIA | MEDIO  | Conservar     |
| `disciplinary_rules`                | TABLE | public | CONVIVENCIA | convivencia     | convivencia_migration | SÍ              | Migración procesos (no identificada) | SÍ (tenant_id NOT NULL)                              | SÍ  | tenant_rules_select + tenant_rules_insert/update/delete (1D: escritura solo admin/direccion/superadmin) | PROPIEDAD DE CONVIVENCIA | BAJO   | Conservar     |
| `carta_events`                      | TABLE | public | CONVIVENCIA | convivencia     | convivencia_migration | SÍ              | Migración eventos (no identificada)  | PARCIAL (tenant_id NULLABLE)                         | SÍ  | carta_events_insert_tenant, carta_events_select_tenant | PROPIEDAD DE CONVIVENCIA | BAJO   | Monitorear    |

### 1.3 Propiedad de Inasistencias

| Objeto             | Tipo  | Schema | Propietario   | App consumidora | Creado por              | Presente remoto | Migración local relacionada | Tenant-aware              | RLS | Policies                                             | Estado                     | Riesgo | Acción futura     |
| ------------------ | ----- | ------ | ------------- | --------------- | ----------------------- | --------------- | --------------------------- | ------------------------- | --- | ---------------------------------------------------- | -------------------------- | ------ | ----------------- |
| `absences`         | TABLE | public | INASISTENCIAS | inasistencias   | inasistencias_migration | SÍ              | 001_init (inasistencias)    | NO                        | SÍ  | p_absences_staff_select/insert/update/delete         | PROPIEDAD DE INASISTENCIAS | ALTO   | Tenantizar Fase 3 |
| `tests`            | TABLE | public | INASISTENCIAS | inasistencias   | inasistencias_migration | SÍ              | 001_init (inasistencias)    | NO                        | SÍ  | p_tests_staff_select/insert/update/delete            | PROPIEDAD DE INASISTENCIAS | MEDIO  | Tenantizar Fase 3 |
| `instant_messages` | TABLE | public | INASISTENCIAS | inasistencias   | inasistencias_migration | SÍ              | 001_init (inasistencias)    | NO                        | SÍ  | p_instant_messages_staff_select/insert/update/delete | PROPIEDAD DE INASISTENCIAS | BAJO   | Tenantizar Fase 3 |
| `feriados_chile`   | TABLE | public | INASISTENCIAS | inasistencias   | inasistencias_migration | SÍ              | 001_init (inasistencias)    | N/A (datos de referencia) | SÍ  | p_feriados_staff_select                              | PROPIEDAD DE INASISTENCIAS | BAJO   | Conservar         |

### 1.4 Legacy

| Objeto              | Tipo  | Schema | Propietario          | App consumidora         | Creado por | Presente remoto | Migración local relacionada | Tenant-aware | RLS | Policies                     | Estado         | Riesgo | Acción futura  |
| ------------------- | ----- | ------ | -------------------- | ----------------------- | ---------- | --------------- | --------------------------- | ------------ | --- | ---------------------------- | -------------- | ------ | -------------- |
| `coexistence_cases` | TABLE | public | CONVIVENCIA (legacy) | convivencia (histórico) | legacy     | SÍ              | Fase 0 (legacy cleanup)     | NO           | SÍ  | (todas eliminadas en Fase 0) | LEGACY SIN USO | BAJO   | Retirar Fase 5 |

### 1.5 Vistas

| Objeto                | Tipo | Schema | Propietario   | App consumidora             | Creado por              | Presente remoto | Migración local relacionada   | Tenant-aware | RLS                         | Policies                         | Estado                     | Riesgo | Acción futura |
| --------------------- | ---- | ------ | ------------- | --------------------------- | ----------------------- | --------------- | ----------------------------- | ------------ | --------------------------- | -------------------------------- | -------------------------- | ------ | ------------- |
| `teacher_public_view` | VIEW | public | INASISTENCIAS | inasistencias (API pública) | inasistencias_migration | SÍ              | Migración 012 (inasistencias) | NO           | N/A (hereda de tablas base) | Grants: authenticated=r/postgres | PROPIEDAD DE INASISTENCIAS | MEDIO  | Monitorear    |

---

## 2. Funciones

### 2.1 Compartidas / Navegación multi-tenant

| Objeto                | Tipo     | Schema | Propietario | App consumidora | Creado por | Presente remoto | Migración local relacionada | Tenant-aware | RLS | Policies | Estado              | Riesgo  | Acción futura |
| --------------------- | -------- | ------ | ----------- | --------------- | ---------- | --------------- | --------------------------- | ------------ | --- | -------- | ------------------- | ------- | ------------- |
| `current_tenant_id()` | FUNCTION | public | COMPARTIDO  | ambas           | postgres   | SÍ              | 003_role_resolution_fix     | SÍ           | —   | —        | CANÓNICO COMPARTIDO | CRÍTICO | Conservar     |
| `current_role()`      | FUNCTION | public | COMPARTIDO  | ambas           | postgres   | SÍ              | 003_role_resolution_fix     | SÍ           | —   | —        | CANÓNICO COMPARTIDO | CRÍTICO | Conservar     |
| `current_app_role()`  | FUNCTION | public | COMPARTIDO  | ambas           | postgres   | SÍ              | 003_role_resolution_fix     | SÍ           | —   | —        | CANÓNICO COMPARTIDO | CRÍTICO | Conservar     |
| `app_role()`          | FUNCTION | public | COMPARTIDO  | ambas           | postgres   | SÍ              | 003_role_resolution_fix     | SÍ           | —   | —        | CANÓNICO COMPARTIDO | CRÍTICO | Conservar     |
| `is_staff()`          | FUNCTION | public | COMPARTIDO  | ambas           | postgres   | SÍ              | 003_role_resolution_fix     | SÍ           | —   | —        | CANÓNICO COMPARTIDO | ALTO    | Conservar     |
| `is_superuser()`      | FUNCTION | public | COMPARTIDO  | ambas           | postgres   | SÍ              | 003_role_resolution_fix     | SÍ           | —   | —        | CANÓNICO COMPARTIDO | ALTO    | Conservar     |
| `is_management()`     | FUNCTION | public | COMPARTIDO  | ambas           | postgres   | SÍ              | 003_role_resolution_fix     | SÍ           | —   | —        | CANÓNICO COMPARTIDO | ALTO    | Conservar     |
| `set_tenant_id(uuid)` | FUNCTION | public | COMPARTIDO  | ambas           | postgres   | SÍ              | 003_role_resolution_fix     | SÍ           | —   | —        | CANÓNICO COMPARTIDO | CRÍTICO | Conservar     |

### 2.2 Convivencia

| Objeto                                 | Tipo     | Schema | Propietario | App consumidora | Creado por            | Presente remoto | Migración local relacionada             | Tenant-aware | RLS | Policies | Estado                   | Riesgo | Acción futura |
| -------------------------------------- | -------- | ------ | ----------- | --------------- | --------------------- | --------------- | --------------------------------------- | ------------ | --- | -------- | ------------------------ | ------ | ------------- |
| `get_student_annotation_summary(uuid)` | FUNCTION | public | CONVIVENCIA | convivencia     | convivencia_migration | SÍ              | Migración convivencia (no identificada) | SÍ           | —   | —        | PROPIEDAD DE CONVIVENCIA | MEDIO  | Conservar     |
| `get_annotation_stage_counts(uuid)`    | FUNCTION | public | CONVIVENCIA | convivencia     | convivencia_migration | SÍ              | Migración convivencia (no identificada) | SÍ           | —   | —        | PROPIEDAD DE CONVIVENCIA | BAJO   | Conservar     |
| `generate_process_number()`            | FUNCTION | public | CONVIVENCIA | convivencia     | convivencia_migration | SÍ              | Migración convivencia (no identificada) | SÍ           | —   | —        | PROPIEDAD DE CONVIVENCIA | BAJO   | Conservar     |
| `get_suggested_letter_type()`          | FUNCTION | public | CONVIVENCIA | convivencia     | convivencia_migration | SÍ              | Migración convivencia (no identificada) | N/A          | —   | —        | PROPIEDAD DE CONVIVENCIA | BAJO   | Conservar     |
| `get_latest_analysis(uuid)`            | FUNCTION | public | CONVIVENCIA | convivencia     | convivencia_migration | SÍ              | Migración convivencia (no identificada) | SÍ           | —   | —        | PROPIEDAD DE CONVIVENCIA | BAJO   | Conservar     |
| `get_teacher_dashboard(uuid)`          | FUNCTION | public | CONVIVENCIA | convivencia     | convivencia_migration | SÍ              | Migración convivencia (no identificada) | SÍ           | —   | —        | PROPIEDAD DE CONVIVENCIA | MEDIO  | Conservar     |

### 2.3 Inasistencias

| Objeto                                                | Tipo     | Schema | Propietario   | App consumidora | Creado por              | Presente remoto | Migración local relacionada               | Tenant-aware | RLS | Policies | Estado                     | Riesgo | Acción futura |
| ----------------------------------------------------- | -------- | ------ | ------------- | --------------- | ----------------------- | --------------- | ----------------------------------------- | ------------ | --- | -------- | -------------------------- | ------ | ------------- |
| `teacher_get_public_absences(date, date, uuid)`       | FUNCTION | public | INASISTENCIAS | inasistencias   | inasistencias_migration | SÍ              | Migración inasistencias (no identificada) | NO           | —   | —        | PROPIEDAD DE INASISTENCIAS | MEDIO  | Monitorear    |
| `teacher_get_public_absences(date, date, uuid, uuid)` | FUNCTION | public | INASISTENCIAS | inasistencias   | inasistencias_migration | SÍ              | Migración inasistencias (no identificada) | NO           | —   | —        | PROPIEDAD DE INASISTENCIAS | MEDIO  | Monitorear    |
| `teacher_get_public_absence_detail(uuid, uuid)`       | FUNCTION | public | INASISTENCIAS | inasistencias   | inasistencias_migration | SÍ              | Migración inasistencias (no identificada) | NO           | —   | —        | PROPIEDAD DE INASISTENCIAS | BAJO   | Monitorear    |
| `teacher_get_instant_messages(uuid, uuid)`            | FUNCTION | public | INASISTENCIAS | inasistencias   | inasistencias_migration | SÍ              | Migración inasistencias (no identificada) | NO           | —   | —        | PROPIEDAD DE INASISTENCIAS | BAJO   | Monitorear    |
| `get_absence_stats(uuid, date, date)`                 | FUNCTION | public | INASISTENCIAS | inasistencias   | inasistencias_migration | SÍ              | Migración inasistencias (no identificada) | NO           | —   | —        | PROPIEDAD DE INASISTENCIAS | MEDIO  | Monitorear    |
| `count_affected_tests(uuid, date, date)`              | FUNCTION | public | INASISTENCIAS | inasistencias   | inasistencias_migration | SÍ              | Migración inasistencias (no identificada) | NO           | —   | —        | PROPIEDAD DE INASISTENCIAS | BAJO   | Monitorear    |

### 2.4 Auditoría / Mantenimiento

| Objeto                               | Tipo     | Schema | Propietario | App consumidora       | Creado por | Presente remoto | Migración local relacionada | Tenant-aware | RLS | Policies | Estado              | Riesgo | Acción futura |
| ------------------------------------ | -------- | ------ | ----------- | --------------------- | ---------- | --------------- | --------------------------- | ------------ | --- | -------- | ------------------- | ------ | ------------- |
| `clean_old_logs(interval)`           | FUNCTION | public | COMPARTIDO  | ambas (mantenimiento) | postgres   | SÍ              | No identificada             | NO           | —   | —        | CANÓNICO COMPARTIDO | BAJO   | Conservar     |
| `process_audit_log()`                | FUNCTION | public | COMPARTIDO  | ambas (trigger)       | postgres   | SÍ              | 002_policies                | NO           | —   | —        | CANÓNICO COMPARTIDO | BAJO   | Conservar     |
| `get_usage_stats(date, date)`        | FUNCTION | public | COMPARTIDO  | ambas (admin)         | postgres   | SÍ              | No identificada             | NO           | —   | —        | CANÓNICO COMPARTIDO | BAJO   | Conservar     |
| `get_daily_active_users(date, date)` | FUNCTION | public | COMPARTIDO  | ambas (admin)         | postgres   | SÍ              | No identificada             | NO           | —   | —        | CANÓNICO COMPARTIDO | BAJO   | Conservar     |

### 2.5 Triggers (funciones internas)

| Objeto                                | Tipo               | Schema | Propietario   | App consumidora | Creado por              | Presente remoto | Migración local relacionada                           | Tenant-aware | RLS | Policies | Estado                     | Riesgo  | Acción futura |
| ------------------------------------- | ------------------ | ------ | ------------- | --------------- | ----------------------- | --------------- | ----------------------------------------------------- | ------------ | --- | -------- | -------------------------- | ------- | ------------- |
| `handle_new_user()`                   | FUNCTION (trigger) | public | COMPARTIDO    | ambas           | postgres                | SÍ              | 001_init                                              | SÍ           | —   | —        | CANÓNICO COMPARTIDO        | CRÍTICO | Conservar     |
| `audit_logs_sync_actor_columns()`     | FUNCTION (trigger) | public | COMPARTIDO    | ambas           | postgres                | SÍ              | 002_policies                                          | NO           | —   | —        | CANÓNICO COMPARTIDO        | BAJO    | Conservar     |
| `sync_tenant_to_jwt()`                | FUNCTION (trigger) | public | COMPARTIDO    | ambas           | postgres                | SÍ              | 003_role_resolution_fix, 20260717002_jwt_tenant_claim | SÍ           | —   | —        | CANÓNICO COMPARTIDO        | CRÍTICO | Conservar     |
| `touch_instant_messages_updated_at()` | FUNCTION (trigger) | public | INASISTENCIAS | inasistencias   | inasistencias_migration | SÍ              | 001_init (inasistencias)                              | NO           | —   | —        | PROPIEDAD DE INASISTENCIAS | BAJO    | Conservar     |
| `update_updated_at_column()`          | FUNCTION (trigger) | public | COMPARTIDO    | ambas           | postgres                | SÍ              | 001_init                                              | NO           | —   | —        | CANÓNICO COMPARTIDO        | BAJO    | Conservar     |

---

## 3. Storage Buckets

| Objeto                   | Tipo           | Schema  | Propietario | App consumidora | Creado por           | Presente remoto | Migración local relacionada             | Tenant-aware             | RLS               | Policies                                                                                                                              | Estado                   | Riesgo | Acción futura   |
| ------------------------ | -------------- | ------- | ----------- | --------------- | -------------------- | --------------- | --------------------------------------- | ------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------ | --------------- |
| `documents`              | STORAGE BUCKET | storage | COMPARTIDO  | ambas           | postgres / dashboard | SÍ              | 001_init (convivencia)                  | SÍ (policies por tenant) | SÍ (bucket-level) | p_documents_select_tenant, p_documents_insert_tenant, p_documents_update_tenant, p_documents_delete_tenant, p_documents_legacy_select | CANÓNICO COMPARTIDO      | ALTO   | Migrar a Fase 2 |
| `documentos_convivencia` | STORAGE BUCKET | storage | CONVIVENCIA | convivencia     | postgres / dashboard | SÍ              | Migración convivencia (no identificada) | NO                       | SÍ (bucket-level) | p_docs_conv_auth_insert, p_docs_conv_auth_delete                                                                                      | PROPIEDAD DE CONVIVENCIA | MEDIO  | Conservar       |
| `anotaciones`            | STORAGE BUCKET | storage | CONVIVENCIA | convivencia     | postgres / dashboard | SÍ              | Migración convivencia (no identificada) | PARCIAL                  | SÍ (bucket-level) | anotaciones_select, anotaciones_upload, anotaciones_delete                                                                            | PROPIEDAD DE CONVIVENCIA | MEDIO  | Monitorear      |
| `disciplinary-processes` | STORAGE BUCKET | storage | CONVIVENCIA | convivencia     | postgres / dashboard | SÍ              | Migración procesos (no identificada)    | SÍ (policies por tenant) | SÍ (bucket-level) | 4x tenant-based policies (SELECT, INSERT, UPDATE, DELETE)                                                                             | PROPIEDAD DE CONVIVENCIA | MEDIO  | Conservar       |

### Detalle de buckets

| Bucket                   | Publico | Límite tamaño | Tipos permitidos          | Objetos | Estructura carpetas           |
| ------------------------ | ------- | ------------- | ------------------------- | ------- | ----------------------------- |
| `documents`              | No      | 5 MB          | PDF, DOC, DOCX, JPEG, PNG | 149     | `absences/*` (148) + root (1) |
| `documentos_convivencia` | No      | 50 MB         | PDF, DOC, DOCX, JPEG, PNG | 3       | Sin estructura definida       |
| `anotaciones`            | No      | 10 MB         | PDF, MD, TXT              | 39      | Sin estructura definida       |
| `disciplinary-processes` | No      | 10 MB         | PDF                       | 24      | Por proceso disciplinario     |

---

## 4. Migraciones

### 4.1 Migraciones registradas remotamente (ejecutadas en Supabase)

| Objeto                    | Tipo      | Schema | Propietario | App consumidora | Creado por | Presente remoto | Migración local relacionada                                         | Tenant-aware | RLS     | Policies                              | Estado              | Riesgo  | Acción futura |
| ------------------------- | --------- | ------ | ----------- | --------------- | ---------- | --------------- | ------------------------------------------------------------------- | ------------ | ------- | ------------------------------------- | ------------------- | ------- | ------------- |
| `001_init`                | MIGRATION | public | COMPARTIDO  | ambas           | postgres   | SÍ              | 001_init (convivencia), 001_init (inasistencias)                    | PARCIAL      | PARCIAL | Schema inicial + tablas base          | CANÓNICO COMPARTIDO | CRÍTICO | Conservar     |
| `002_policies`            | MIGRATION | public | COMPARTIDO  | ambas           | postgres   | SÍ              | 002_policies (convivencia)                                          | SÍ           | SÍ      | Políticas RLS iniciales + grants      | CANÓNICO COMPARTIDO | CRÍTICO | Conservar     |
| `003_role_resolution_fix` | MIGRATION | public | COMPARTIDO  | ambas           | postgres   | SÍ              | 003_role_resolution_fix (convivencia), 20260717002_jwt_tenant_claim | SÍ           | SÍ      | Fix resolución roles + JWT claim sync | CANÓNICO COMPARTIDO | CRÍTICO | Conservar     |

### 4.2 Migraciones locales — Convivencia Escolar

| Objeto                  | Tipo      | Schema | Propietario | App consumidora | Creado por            | Presente remoto | Migración local relacionada | Tenant-aware | RLS | Policies | Estado             | Riesgo | Acción futura  |
| ----------------------- | --------- | ------ | ----------- | --------------- | --------------------- | --------------- | --------------------------- | ------------ | --- | -------- | ------------------ | ------ | -------------- |
| `00001_initial`         | MIGRATION | public | CONVIVENCIA | convivencia     | convivencia_migration | NO (local only) | —                           | —            | —   | —        | CANDIDATO A RETIRO | BAJO   | Retirar Fase 5 |
| `00002_*`               | MIGRATION | public | CONVIVENCIA | convivencia     | convivencia_migration | NO (local only) | —                           | —            | —   | —        | CANDIDATO A RETIRO | BAJO   | Retirar Fase 5 |
| _(32 migs adicionales)_ | MIGRATION | public | CONVIVENCIA | convivencia     | convivencia_migration | NO (local only) | —                           | —            | —   | —        | CANDIDATO A RETIRO | BAJO   | Retirar Fase 5 |
| `20260727000004_*`      | MIGRATION | public | CONVIVENCIA | convivencia     | convivencia_migration | NO (local only) | —                           | —            | —   | —        | CANDIDATO A RETIRO | BAJO   | Retirar Fase 5 |

> **Nota:** Convivencia tiene 34 archivos de migración local numerados desde `00001` hasta `20260727000004`. Ninguno de estos archivos individuales está registrado en la tabla remota `_supabase_migrations`; solo los tres migrations compartidos (`001_init`, `002_policies`, `003_role_resolution_fix`) reflejan el estado remoto. Estas migraciones locales son candidatas a retiro progresivo una vez que su contenido esté consolidado en los migrations canónicos compartidos.

### 4.3 Migraciones locales — Inasistencias

| Objeto                    | Tipo      | Schema | Propietario   | App consumidora | Creado por              | Presente remoto                                 | Migración local relacionada | Tenant-aware | RLS | Policies                          | Estado                     | Riesgo | Acción futura   |
| ------------------------- | --------- | ------ | ------------- | --------------- | ----------------------- | ----------------------------------------------- | --------------------------- | ------------ | --- | --------------------------------- | -------------------------- | ------ | --------------- |
| `001_init`                | MIGRATION | public | INASISTENCIAS | inasistencias   | inasistencias_migration | PARCIAL (contenido aplicado en shared 001_init) | 001_init (shared)           | NO           | SÍ  | Schema ausencias, tests, mensajes | PROPIEDAD DE INASISTENCIAS | MEDIO  | Migrar a Fase 2 |
| `002_*` a `011_*`         | MIGRATION | public | INASISTENCIAS | inasistencias   | inasistencias_migration | NO (local only)                                 | —                           | —            | —   | —                                 | CANDIDATO A RETIRO         | BAJO   | Retirar Fase 5  |
| `012_courses_read_access` | MIGRATION | public | INASISTENCIAS | inasistencias   | inasistencias_migration | NO (local only)                                 | —                           | —            | —   | —                                 | CANDIDATO A RETIRO         | BAJO   | Retirar Fase 5  |

> **Nota:** Inasistencias tiene 12 archivos de migración local. El `001_init` de inasistencias contribuyó al migration compartido `001_init` remoto; los archivos `002`–`012` son solo locales.

---

## 5. Resumen de Riesgos

| Riesgo      | Cantidad | Objetos                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CRÍTICO** | 12       | tenants, profiles, students, current_tenant_id(), current_role(), current_app_role(), app_role(), set_tenant_id(), handle_new_user(), sync_tenant_to_jwt(), 001_init, 002_policies, 003_role_resolution_fix                                                                                                                                                                                                                                                   |
| **ALTO**    | 8        | courses, inspectorate_records, causas, bitacora_entries, disciplinary_processes, absences, documents (bucket), is_staff(), is_superuser(), is_management()                                                                                                                                                                                                                                                                                                    |
| **MEDIO**   | 17       | audit_logs, checklist_items, cartas_disciplinarias, etapas_disciplinarias, document_analyses, disciplinary_process_files, disciplinary_annotations_detected, tests, teacher_public_view, get_student_annotation_summary, get_teacher_dashboard, teacher_get_public_absences (2), get_absence_stats, documentos_convivencia (bucket), anotaciones (bucket), disciplinary-processes (bucket)                                                                    |
| **BAJO**    | 17       | usage_events, document_templates, disciplinary_rules, carta_events, instant_messages, feriados_chile, coexistence_cases, get_annotation_stage_counts, generate_process_number, get_suggested_letter_type, get_latest_analysis, teacher_get_public_absence_detail, teacher_get_instant_messages, count_affected_tests, clean_old_logs, process_audit_log, get_usage_stats, get_daily_active_users, touch_instant_messages_updated_at, update_updated_at_column |

---

## 6. Objetos por Estado

| Estado                     | Cantidad                  | Acción                                     |
| -------------------------- | ------------------------- | ------------------------------------------ |
| CANÓNICO COMPARTIDO        | 20                        | Conservar, migrar a Fase 2 progresivamente |
| PROPIEDAD DE CONVIVENCIA   | 22                        | Conservar, monitorear                      |
| PROPIEDAD DE INASISTENCIAS | 12                        | Conservar, tenantizar Fase 3               |
| LEGACY SIN USO             | 1                         | Retirar Fase 5                             |
| CANDIDATO A RETIRO         | 2 (grupos de migraciones) | Consolidar y retirar Fase 5                |

---

## 7. Diagrama de Dependencias (textual)

```
tenants (root)
  ├── profiles (FK: tenants.id, auth.users.id)
  ├── courses (FK: tenants.id)
  │     ├── tests (FK: courses.id)
  │     ├── instant_messages (FK: courses.id)
  │     └── teacher_public_view (JOIN courses + students + absences)
  ├── students (FK: tenants.id, courses.id)
  │     ├── inspectorate_records (FK: students.id, tenants.id)
  │     ├── causas (FK: students.id, tenants.id)
  │     │     └── bitacora_entries (FK: causas.id, tenants.id)
  │     ├── cartas_disciplinarias (FK: students.id, tenants.id)
  │     ├── etapas_disciplinarias (FK: students.id, tenants.id)
  │     ├── document_analyses (FK: students.id, tenants.id)
  │     ├── disciplinary_processes (FK: students.id, auth.users.id, tenants.id)
  │     │     ├── disciplinary_process_files (FK: process_id, tenants.id)
  │     │     └── disciplinary_annotations_detected (FK: process_id, tenants.id)
  │     ├── absences (FK: students.id)
  │     └── instant_messages (FK: students.id)
  ├── audit_logs (FK: auth.users.id)
  └── usage_events (FK: auth.users.id)

Independientes:
  ├── checklist_items (FK: tenants.id)
  ├── document_templates (FK: tenants.id)
  ├── disciplinary_rules (FK: tenants.id)
  ├── carta_events (FK: tenants.id)
  ├── feriados_chile (sin FK)
  └── coexistence_cases (FK: courses.id, legacy)
```

---

## 8. Notas y Acuerdos

1. **Criterio de "CANÓNICO COMPARTIDO":** Un objeto se considera canónico compartido cuando ambas aplicaciones dependen de su existencia y estructura, y cualquier cambio requiere coordinación entre ambos equipos.

2. **Criterio de "PROPIEDAD DE ...":** Un objeto pertenece a una aplicación cuando esta lo creó y es la única que escribe; la otra app solo puede leer (o no consumirlo).

3. **Fase 2 (Migración):** Agregar restricciones faltantes, normalizar tenant_id donde sea NULLABLE, agregar índices compuestos (tenant_id + id).

4. **Fase 3 (Tenantización):** Agregar columna `tenant_id` a tablas de inasistencias (`absences`, `tests`, `instant_messages`) y actualizar RLS policies.

5. **Fase 5 (Retiro):** Eliminar tablas legacy (`coexistence_cases`) y migraciones locales huérfanas después de consolidar todo el schema en migraciones compartidas.

6. **Granularidad de migraciones:** Las 34 migraciones locales de convivencia y 12 de inasistencias deben consolidarse en un número reducido de migraciones compartidas (idealmente 3–5) antes de aplicar nuevos cambios de schema.

---

## SHA-256 del documento

> _(Calcular con: `certutil -hashfile docs\shared-supabase\04-canonical-object-ledger.md SHA256`)_
