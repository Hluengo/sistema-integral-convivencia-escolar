# Fase 1 — Reconciliación canónica del esquema remoto compartido

> **Proyecto Supabase compartido:** `jjzwwhnofiepvliugowr`
> **Fecha del análisis:** 2026-07-26
> **Estado:** Pendiente — documento de diagnóstico y plan de reconciliación

---

## 1. Resumen ejecutivo

El proyecto Supabase compartido entre Convivencia Escolar e Inasistencias presenta un **drift severo** entre las migraciones registradas en `supabase_migrations.schema_migrations` y el esquema realmente aplicado en la base de datos remota.

**Solo 3 migraciones están registradas** (`001`, `002`, `003`), todas del repositorio de Inasistencias original. Sin embargo, el remoto contiene objetos creados por **los 46 archivos de migración de ambos repositorios** (34 de Convivencia + 12 de Inasistencias), más **9 migraciones de emergencia/estabilización** aplicadas manualmente vía SQL Editor.

Esto significa que **al menos 52 cambios de esquema nunca fueron registrados** en `supabase_migrations.schema_migrations`, lo que hace imposible:

- Reproducir el esquema desde cero (`supabase db reset`)
- Aplicar migraciones futuras con `supabase db push`
- Auditar qué cambió y cuándo
- Tener un proceso de deploy consistente

**Decisión arquitectónica:** El remoto es la fuente de verdad del esquema. No se re-aplicarán migraciones ya aplicadas. Se establece un punto de control (checkpoint) y se avanza con migraciones exclusivamente forward-only desde Convivencia.

---

## 2. Matriz de reconciliación completa

### 2.1 Leyenda

| Columna       | Significado                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Repo**      | `C` = Convivencia, `I` = Inasistencias, `—` = ninguna                                                                          |
| **Reg.**      | Registrada en `supabase_migrations.schema_migrations`                                                                          |
| **Apl.**      | Efectos de la migración visibles en el remoto                                                                                  |
| **Manual**    | Aplicada manualmente vía SQL Editor (no registrada)                                                                            |
| **Evidencia** | Objeto/s o comportamiento/s confirmado/s en el remoto                                                                          |
| **Acción**    | `✅ CHECKPOINT` = ya aplicada, se marca como reconciliada; `❌ SKIP` = no se aplica; `➡️ NUEVA` = se necesita migración futura |

### 2.2 Migraciones de Inasistencias (12 archivos)

| Migration                                       | Repo | Reg.   | Apl. | Manual | Evidencia                                                                                                                                                                | Objetos afectados              | Acción        |
| ----------------------------------------------- | ---- | ------ | ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ | ------------- |
| `001_init.sql`                                  | I    | ✅ 001 | ✅   | —      | Tablas `absences`, `courses`, `tests`, `feriados_chile`, `students`, `profiles`, `teachers`, `audit_logs` existen; `current_tenant_id()` definida en su versión original | Schema completo inicial        | ✅ CHECKPOINT |
| `002_policies.sql`                              | I    | ✅ 002 | ✅   | —      | Políticas RLS históricas existen en tablas de Inasistencias; función `current_app_role()` presente                                                                       | RLS policies, funciones rol    | ✅ CHECKPOINT |
| `003_role_resolution_fix.sql`                   | I    | ✅ 003 | ✅   | —      | Funciones `is_staff()`, `is_superuser()` definidas con lógica corregida                                                                                                  | Funciones de resolución de rol | ✅ CHECKPOINT |
| `004_teacher_public_absences_course_filter.sql` | I    | ❌     | ✅   | —      | `teacher_get_public_absences(int,int,text)` existe en remoto                                                                                                             | RPC docente (firma 3 params)   | ✅ CHECKPOINT |
| `005_teacher_public_absence_detail_split.sql`   | I    | ❌     | ✅   | —      | `teacher_get_public_absence_detail(uuid)` existe en remoto                                                                                                               | RPC docente detalle            | ✅ CHECKPOINT |
| `006_fix_table_privileges.sql`                  | I    | ❌     | ✅   | —      | Grants históricos en tablas de Inasistencias reflejan esta migración                                                                                                     | Privilegios tabla              | ✅ CHECKPOINT |
| `007_fix_audit_logs_and_storage_policies.sql`   | I    | ❌     | ✅   | —      | Políticas de storage y audit_logs coinciden con esta migración                                                                                                           | Storage policies, audit_logs   | ✅ CHECKPOINT |
| `008_audit_logs_performed_by_compat.sql`        | I    | ❌     | ✅   | —      | Columna `performed_by` en audit_logs existe y es compatible                                                                                                              | audit_logs.performed_by        | ✅ CHECKPOINT |
| `009_instant_messages.sql`                      | I    | ❌     | ✅   | —      | Tabla `instant_messages` existe en remoto                                                                                                                                | instant_messages               | ✅ CHECKPOINT |
| `011_instant_messages_student_id.sql`           | I    | ❌     | ✅   | —      | Columna `student_id` en instant_messages existe                                                                                                                          | instant_messages.student_id    | ✅ CHECKPOINT |
| `012_courses_read_access_for_docente_view.sql`  | I    | ❌     | ✅   | —      | Políticas de lectura pública en courses existen (eliminadas en Fase 0 pero su efecto original está presente)                                                             | courses RLS                    | ✅ CHECKPOINT |

> **Nota:** El archivo `010_*` no existe en el repositorio de Inasistencias. La numeración salta de `009` a `011`.

### 2.3 Migraciones de Convivencia (34 archivos)

| Migration                                                | Repo | Reg. | Apl. | Manual | Evidencia                                                                                                                                                                     | Objetos afectados                                                        | Acción        |
| -------------------------------------------------------- | ---- | ---- | ---- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------- |
| `00001_base_schema.sql`                                  | C    | ❌   | ✅   | —      | Tabla `tenants` existe; `profiles` tiene columnas `tenant_id`, `role`; `students` y `courses` existen con schema completo; `current_tenant_id()` sobreescrita por Convivencia | tenants, profiles, students, courses, current_tenant_id, handle_new_user | ✅ CHECKPOINT |
| `00002_anotaciones_tables.sql`                           | C    | ❌   | ✅   | —      | Tablas `anotaciones`, `coexistence_cases`, `anexos` existen                                                                                                                   | anotaciones, coexistence_cases, anexos                                   | ✅ CHECKPOINT |
| `20260716100000_canonicalize_inspectorate.sql`           | C    | ❌   | ✅   | —      | Tabla `inspectorate_records` existe con columnas canónicas                                                                                                                    | inspectorate_records                                                     | ✅ CHECKPOINT |
| `20260716100100_causas_student_fk_audit.sql`             | C    | ❌   | ✅   | —      | FK a students en causas; auditoría de integridad aplicada                                                                                                                     | causas FK                                                                | ✅ CHECKPOINT |
| `20260716100200_profiles_and_roles.sql`                  | C    | ❌   | ✅   | —      | Roles en profiles (`admin`, `direccion`, `convivencia`, etc.) funcionando                                                                                                     | profiles.role, RLS por rol                                               | ✅ CHECKPOINT |
| `20260716100300_usage_events.sql`                        | C    | ❌   | ✅   | —      | Tabla `usage_events` existe                                                                                                                                                   | usage_events                                                             | ✅ CHECKPOINT |
| `20260716100400_fix_rls_causas_and_rpc.sql`              | C    | ❌   | ✅   | —      | RLS corrigidas en causas; RPCs de causas presentes                                                                                                                            | causas RLS, RPCs anotación                                               | ✅ CHECKPOINT |
| `20260717001_add_tenant_rls.sql`                         | C    | ❌   | ✅   | —      | Políticas RLS tenant-aware (`p_*`) en tablas Convivencia                                                                                                                      | Múltiples RLS tenant-aware                                               | ✅ CHECKPOINT |
| `20260717002_jwt_tenant_claim.sql`                       | C    | ❌   | ✅   | —      | Trigger `sync_tenant_to_jwt()` en profiles                                                                                                                                    | JWT app_metadata.tenant_id                                               | ✅ CHECKPOINT |
| `20260717003_performance_indexes.sql`                    | C    | ❌   | ✅   | —      | Índices en columnas de tenant_id, created_at, estado                                                                                                                          | Índices rendimiento                                                      | ✅ CHECKPOINT |
| `20260718001_fix_current_tenant_id.sql`                  | C    | ❌   | ✅   | —      | `current_tenant_id()` con lógica JWT + fallback profiles                                                                                                                      | current_tenant_id                                                        | ✅ CHECKPOINT |
| `20260718002_add_annotation_rpcs.sql`                    | C    | ❌   | ✅   | —      | RPCs `get_student_annotation_summary()`, `get_annotation_stage_counts()`                                                                                                      | RPCs anotación                                                           | ✅ CHECKPOINT |
| `20260720001_cleanup_stale_rls_policies.sql`             | C    | ❌   | ✅   | —      | Políticas RLS obsoletas eliminadas                                                                                                                                            | Limpieza RLS                                                             | ✅ CHECKPOINT |
| `20260720002_cleanup_stale_rls_policies_rest.sql`        | C    | ❌   | ✅   | —      | Políticas RLS restantes limpiadas                                                                                                                                             | Limpieza RLS (resto)                                                     | ✅ CHECKPOINT |
| `20260720003_anotaciones_storage.sql`                    | C    | ❌   | ✅   | —      | Bucket `anotaciones` creado                                                                                                                                                   | Storage anotaciones                                                      | ✅ CHECKPOINT |
| `20260722_add_ai_analysis.sql`                           | C    | ❌   | ✅   | —      | Tabla `document_analyses` existe; funciones IA presentes                                                                                                                      | document_analyses                                                        | ✅ CHECKPOINT |
| `202607221017_add_info_type.sql`                         | C    | ❌   | ✅   | —      | Columna `info_type` en tabla correspondiente                                                                                                                                  | info_type column                                                         | ✅ CHECKPOINT |
| `202607221020_anotaciones_bucket_md.sql`                 | C    | ❌   | ✅   | —      | Metadata del bucket anotaciones actualizada                                                                                                                                   | Storage config                                                           | ✅ CHECKPOINT |
| `20260723_document_analyses.sql`                         | C    | ❌   | ✅   | —      | Refinamiento de document_analyses                                                                                                                                             | document_analyses                                                        | ✅ CHECKPOINT |
| `20260723120000_carta_events.sql`                        | C    | ❌   | ✅   | —      | Tabla `carta_events` existe                                                                                                                                                   | carta_events                                                             | ✅ CHECKPOINT |
| `20260723123000_add_carta_content_snapshot.sql`          | C    | ❌   | ✅   | —      | Columna `content_snapshot` en carta_events                                                                                                                                    | carta_events.content_snapshot                                            | ✅ CHECKPOINT |
| `20260724_disciplinary_processes.sql`                    | C    | ❌   | ✅   | —      | Tablas `disciplinary_processes`, `disciplinary_process_files`, `disciplinary_annotations_detected`, `disciplinary_rules` existen                                              | Disciplinary schema completo                                             | ✅ CHECKPOINT |
| `202607241000_disciplinary_storage.sql`                  | C    | ❌   | ✅   | —      | Bucket `disciplinary-processes` creado                                                                                                                                        | Storage disciplinary                                                     | ✅ CHECKPOINT |
| `20260724200000_usage_events_add_tenant_id.sql`          | C    | ❌   | ✅   | —      | Columna `tenant_id` agregada a usage_events                                                                                                                                   | usage_events.tenant_id                                                   | ✅ CHECKPOINT |
| `20260724200001_fix_current_tenant_id.sql`               | C    | ❌   | ✅   | —      | Corrección adicional a current_tenant_id                                                                                                                                      | current_tenant_id                                                        | ✅ CHECKPOINT |
| `202607251000_disciplinary_pdf_flow_hardening.sql`       | C    | ❌   | ✅   | —      | Hardening flujo PDF disciplinario                                                                                                                                             | Disciplinary PDF                                                         | ✅ CHECKPOINT |
| `202607251100_fix_disciplinary_rules_and_derivation.sql` | C    | ❌   | ✅   | —      | Corrección reglas disciplinarias y derivación                                                                                                                                 | Disciplinary rules                                                       | ✅ CHECKPOINT |
| `20260726000000_fix_tenants_rls.sql`                     | C    | ❌   | ✅   | —      | RLS en tabla tenants corregida                                                                                                                                                | tenants RLS                                                              | ✅ CHECKPOINT |

### 2.4 Fase 0 — Contención de emergencia (aplicada vía SQL Editor)

| Migration                                                   | Repo | Reg. | Apl. | Manual        | Evidencia                                                                                                                              | Objetos afectados                                                      | Acción        |
| ----------------------------------------------------------- | ---- | ---- | ---- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------- |
| `20260726000001_emergency_anon_data_containment.sql`        | C    | ❌   | ✅   | ✅ SQL Editor | Anon no tiene SELECT en tablas escolares; `current_tenant_id()` retorna NULL para anon; buckets privados; policies públicas eliminadas | current_tenant_id, grants tabla, policies, storage buckets             | ✅ CHECKPOINT |
| `20260726000003_revoke_anon_sensitive_rpc_execute.sql`      | C    | ❌   | ✅   | ✅ SQL Editor | `has_function_privilege('anon', ...)` = false para las 6 firmas RPC                                                                    | RPCs anotación y docentes                                              | ✅ CHECKPOINT |
| `20260726000002_security_definer_search_path_hardening.sql` | C    | ❌   | ✅   | ✅ SQL Editor | 4 funciones SECURITY DEFINER con `search_path=public, pg_temp`                                                                         | clean_old_logs, count_affected_tests, process_audit_log, set_tenant_id | ✅ CHECKPOINT |
| `20260726000004_revoke_unsafe_security_definer_execute.sql` | C    | ❌   | ✅   | ✅ SQL Editor | `has_function_privilege('anon', fn) = false` Y `has_function_privilege('authenticated', fn) = false` para las 4 SD functions           | ACL funciones hardening                                                | ✅ CHECKPOINT |

### 2.5 Fase 0.5b — Estabilización post-contención (aplicada vía SQL Editor)

| Migration                                            | Repo | Reg. | Apl. | Manual        | Evidencia                                                                                                                                                                                                   | Objetos afectados                                   | Acción        |
| ---------------------------------------------------- | ---- | ---- | ---- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------- |
| `20260727000001_profiles_nullable_tenant_role.sql`   | C    | ❌   | ✅   | ✅ SQL Editor | `profiles.tenant_id IS NULL` = true para nuevos usuarios; `profiles.role IS NULL` = true                                                                                                                    | profiles.tenant_id nullable, profiles.role nullable | ✅ CHECKPOINT |
| `20260727000002_canonical_auth_trigger.sql`          | C    | ❌   | ✅   | ✅ SQL Editor | `handle_new_user()` inserta solo `(user_id, email)`; trigger único en auth.users; `search_path=public, pg_temp`                                                                                             | handle_new_user, triggers auth.users                | ✅ CHECKPOINT |
| `20260727000005_fix_handle_new_user_search_path.sql` | C    | ❌   | ✅   | ✅ SQL Editor | `handle_new_user()` tiene `search_path=public, pg_temp` (corrección aplicada como migración separada numerada 00005 aunque ejecutada 3ra en orden real)                                                     | handle_new_user search_path                         | ✅ CHECKPOINT |
| `20260727000003_tenant_defaults.sql`                 | C    | ❌   | ✅   | ✅ SQL Editor | 7 tablas tienen `DEFAULT current_tenant_id()` en tenant_id: `causas`, `bitacora_entries`, `checklist_items`, `cartas_disciplinarias`, `etapas_disciplinarias`, `inspectorate_records`, `document_templates` | DEFAULTs tenant_id                                  | ✅ CHECKPOINT |
| `20260727000004_documents_bucket_private_rls.sql`    | C    | ❌   | ✅   | ✅ SQL Editor | Bucket `documents` public=false; 5 políticas tenant-aware + 1 legacy                                                                                                                                        | Storage documents RLS                               | ✅ CHECKPOINT |

> **Nota sobre el orden real de Fase 0.5b:** Aunque los archivos se numeraron 00001–00004, el orden de aplicación documentado fue: **00001 → 00002 → 00005 → 00003 → 00004**. El archivo `20260727000005_fix_handle_new_user_search_path.sql` no existe físicamente en el repositorio local (nunca se creó como archivo separado), pero su efecto fue aplicado directamente en el SQL Editor después de 00002 y antes de 00003.

---

## 3. Línea de tiempo cronológica

```
2024-Q3
├── I-001_init.sql                                    ← Registrada ✅
├── I-002_policies.sql                                ← Registrada ✅
└── I-003_role_resolution_fix.sql                     ← Registrada ✅

2024-Q4 – 2025 (Inasistencias continúa, NO registradas)
├── I-004_teacher_public_absences_course_filter
├── I-005_teacher_public_absence_detail_split
├── I-006_fix_table_privileges
├── I-007_fix_audit_logs_and_storage_policies
├── I-008_audit_logs_performed_by_compat
├── I-009_instant_messages
├── I-011_instant_messages_student_id
└── I-012_courses_read_access_for_docente_view

2026-07-16 (Convivencia comienza a agregar tablas)
├── C-00001_base_schema
├── C-00002_anotaciones_tables
├── C-20260716100000_canonicalize_inspectorate
├── C-20260716100100_causas_student_fk_audit
├── C-20260716100200_profiles_and_roles
├── C-20260716100300_usage_events
└── C-20260716100400_fix_rls_causas_and_rpc

2026-07-17 (Tenantización)
├── C-20260717001_add_tenant_rls
├── C-20260717002_jwt_tenant_claim
└── C-20260717003_performance_indexes

2026-07-18 (Correcciones)
├── C-20260718001_fix_current_tenant_id
└── C-20260718002_add_annotation_rpcs

2026-07-20 (Limpieza RLS + Storage)
├── C-20260720001_cleanup_stale_rls_policies
├── C-20260720002_cleanup_stale_rls_policies_rest
└── C-20260720003_anotaciones_storage

2026-07-22 (IA + Anotaciones)
├── C-20260722_add_ai_analysis
├── C-202607221017_add_info_type
└── C-202607221020_anotaciones_bucket_md

2026-07-23 (Documentos + Cartas)
├── C-20260723_document_analyses
├── C-20260723120000_carta_events
└── C-20260723123000_add_carta_content_snapshot

2026-07-24 (Procesos disciplinarios)
├── C-20260724_disciplinary_processes
├── C-202607241000_disciplinary_storage
├── C-20260724200000_usage_events_add_tenant_id
└── C-20260724200001_fix_current_tenant_id

2026-07-25 (Hardening disciplinario)
├── C-202607251000_disciplinary_pdf_flow_hardening
├── C-202607251100_fix_disciplinary_rules_and_derivation
├── C-20260726000000_fix_tenants_rls
│
├── 🔴 FASE 0 — Emergencia (SQL Editor, orden real:)
│   ├── ① C-20260726000001 (DO block no revocó ACLs anon)
│   ├── ② C-20260726000003 (correctiva: REVOKE directo 6 RPCs)
│   ├── ③ C-20260726000002 (search_path hardening)
│   └── ④ C-20260726000004 (correctiva: REVOKE SD functions)
│
└── 🔵 FASE 0.5b — Estabilización (SQL Editor, orden real:)
    ├── ① C-20260727000001 (profiles nullable)
    ├── ② C-20260727000002 (trigger canónico)
    ├── ③ C-20260727000005 (fix handle_new_user search_path - archivo faltante)
    ├── ④ C-20260727000003 (tenant defaults)
    └── ⑤ C-20260727000004 (documents RLS privado)

2026-07-26 ← ESTAMOS AQUÍ — Inicio Fase 1: Reconciliación
```

---

## 4. Análisis del drift

### 4.1 ¿Qué está registrado vs qué está realmente aplicado?

```
Registrado (3):  ██░░░░░░░░░░░░░░░░░░  6.5%
Aplicado (46+):  ████████████████████  100%
```

| Métrica                                  | Valor                                   |
| ---------------------------------------- | --------------------------------------- |
| Migraciones registradas en remoto        | 3                                       |
| Migraciones aplicadas (efectos visibles) | 46 archivos + 9 aplicaciones manuales   |
| Drift neto                               | **52 migraciones no registradas**       |
| Brecha de trazabilidad                   | **94.2% del esquema no tiene registro** |

### 4.2 Consecuencias del drift

1. **`supabase db push` no se puede usar** — fallaría porque el tracker local no coincide con el remoto.
2. **`supabase db reset` no reconstruiría el esquema real** — solo aplicaría las 3 migraciones registradas.
3. **No hay trazabilidad auditora** de qué migración creó cada objeto.
4. **El orden de aplicación real difiere del orden cronológico** de los timestamps (Fase 0.5b se aplicó en orden 00001 → 00002 → 00005 → 00003 → 00004).
5. **Archivos de migración que no existen localmente** (`20260727000005`) crearon objetos en remoto.
6. **Dos repositorios compitiendo** por el mismo esquema — Convivencia e Inasistencias tienen archivos superpuestos que modifican los mismos objetos (ej: `current_tenant_id()`, `handle_new_user()`, `profiles`).

### 4.3 Objetos con conflictos detectados

| Objeto                | Creado por        | Sobreescrito por                                                   | Riesgo                                                     |
| --------------------- | ----------------- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| `current_tenant_id()` | I-001_init        | C-00001_base, C-20260718001, C-20260724200001, C-20260726000001    | Múltiples redefiniciones; la última (Fase 0) es la vigente |
| `handle_new_user()`   | I-001_init        | C-00001_base, C-20260727000002, C-20260727000005                   | Versión canónica = Fase 0.5b                               |
| `profiles`            | I-001_init        | C-00001_base (agrega tenant_id, role), C-20260727000001 (nullable) | Evolucionó de NOT NULL a nullable                          |
| `audit_logs`          | I-001_init        | C-20260726000001 (REVOKE anon)                                     | Solo grants modificados                                    |
| `courses` RLS         | I-001_init, I-012 | C-20260726000001 (elimina p_courses_public_select)                 | Política pública eliminada                                 |

---

## 5. Política forward-only para migraciones futuras

### 5.1 Principios rectores

1. **El remoto es la fuente de verdad.** No se re-aplica nada que ya esté en el remoto.
2. **Solo Convivencia gestiona migraciones.** Inasistencias ya no crea migraciones SQL contra el proyecto compartido. Cualquier cambio de esquema requerido por Inasistencias se canaliza a través del equipo de Convivencia.
3. **Toda migración se crea en `sistema-integral-convivencia-escolar/supabase/migrations/`.** No se crean migraciones en el repositorio de Inasistencias.
4. **Nunca editar una migración ya aplicada.** Si hay error, se crea una migración correctiva nueva.
5. **Nunca reusar timestamps.** Cada migración tiene timestamp único. Si dos migraciones tienen el mismo timestamp, la segunda falla al aplicar.
6. **Toda migración se aplica con validación previa y verificación posterior.**

### 5.2 Proceso de aplicación de una migración nueva

```
┌─────────────────────────────────────────────────┐
│ 1. PRE-VALIDACIÓN                                │
│    ├── Verificar que el remoto está estable      │
│    ├── Ejecutar smoke tests de esquema actual    │
│    ├── Confirmar que no hay migraciones           │
│    │   pendientes locales sin aplicar             │
│    └── Verificar que el archivo existe y tiene   │
│        SHA-256 checksum                          │
├─────────────────────────────────────────────────┤
│ 2. APLICACIÓN                                    │
│    ├── Abrir SQL Editor de Supabase              │
│    ├── Copiar contenido COMPLETO del archivo     │
│    ├── NO registrar en supabase_migrations       │
│    │   (se registrará en el próximo checkout)    │
│    └── Ejecutar                                  │
├─────────────────────────────────────────────────┤
│ 3. POST-VALIDACIÓN                               │
│    ├── Ejecutar pruebas de humo (smoke tests)    │
│    ├── Verificar objetos creados/modificados     │
│    └── Si falla: crear corrección forward-only   │
├─────────────────────────────────────────────────┤
│ 4. REGISTRO LOCAL                                │
│    ├── Anotar en este documento la aplicación    │
│    ├── Registrar SHA-256 del archivo aplicado    │
│    └── Commit + push al repositorio              │
└─────────────────────────────────────────────────┘
```

### 5.3 Checksum tracking

Cada migración aplicada al remoto debe tener su checksum SHA-256 registrado:

| Migration        | SHA-256 (aplicado)        | Fecha aplicación | Validador |
| ---------------- | ------------------------- | ---------------- | --------- |
| `20260726000001` | `39B2A1...` (ver archivo) | 2026-07-25       | Fase 0    |
| `20260726000003` | `D4E8F2...` (ver archivo) | 2026-07-25       | Fase 0    |
| `20260726000002` | `1C7A3B...` (ver archivo) | 2026-07-25       | Fase 0    |
| `20260726000004` | `5F6E9C...` (ver archivo) | 2026-07-25       | Fase 0    |
| `20260727000001` | `041C764D...`             | 2026-07-25       | Fase 0.5b |
| `20260727000002` | `213E4015...`             | 2026-07-25       | Fase 0.5b |
| `20260727000003` | `F7D21029...`             | 2026-07-25       | Fase 0.5b |
| `20260727000004` | `C29010E2...`             | 2026-07-25       | Fase 0.5b |

> Para migraciones futuras: calcular SHA-256 antes de aplicar, verificar después de aplicar que el contenido coincide.

### 5.4 Smoke tests de verificación post-aplicación

```sql
-- Smoke test: current_tenant_id() para anon retorna NULL
SELECT auth.uid() IS NULL AND public.current_tenant_id() IS NULL AS smoke_anon_tenant;

-- Smoke test: anon sin acceso a tablas críticas
SELECT has_table_privilege('anon', 'public.students', 'SELECT') = false AS smoke_anon_no_select;

-- Smoke test: las tablas principales existen
SELECT count(*) = 1 AS smoke_tenants_exists FROM pg_tables WHERE schemaname='public' AND tablename='tenants';
SELECT count(*) = 1 AS smoke_profiles_exists FROM pg_tables WHERE schemaname='public' AND tablename='profiles';
SELECT count(*) = 1 AS smoke_causas_exists FROM pg_tables WHERE schemaname='public' AND tablename='causas';

-- Smoke test: RLS habilitado en tablas clave
SELECT relname, relrowsecurity FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN ('causas', 'profiles', 'students', 'courses', 'absences')
ORDER BY relname;

-- Smoke test: funciones críticas existen
SELECT count(*) = 1 AS smoke_current_tenant_id_exists
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public' AND p.proname='current_tenant_id';
```

---

## 6. Reglas para la gestión futura de migraciones

### Regla 1: Una sola fuente de migraciones

Todas las migraciones futuras se crean exclusivamente en:

```
sistema-integral-convivencia-escolar/supabase/migrations/
```

Queda prohibido crear migraciones SQL en el repositorio `registroinasistencia/` que afecten al proyecto Supabase compartido.

### Regla 2: Naming convention estricta

```
YYYYMMDDHHMMSS_descripcion_corta.sql
```

- Timestamp en formato ISO compacto (14 dígitos).
- Descripción en snake_case, máximo 6 palabras.
- Sin caracteres especiales, sin puntos (excepto `.sql`).
- Ejemplo: `20260726120000_add_teacher_access_tokens.sql`

### Regla 3: Validación pre-aplicación obligatoria

Antes de aplicar cualquier migración al remoto:

1. ✅ Verificar que `npm run lint` pasa en Convivencia.
2. ✅ Verificar que `npm run test` pasa en Convivencia.
3. ✅ Verificar que no hay migraciones locales sin aplicar contra el remoto.
4. ✅ Registrar el SHA-256 del archivo.
5. ✅ Ejecutar los smoke tests de esquema actual.
6. ✅ Documentar en este archivo la migración pendiente.

### Regla 4: Prohibición de edición retroactiva

- No se puede modificar una migración ya aplicada al remoto.
- No se puede cambiar el contenido de un archivo de migración después de aplicado.
- Si se encuentra un error: crear una NUEVA migración correctiva.

### Regla 5: Prohibición de reutilización de timestamps

- Cada migración debe tener un timestamp único.
- Si dos migraciones tienen el mismo timestamp, `supabase db push` falla.
- Verificar colisiones antes de nombrar una migración: `git log --oneline | grep <timestamp>`

### Regla 6: Prohibición de re-aplicación masiva

- **No ejecutar** `supabase db push` ni `supabase db reset` contra el remoto.
- **No re-aplicar** migraciones históricas (Inasistencias o Convivencia pre-Fase 0).
- **No registrar** migraciones antiguas en `supabase_migrations.schema_migrations` de forma masiva.
- Cualquier cambio se hace exclusivamente con migraciones forward-only nuevas.

### Regla 7: Cada migración con validación antes de aplicar

La migración debe incluir al inicio **precondiciones verificables**:

```sql
-- Precondition check
DO $$
BEGIN
  -- Ejemplo: verificar que una tabla existe
  ASSERT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ), 'Precondition failed: profiles table must exist';

  -- Ejemplo: verificar que una columna existe
  ASSERT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'tenant_id'
  ), 'Precondition failed: profiles.tenant_id must exist';
END $$;
```

### Regla 8: Smoke tests post-aplicación obligatorios

Después de aplicar cada migración, ejecutar:

1. Smoke tests de esquema general (Sección 5.4).
2. Smoke tests específicos de la migración aplicada.
3. Pruebas de integración de las aplicaciones afectadas.

### Regla 9: Registro en Bitácora de Reconciliación

Cada migración aplicada se registra en la Sección 10 de este documento con:

- Fecha y hora de aplicación
- SHA-256 del contenido aplicado
- Persona que aplicó (o sistema)
- Resultado de validación

---

## 7. Objetos no reconciliados (deuda técnica)

Los siguientes objetos existen en el remoto pero no están cubiertos por ninguna migración trazable, o su estado reconciliado es incompleto:

### 7.1 Vistas y funciones públicas docentes

| Objeto                                                                                            | Problema                                                                                   | Plan                           |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------ |
| `teacher_get_public_absences(integer, integer, text)` + overload `(integer, integer, text, uuid)` | Overloads duplicados causan `300 Multiple Choices` en PostgREST para usuarios autenticados | Fase de RPC docente tokenizado |
| `teacher_get_public_absence_detail(uuid)`                                                         | Overload duplicado oculto                                                                  | Fase de RPC docente tokenizado |
| `teacher_get_instant_messages(text, uuid, uuid)`                                                  | Overload duplicado oculto                                                                  | Fase de RPC docente tokenizado |
| Vista Docente sin login                                                                           | Deshabilitada desde Fase 0                                                                 | Restaurar con tokens seguros   |

### 7.2 Tablas sin tenant_id

| Tabla               | Repo origen | Riesgo                                             | Plan                   |
| ------------------- | ----------- | -------------------------------------------------- | ---------------------- |
| `absences`          | I           | Sin RLS tenant-aware; datos multi-tenant mezclados | Fase 2 — tenantización |
| `tests`             | I           | Sin RLS tenant-aware                               | Fase 2 — tenantización |
| `instant_messages`  | I           | Sin RLS tenant-aware                               | Fase 2 — tenantización |
| `feriados_chile`    | I           | Datos compartidos (no requieren tenant)            | Eximir permanentemente |
| `audit_logs`        | I           | Sin tenant_id; logs multi-tenant mezclados         | Fase 2 — tenantización |
| `coexistence_cases` | I           | Sin tenant_id; datos mezclados                     | Fase 2 — tenantización |

### 7.3 Almacenamiento legacy

| Bucket                   | Objetos sin prefijo tenant | Plan                                                                          |
| ------------------------ | -------------------------- | ----------------------------------------------------------------------------- |
| `documents`              | 148 objetos en `absences/` | Acceso vía signed URL con resolución desde absences.tenant_id (cuando exista) |
| `documentos_convivencia` | Objetos sin tenantizar     | Migrar a estructura tenantizada                                               |
| `anotaciones`            | Objetos sin tenantizar     | Migrar a estructura tenantizada                                               |
| `disciplinary-processes` | Objetos sin tenantizar     | Migrar a estructura tenantizada                                               |

### 7.4 Funciones y políticas heredadas

| Objeto                                | Problema                                                            | Plan                                  |
| ------------------------------------- | ------------------------------------------------------------------- | ------------------------------------- |
| `set_tenant_id(uuid)`                 | Cualquier authenticated puede cambiar su tenant; riesgo documentado | Endpoint restringido con autorización |
| `clean_old_logs(integer)`             | Solo service_role; función sin owner explícito                      | Documentar como utility interna       |
| Políticas RLS legacy de Inasistencias | Pueden existir remanentes no tenantizadas                           | Auditoría completa en Fase 2          |

### 7.5 Archivo de migración faltante

| Migración faltante                                   | Efecto aplicado                                         | Acción                                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `20260727000005_fix_handle_new_user_search_path.sql` | `handle_new_user()` tiene `search_path=public, pg_temp` | Crear el archivo localmente con el contenido exacto aplicado, para que coincida con el remoto |

---

## 8. Prohibición de re-aplicación masiva

### 8.1 Razones

1. **Riesgo de duplicación de objetos:** Tablas, funciones y políticas ya existen. Re-aplicar `CREATE TABLE IF NOT EXISTS` es seguro, pero `ALTER TABLE`, `CREATE OR REPLACE FUNCTION` con definiciones antiguas podrían sobreescribir versiones más recientes (Fase 0, Fase 0.5b).

2. **Pérdida de cambios de emergencia:** Las migraciones de Fase 0 corrigieron la seguridad. Re-aplicar migraciones antiguas restauraría `current_tenant_id()` con UUID default y grants públicos.

3. **Dependencias cruzadas no resueltas:** Re-aplicar migraciones de Inasistencias después de las de Convivencia podría fallar porque objetos ya existen con definiciones diferentes.

4. **Las migraciones no son puramente idempotentes:** Mientras que `CREATE TABLE IF NOT EXISTS` es seguro, los grants (`GRANT`, `REVOKE`), la eliminación de políticas (`DROP POLICY IF EXISTS`) y los cambios de columna (`ALTER TABLE ... DROP NOT NULL`) no lo son en presencia de cambios posteriores.

### 8.2 Lo que NO se debe hacer

```diff
- ❌ supabase db push (contra remoto existente)
- ❌ supabase db reset (borraría datos de producción)
- ❌ Aplicar migraciones de Inasistencias manualmente
- ❌ Aplicar migraciones antiguas de Convivencia (pre-Fase 0)
- ❌ Registrar migraciones en bloque en supabase_migrations
- ❌ Editar migraciones ya aplicadas
- ❌ Re-numerar migraciones históricas
```

### 8.3 Lo que SÍ se debe hacer

```diff
+ ✅ Crear migraciones forward-only nuevas para cambios nuevos
+ ✅ Mantener el remoto como fuente de verdad
+ ✅ Documentar cada migración aplicada con checksum
+ ✅ Validar pre y post cada aplicación
+ ✅ Canalizar todos los cambios de esquema por Convivencia
+ ✅ Usar precondiciones verificables en cada migración
```

### 8.4 Excepción: recreación desde cero

Si en el futuro se requiere reconstruir el proyecto desde cero (ej: nuevo tenant, nuevo proyecto Supabase):

1. El orden de aplicación debe ser: migraciones de Inasistencias primero (001–012), luego migraciones de Convivencia en orden cronológico (00001 → ... → 20260727000004).
2. Las migraciones de Fase 0 y Fase 0.5b deben incluirse en el orden de aplicación, ya que contienen cambios de seguridad críticos que no están en migraciones anteriores.
3. Alternativa recomendada para repositorio unificado: consolidar todo en un solo conjunto de migraciones con orden canónico (proyecto futuro).

---

## 9. Estado actual del checkpoint

### 9.1 Checkpoint establecido

Con la finalización de Fase 0.5b, se establece un **checkpoint de reconciliación** en la fecha `2026-07-26`. Todo el esquema remoto se considera la línea base canónica.

| Componente                            | Estado checkpoint                                    |
| ------------------------------------- | ---------------------------------------------------- |
| `current_tenant_id()`                 | ✅ NULL para anon, JWT fast-path + fallback profiles |
| RLS en tablas Convivencia             | ✅ Tenant-aware, sin políticas públicas              |
| RLS en tablas Inasistencias           | ⚠️ Sin tenant-aware, pero anon revocado              |
| Storage buckets                       | ✅ Privados, sin acceso público                      |
| Funciones SECURITY DEFINER            | ✅ search_path seguro, solo service_role             |
| `profiles.tenant_id`, `profiles.role` | ✅ Nullable                                          |
| `handle_new_user()`                   | ✅ Mínimo (user_id, email), search_path seguro       |
| DEFAULT `current_tenant_id()`         | ✅ En 7 tablas Convivencia                           |
| Policies documents                    | ✅ 5 tenant-aware + 1 legacy                         |
| 3 migraciones registradas             | ⚠️ No se modifican; se dejan como están              |

### 9.2 Riesgos residuales que requieren migraciones futuras

| Prioridad | Riesgo                                                | Migración requerida              |
| --------- | ----------------------------------------------------- | -------------------------------- |
| 🔴 Alta   | Overloads RPC docentes causan `300 Multiple Choices`  | RPC docente tokenizado unificado |
| 🔴 Alta   | Vista Docente sin login deshabilitada                 | Restaurar con tokens             |
| 🟡 Media  | Tablas Inasistencias sin tenant_id                    | Fase 2 — tenantización completa  |
| 🟡 Media  | `set_tenant_id()` accesible a cualquier authenticated | Endpoint con autorización        |
| 🟢 Baja   | Objetos storage sin prefijo tenant                    | Migración progresiva             |
| 🟢 Baja   | Archivo `20260727000005` faltante en repo local       | Crear archivo espejo             |

---

## 10. Bitácora de reconciliación

| Fecha      | Cambio                                   | Migración(es)                         | Checksum SHA-256                                    | Aplicó     | Validación                       |
| ---------- | ---------------------------------------- | ------------------------------------- | --------------------------------------------------- | ---------- | -------------------------------- |
| 2026-07-25 | Fase 0 — Contención emergencia           | 00001, 00003, 00002, 00004            | Documentado en `00-emergency-containment.md`        | SQL Editor | ✅ Checklist Fase 0 cerrada      |
| 2026-07-25 | Fase 0.5b — Estabilización               | 00001, 00002, 00005 (*), 00003, 00004 | `041C764D`, `213E4015`, `—`, `F7D21029`, `C29010E2` | SQL Editor | ✅ Post-containment estabilizado |
| 2026-07-26 | Fase 1 — Reconciliación (este documento) | Ninguna                               | —                                                   | —          | Documento de diagnóstico         |

> **(\*)** El checksum de `20260727000005` no está disponible porque el archivo no existe en el repositorio local. Se recomienda crearlo extrayendo la definición actual de `handle_new_user()` del remoto.

---

## 11. Referencias

- `docs/shared-supabase/00-emergency-containment.md` — Detalle de Fase 0
- `docs/shared-supabase/01-remote-preflight-instructions.md` — Instrucciones preflight
- `docs/shared-supabase/02-emergency-validation-checklist.md` — Checklist de validación
- `docs/shared-supabase/03-post-containment-stabilization.md` — Detalle de Fase 0.5b
- `supabase/migrations/` — Migraciones locales de Convivencia (37 archivos)
- `C:\Users\heae2\registroinasistencia\supabase\migrations\` — Migraciones locales de Inasistencias (11 archivos)
- Proyecto Supabase: `jjzwwhnofiepvliugowr`

---

## 12. Firmas y aprobación

| Rol                      | Nombre | Fecha | Firma |
| ------------------------ | ------ | ----- | ----- |
| Arquitecto               | —      | —     | —     |
| DevOps                   | —      | —     | —     |
| Desarrollo Convivencia   | —      | —     | —     |
| Desarrollo Inasistencias | —      | —     | —     |
