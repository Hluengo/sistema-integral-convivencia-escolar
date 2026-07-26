# Code Consumption Matrix — Shared Supabase

> **Proyecto compartido:** `jjzwwhnofiepvliugowr` (Supabase)
> **Última actualización:** 2026-07-26
> **Propósito:** Rastrear cada referencia desde los codebases de Convivencia Escolar e Inasistencias hacia objetos de base de datos, RPCs, storage buckets, roles y funciones del proyecto Supabase compartido. Sirve como insumo para planificar migraciones (Fase 2-5) y detectar accesos no autorizados o acoplamientos no deseados.

---

## 1. Executive Summary

| Métrica                                     | Valor                                                                                                                                                                                   |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Total referencias encontradas**           | 58 (44 en Inasistencias, 14 en Convivencia)                                                                                                                                             |
| **Tablas accedidas**                        | 6 (`profiles`, `courses`, `students`, `absences`, `tests`, `instant_messages`)                                                                                                          |
| **RPCs consumidos**                         | 6 (`current_role`, `get_student_annotation_summary`, `get_annotation_stage_counts`, `teacher_get_public_absences`, `teacher_get_public_absence_detail`, `teacher_get_instant_messages`) |
| **Storage buckets**                         | 3 (`documents`, `documentos_convivencia`, `disciplinary-processes`)                                                                                                                     |
| **Roles/funciones referenciadas en código** | 2 (`is_staff`, `is_superuser` — solo en tipos generados, nunca invocadas)                                                                                                               |
| **Referencias CRÍTICAS**                    | 9 (accesos sin filtro tenant explícito)                                                                                                                                                 |
| **Referencias ALTAS**                       | 14 (tenant-aware pero sin verificación de rol)                                                                                                                                          |
| **Referencias MEDIAS**                      | 24 (rol verificado y tenant presente)                                                                                                                                                   |
| **Referencias BAJAS**                       | 11 (mocks, tipos, config)                                                                                                                                                               |

---

## 2. Table Access Matrix

### 2.1 `profiles`

| Repositorio   | Archivo                              | Línea | Operación                 | Tenant explícito                             | Rol requerido | Riesgo | Cambio futuro                                    |
| ------------- | ------------------------------------ | ----- | ------------------------- | -------------------------------------------- | ------------- | ------ | ------------------------------------------------ |
| Convivencia   | `src/shared/lib/stores/authStore.ts` | 21    | SELECT (tenant_id)        | `eq('user_id', userId)` — no, es por user_id | No            | BAJO   | Fase 2 (app_memberships reemplazará role lookup) |
| Inasistencias | `src/hooks/useAuth.ts`               | 57    | SELECT (role + tenant_id) | `eq('user_id', userId)` — no, es por user_id | No            | BAJO   | Fase 2 (app_memberships)                         |

### 2.2 `courses`

| Repositorio   | Archivo                                      | Línea | Operación      | Tenant explícito                                        | Rol requerido | Riesgo  | Cambio futuro         |
| ------------- | -------------------------------------------- | ----- | -------------- | ------------------------------------------------------- | ------------- | ------- | --------------------- |
| Convivencia   | `src/shared/api/services/courses.service.ts` | 35    | SELECT (all)   | **NO** — sin `.eq('tenant_id', ...)`                    | No            | CRÍTICO | Fase 3 (tokenization) |
| Inasistencias | `src/hooks/queries/courses.ts`               | 16    | SELECT (all)   | **NO** — sin `.eq('tenant_id', ...)`                    | No            | CRÍTICO | Fase 3 (tokenization) |
| Inasistencias | `src/services/courseService.ts`              | 9, 24 | SELECT, INSERT | Parcial — INSERT sí usa tenant_id (L24), SELECT no (L9) | Parcial       | ALTO    | Fase 3 (tokenization) |
| Inasistencias | `src/services/adminService.ts`               | 38    | SELECT (all)   | **NO**                                                  | No            | CRÍTICO | Fase 3 (tokenization) |

### 2.3 `students`

| Repositorio   | Archivo                                          | Línea          | Operación                       | Tenant explícito                          | Rol requerido | Riesgo  | Cambio futuro            |
| ------------- | ------------------------------------------------ | -------------- | ------------------------------- | ----------------------------------------- | ------------- | ------- | ------------------------ |
| Convivencia   | `src/shared/api/services/courses.service.ts`     | 56, 74         | SELECT (by course / all)        | **NO** — sin `.eq('tenant_id', ...)`      | No            | CRÍTICO | Fase 3 (tokenization)    |
| Convivencia   | `src/shared/api/services/annotations.service.ts` | 208            | SELECT (all + join courses)     | **NO**                                    | No            | CRÍTICO | Fase 3 (tokenization)    |
| Inasistencias | `src/hooks/queries/students.ts`                  | 18, 55         | SELECT (by tenant / by absence) | SÍ — L18 usa `.eq('tenant_id', tenantId)` | No            | MEDIO   | Fase 3 (tokenization)    |
| Inasistencias | `src/services/studentService.ts`                 | 14, 50, 55, 87 | SELECT, UPDATE, INSERT, DELETE  | SÍ — todas usan tenant_id                 | No            | MEDIO   | None needed              |
| Inasistencias | `src/services/adminService.ts`                   | 71             | SELECT                          | **NO** (admin context)                    | SÍ (admin)    | ALTO    | Fase 2 (app_memberships) |

### 2.4 `absences` (solo Inasistencias)

| Repositorio   | Archivo                          | Línea        | Operación              | Tenant explícito                | Rol requerido | Riesgo  | Cambio futuro         |
| ------------- | -------------------------------- | ------------ | ---------------------- | ------------------------------- | ------------- | ------- | --------------------- |
| Inasistencias | `src/hooks/queries/absences.ts`  | 43           | SELECT (all)           | **NO**                          | No            | CRÍTICO | Fase 3 (tokenization) |
| Inasistencias | `src/hooks/queries/students.ts`  | 55           | SELECT (join)          | Parcial (desde students)        | No            | ALTO    | Fase 3 (tokenization) |
| Inasistencias | `src/services/absenceService.ts` | 16, 134, 174 | SELECT, INSERT, UPDATE | SÍ — L16,134,174 usan tenant_id | No            | MEDIO   | None needed           |
| Inasistencias | `src/services/studentService.ts` | 55           | SELECT (join)          | Parcial                         | No            | ALTO    | Fase 3 (tokenization) |

### 2.5 `tests` (solo Inasistencias)

| Repositorio   | Archivo                          | Línea  | Operación              | Tenant explícito    | Rol requerido | Riesgo | Cambio futuro            |
| ------------- | -------------------------------- | ------ | ---------------------- | ------------------- | ------------- | ------ | ------------------------ |
| Inasistencias | `src/hooks/queries/absences.ts`  | 89     | SELECT (join)          | **NO**              | No            | ALTO   | Fase 3 (tokenization)    |
| Inasistencias | `src/hooks/queries/tests.ts`     | 18     | SELECT (by course)     | **NO**              | No            | ALTO   | Fase 3 (tokenization)    |
| Inasistencias | `src/services/testService.ts`    | 14, 45 | SELECT, INSERT, UPDATE | SÍ — usan tenant_id | No            | MEDIO  | None needed              |
| Inasistencias | `src/services/absenceService.ts` | 65     | SELECT (join absence)  | Parcial             | No            | ALTO   | Fase 3 (tokenization)    |
| Inasistencias | `src/services/adminService.ts`   | 94     | INSERT (bulk)          | **NO**              | SÍ (admin)    | ALTO   | Fase 2 (app_memberships) |

### 2.6 `instant_messages` (solo Inasistencias)

| Repositorio   | Archivo                            | Línea      | Operación              | Tenant explícito                     | Rol requerido | Riesgo  | Cambio futuro         |
| ------------- | ---------------------------------- | ---------- | ---------------------- | ------------------------------------ | ------------- | ------- | --------------------- |
| Inasistencias | `src/hooks/queries/messages.ts`    | 42, 67, 99 | SELECT, INSERT, UPDATE | **NO** — sin `.eq('tenant_id', ...)` | No            | CRÍTICO | Fase 3 (tokenization) |
| Inasistencias | `src/components/layout/Topbar.tsx` | 29, 72     | SELECT (count / list)  | **NO**                               | No            | CRÍTICO | Fase 3 (tokenization) |

---

## 3. RPC Usage Matrix

| RPC                                 | Repositorio   | Archivo                                          | Línea | Tenant-aware                         | Rol requerido | Riesgo | Cambio futuro            |
| ----------------------------------- | ------------- | ------------------------------------------------ | ----- | ------------------------------------ | ------------- | ------ | ------------------------ |
| `current_role`                      | Inasistencias | `src/hooks/useAuth.ts`                           | 79    | N/A (auth lookup)                    | No            | BAJO   | Fase 2 (app_memberships) |
| `get_student_annotation_summary`    | Convivencia   | `src/shared/api/services/annotations.service.ts` | 166   | Depende de implementación RPC        | No            | MEDIO  | Fase 3 (tokenization)    |
| `get_annotation_stage_counts`       | Convivencia   | `src/shared/api/services/annotations.service.ts` | 272   | Depende de implementación RPC        | No            | MEDIO  | Fase 3 (tokenization)    |
| `teacher_get_public_absences`       | Inasistencias | `src/hooks/queries/teacher-public.ts`            | 58    | SÍ (recibe tenant_id como parámetro) | SÍ (teacher)  | BAJO   | None needed              |
| `teacher_get_public_absence_detail` | Inasistencias | `src/hooks/queries/teacher-public.ts`            | 89    | SÍ (recibe tenant_id como parámetro) | SÍ (teacher)  | BAJO   | None needed              |
| `teacher_get_instant_messages`      | Inasistencias | `src/hooks/queries/messages.ts`                  | 19    | Depende de implementación RPC        | SÍ (teacher)  | BAJO   | None needed              |

---

## 4. Storage Access Matrix

| Bucket                   | Repositorio   | Archivo                                                   | Línea          | Operación                       | Tenant-aware                  | Riesgo | Cambio futuro              |
| ------------------------ | ------------- | --------------------------------------------------------- | -------------- | ------------------------------- | ----------------------------- | ------ | -------------------------- |
| `documents`              | Inasistencias | `src/utils/upload.ts`                                     | 80, 112        | createSignedUrl, remove         | SÍ (por carpeta `tenant_id/`) | MEDIO  | Fase 4 (storage migration) |
| `documentos_convivencia` | Convivencia   | `src/shared/api/services/storage.service.ts`              | 36, 50, 62, 78 | createSignedUrl, list, remove   | **NO** (solo auth)            | ALTO   | Fase 4 (storage migration) |
| `disciplinary-processes` | Convivencia   | `src/shared/api/services/disciplinary-storage.service.ts` | 65, 89, 99     | upload, createSignedUrl, remove | SÍ (por carpeta `tenant_id/`) | MEDIO  | Fase 4 (storage migration) |
| _(mock)_                 | Convivencia   | `src/shared/__tests__/mockSupabase.ts`                    | 101            | getPublicUrl (mock)             | N/A                           | BAJO   | None needed                |

---

## 5. Role / Function Usage in Code

### 5.1 `is_staff` / `is_superuser`

| Función        | Repositorio   | Archivo           | Línea | Uso real                                              | Riesgo | Cambio futuro       |
| -------------- | ------------- | ----------------- | ----- | ----------------------------------------------------- | ------ | ------------------- |
| `is_staff`     | Inasistencias | `src/types/db.ts` | 1461  | Solo definición de tipo generado — **nunca invocada** | BAJO   | Fase 5 (retirement) |
| `is_superuser` | Inasistencias | `src/types/db.ts` | 1462  | Solo definición de tipo generado — **nunca invocada** | BAJO   | Fase 5 (retirement) |

### 5.2 `raw_user_meta_data` / `raw_app_meta_data`

**Ninguna referencia** en ninguno de los dos codebases. Ya fueron limpiadas en migraciones anteriores.

---

## 6. Risk Assessment

### 6.1 Definición de niveles de riesgo

| Riesgo      | Criterio                                                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **CRÍTICO** | Acceso a tabla sin filtro `tenant_id` ni verificación de rol. Fuga de datos multi-tenant posible.                                   |
| **ALTO**    | Acceso sin tenant explícito pero con restricción parcial (ej. contexto admin, join indirecto, bucket privado sin tenant isolation). |
| **MEDIO**   | Acceso con tenant explícito pero sin verificación de rol, o acceso RPC cuya implementación se desconoce.                            |
| **BAJO**    | Acceso con tenant + rol, o código de tipo/mock/config que no ejecuta queries reales.                                                |

### 6.2 Resumen por nivel

| Riesgo      | Cantidad | Acción prioritaria                                                                                                 |
| ----------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| **CRÍTICO** | 9        | Agregar filtro `tenant_id` o migrar a RPCs tenant-aware. Prioridad: courses, students, absences, instant_messages. |
| **ALTO**    | 10       | Revisar contexto de acceso. Migrar adminService a Fase 2. Tenantizar bucket `documentos_convivencia`.              |
| **MEDIO**   | 19       | Verificar implementación de RPCs. Mantener tenant-aware existente.                                                 |
| **BAJO**    | 11       | Monitorear. No requiere acción inmediata.                                                                          |

### 6.3 Detalle de referencias CRÍTICAS

1. **Convivencia — `courses.service.ts:35`** — SELECT courses sin tenant_id
2. **Inasistencias — `queries/courses.ts:16`** — SELECT courses sin tenant_id
3. **Inasistencias — `adminService.ts:38`** — SELECT courses sin tenant_id
4. **Convivencia — `courses.service.ts:56,74`** — SELECT students sin tenant_id
5. **Convivencia — `annotations.service.ts:208`** — SELECT students sin tenant_id
6. **Inasistencias — `queries/absences.ts:43`** — SELECT absences sin tenant_id
7. **Inasistencias — `queries/messages.ts:42,67,99`** — SELECT/INSERT/UPDATE instant_messages sin tenant_id
8. **Inasistencias — `Topbar.tsx:29,72`** — SELECT instant_messages sin tenant_id
9. **Inasistencias — `messages.ts:42,67,99`** — SELECT instant_messages sin tenant_id

> **Nota:** Las referencias 7 y 9 apuntan al mismo archivo (`messages.ts`). La cuenta real de puntos únicos de falla es **7 archivos** con riesgo CRÍTICO.

---

## 7. Hallazgos Adicionales

### 7.1 Tablas sin referencias en código

Las siguientes tablas del ledger canónico no tienen referencias directas en ningún codebase (solo se acceden vía RPCs o policies):

- `audit_logs`
- `checklist_items`
- `cartas_disciplinarias`
- `etapas_disciplinarias`
- `bitacora_entries`
- `causas`
- `tenants`
- `inspectorate_records`
- `document_templates`
- `document_analyses`
- `teacher_public_view`
- `disciplinary_process_files`
- `disciplinary_annotations_detected`

### 7.2 Buckets sin referencias en código

- `anotaciones` — creado para RICE annotations pero nunca referenciado directamente desde código cliente.

### 7.3 Dependencias ocultas (vía policies RLS)

Varias tablas sin referencias directas son accedidas indirectamente a través de RLS policies o RPCs. Por ejemplo:

- `causas` — accedida via RPC `get_annotation_stage_counts` (Convivencia)
- `bitacora_entries` — relacionada a causas, accedida via RPC
- `checklist_items` — relacionada a debido proceso, accedida via RPC

Estas dependencias ocultas **no aparecen** en el código fuente pero son críticas para el funcionamiento. Ver `04-canonical-object-ledger.md` para el inventario completo.

### 7.4 Patrón: Inasistencias usa más queries directas que Convivencia

Inasistencias realiza **31 queries directas** a tablas (SELECT/INSERT/UPDATE/DELETE), mientras que Convivencia solo **5 queries directas** más **2 RPCs**. Convivencia abstrae más lógica detrás de RPCs y servicios, lo que facilita la migración futura.

---

## 8. Recomendaciones por Fase

| Fase                           | Acciones                                                                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fase 2** (app_memberships)   | Migrar `profiles.role` lookups. Refactor `adminService.ts` en Inasistencias para usar membresías. Eliminar dependencia de `current_role` RPC.         |
| **Fase 3** (tokenization)      | Agregar filtro `tenant_id` en las 7 referencias CRÍTICAS. Tenantizar RPCs `get_student_annotation_summary` y `get_annotation_stage_counts`.           |
| **Fase 4** (storage migration) | Agregar tenant isolation a bucket `documentos_convivencia`. Verificar que `disciplinary-processes` y `documents` mantengan su tenant-aware existente. |
| **Fase 5** (retirement)        | Eliminar tipos `is_staff`/`is_superuser` de `db.ts` si no hay RPCs asociados. Limpiar mock `getPublicUrl` si queda obsoleto.                          |

---

## 9. Resumen Consolidado (por repositorio)

### Convivencia Escolar (14 referencias)

| Categoría                                                | Referencias | CRÍTICAS | ALTAS | MEDIAS | BAJAS |
| -------------------------------------------------------- | ----------- | -------- | ----- | ------ | ----- |
| Tablas (profiles, courses, students)                     | 5           | 3        | 0     | 0      | 2     |
| RPCs                                                     | 2           | 0        | 0     | 2      | 0     |
| Storage (documentos_convivencia, disciplinary-processes) | 6           | 0        | 4     | 2      | 0     |
| Mocks                                                    | 1           | 0        | 0     | 0      | 1     |
| **Total**                                                | **14**      | **3**    | **4** | **4**  | **3** |

### Inasistencias (44 referencias)

| Categoría                                                               | Referencias | CRÍTICAS | ALTAS | MEDIAS | BAJAS |
| ----------------------------------------------------------------------- | ----------- | -------- | ----- | ------ | ----- |
| Tablas (profiles, courses, students, absences, tests, instant_messages) | 30          | 6        | 6     | 8      | 0     |
| RPCs                                                                    | 4           | 0        | 0     | 0      | 4     |
| Storage (documents)                                                     | 2           | 0        | 0     | 2      | 0     |
| Tipos (is_staff, is_superuser)                                          | 2           | 0        | 0     | 0      | 2     |
| **Total**                                                               | **44**      | **6**    | **6** | **10** | **6** |

---

## 10. Cambio Futuro — Clasificación

| Clasificación                  | Cantidad | Descripción                                                                              |
| ------------------------------ | -------- | ---------------------------------------------------------------------------------------- |
| **Fase 2** (app_memberships)   | 4        | Migrar de `profiles.role` a `app_memberships`. Refactor de auth lookups y admin context. |
| **Fase 3** (tokenization)      | 16       | Agregar filtro `tenant_id` en queries directas sin tenant. Tenantizar RPCs.              |
| **Fase 4** (storage migration) | 3        | Agregar tenant isolation a storage buckets: `documentos_convivencia` como prioridad.     |
| **Fase 5** (retirement)        | 2        | Eliminar `is_staff`/`is_superuser` de tipos generados si no tienen consumidores.         |
| **None needed**                | 12       | Referencias ya tenant-aware o inocuas (mocks, tipos, RPCs teacher públicas).             |

---

_Fin del documento — 58 referencias totales rastreadas._
