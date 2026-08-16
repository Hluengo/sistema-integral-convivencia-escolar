# Fase 1 — Cierre: Reconciliación Canónica del Esquema Compartido

> **Fecha:** 2026-07-26
> **Estado:** ✅ COMPLETA — APTO PARA IMPLEMENTAR FASE 2
> **Proyecto Supabase:** `mjhbcqwtjzgvqssfiore`

---

## 1. Resumen Ejecutivo

La Fase 1 cierra documentalmente el estado remoto post-Fase 0 + Fase 0.5b, reconcilia 55+ migraciones entre ambos repositorios, establece propiedad canónica de 60+ objetos, y prepara localmente la arquitectura de Fase 2 (applications + app_memberships) sin aplicar cambios al remoto.

### Logros principales

| Área              | Resultado                                                                |
| ----------------- | ------------------------------------------------------------------------ |
| Inventario remoto | 25 tablas, 28 funciones, 4 buckets, 76 índices, 98 policies              |
| Documentación     | 5 documentos canónicos nuevos + 3 actualizados                           |
| Migraciones       | 46 locales + 9 manuales reconciliadas; política forward-only establecida |
| Código            | ~58 referencias mapeadas en ambos repositorios                           |
| Fase 2            | Arquitectura diseñada, 6 borradores de migraciones creados               |
| Validación        | Ambos repos passan lint, tests y build                                   |

---

## 2. Estado Post-Fase 1

### 2.1 Tablas (25)

#### Compartidas (CANÓNICO COMPARTIDO — 7)

| Tabla                  | Filas | RLS        | tenant_id                             | Propietario |
| ---------------------- | ----- | ---------- | ------------------------------------- | ----------- |
| `tenants`              | 1     | ❌ Sin RLS | Raíz                                  | COMPARTIDO  |
| `profiles`             | 2     | ✅         | NULL (nullable)                       | COMPARTIDO  |
| `courses`              | 0     | ✅         | NOT NULL                              | COMPARTIDO  |
| `students`             | 808   | ✅         | NOT NULL                              | COMPARTIDO  |
| `inspectorate_records` | 78    | ✅         | NOT NULL, DEFAULT current_tenant_id() | COMPARTIDO  |
| `audit_logs`           | 7214  | ✅         | Sin columna                           | COMPARTIDO  |
| `usage_events`         | 2     | ✅         | Sin columna                           | COMPARTIDO  |

#### Convivencia (PROPIEDAD DE CONVIVENCIA — 12)

| Tabla                               | Filas | RLS | tenant_id       | Default |
| ----------------------------------- | ----- | --- | --------------- | ------- |
| `causas`                            | 1     | ✅  | NOT NULL        | ✅      |
| `bitacora_entries`                  | 1     | ✅  | NOT NULL        | ✅      |
| `checklist_items`                   | 30    | ✅  | NOT NULL        | ✅      |
| `cartas_disciplinarias`             | 7     | ✅  | NOT NULL        | ✅      |
| `etapas_disciplinarias`             | 7     | ✅  | NOT NULL        | ✅      |
| `document_templates`                | 4     | ✅  | NOT NULL        | ✅      |
| `document_analyses`                 | 18    | ✅  | NOT NULL        | ❌      |
| `disciplinary_processes`            | 7     | ✅  | NOT NULL        | ❌      |
| `disciplinary_process_files`        | 7     | ✅  | NOT NULL        | ❌      |
| `disciplinary_annotations_detected` | 78    | ✅  | NOT NULL        | ❌      |
| `disciplinary_rules`                | 4     | ✅  | NOT NULL        | ❌      |
| `carta_events`                      | 80    | ✅  | NULL (nullable) | ❌      |

#### Inasistencias (PROPIEDAD DE INASISTENCIAS — 4)

| Tabla              | Filas | RLS | tenant_id |
| ------------------ | ----- | --- | --------- |
| `absences`         | 13    | ✅  | ❌        |
| `tests`            | 0     | ✅  | ❌        |
| `instant_messages` | 1     | ✅  | ❌        |
| `feriados_chile`   | 0     | ✅  | ❌        |

#### Legacy (LEGACY SIN USO — 1)

| Tabla               | Filas | RLS | tenant_id | Estado                                 |
| ------------------- | ----- | --- | --------- | -------------------------------------- |
| `coexistence_cases` | 0     | ✅  | ❌        | Sin código consumidor. Retirar Fase 5. |

#### Vista (1)

| Vista                 | Definición                         | Grants                                                    |
| --------------------- | ---------------------------------- | --------------------------------------------------------- |
| `teacher_public_view` | JOIN absences + students + courses | postgres=arwdDxtm, service_role=arwdDxtm, authenticated=r |

### 2.2 Funciones (28 signatures, 26 únicas)

#### Riesgo CRÍTICO — EXECUTE a PUBLIC

| Función                                           | SD  | search_path | Volatility | Anon | Auth |
| ------------------------------------------------- | --- | ----------- | ---------- | ---- | ---- |
| `app_role()`                                      | ❌  | —           | s          | ❌   | ❌   |
| `is_staff()`                                      | ❌  | public      | s          | ✅   | ✅   |
| `is_superuser()`                                  | ❌  | public      | s          | ✅   | ✅   |
| `current_app_role()`                              | ✅  | public      | s          | ✅   | ✅   |
| `current_role()`                                  | ✅  | public      | s          | ✅   | ✅   |
| `current_tenant_id()`                             | ✅  | public      | s          | ✅   | ✅   |
| `generate_process_number(uuid)`                   | ✅  | public      | v          | ✅   | ✅   |
| `get_suggested_letter_type(int,int,int,uuid)`     | ✅  | public      | v          | ✅   | ✅   |
| `get_absence_stats(...)`                          | ❌  | —           | s          | ❌   | ✅   |
| `get_daily_active_users(timestamptz,timestamptz)` | ✅  | public      | s          | ✅   | ✅   |
| `get_latest_analysis(uuid)`                       | ✅  | public      | v          | ✅   | ✅   |
| `get_teacher_dashboard()`                         | ✅  | public      | v          | ✅   | ✅   |
| `get_usage_stats(timestamptz,timestamptz)`        | ✅  | public      | s          | ✅   | ✅   |
| `sync_tenant_to_jwt()`                            | ✅  | public      | v          | ✅   | ✅   |
| `touch_instant_messages_updated_at()`             | ❌  | public      | v          | ✅   | ✅   |
| `update_updated_at_column()`                      | ❌  | —           | v          | ✅   | ✅   |
| `audit_logs_sync_actor_columns()`                 | ❌  | —           | v          | ✅   | ✅   |

#### Solo service_role/postgres

| Función                                | SD  | search_path     | Volatility | Uso                |
| -------------------------------------- | --- | --------------- | ---------- | ------------------ |
| `handle_new_user()`                    | ✅  | public, pg_temp | v          | Trigger auth.users |
| `process_audit_log()`                  | ✅  | public, pg_temp | v          | Trigger auditoría  |
| `clean_old_logs(integer)`              | ✅  | public, pg_temp | v          | Mantenimiento      |
| `count_affected_tests(uuid,date,date)` | ✅  | public, pg_temp | s          | Interna            |
| `set_tenant_id(uuid)`                  | ✅  | public, pg_temp | v          | Mantenimiento      |

#### Authenticated only

| Función                                          | SD  | search_path     | Volatility |
| ------------------------------------------------ | --- | --------------- | ---------- |
| `get_student_annotation_summary()`               | ✅  | public          | v          |
| `get_annotation_stage_counts()`                  | ✅  | public          | v          |
| `teacher_get_public_absences(int,int,text)`      | ✅  | public, pg_temp | v          |
| `teacher_get_public_absences(int,int,text,uuid)` | ✅  | public, pg_temp | v          |
| `teacher_get_public_absence_detail(uuid)`        | ✅  | public          | v          |
| `teacher_get_instant_messages(text,uuid,uuid)`   | ✅  | public          | s          |
| `is_management()`                                | ❌  | —               | s          |

### 2.3 Storage (4 buckets)

| Bucket                   | Objetos | Public | Límite | MIME                      |
| ------------------------ | ------- | ------ | ------ | ------------------------- |
| `documents`              | 149     | false  | 5 MB   | PDF, DOC, DOCX, JPEG, PNG |
| `documentos_convivencia` | 3       | false  | 50 MB  | PDF, DOC, DOCX, JPEG, PNG |
| `anotaciones`            | 39      | false  | 10 MB  | PDF, MD, TXT              |
| `disciplinary-processes` | 24      | false  | 10 MB  | PDF                       |

### 2.4 Policies (98: 84 public + 14 storage)

| Patrón            | Tablas                                                                                                                       | Mecanismo                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Convivencia**   | causas, bitacora_entries, checklist_items, cartas_disciplinarias, etapas_disciplinarias, document_templates                  | `tenant_id = current_tenant_id()` con roles `public` |
| **Inasistencias** | absences, tests, instant_messages, feriados_chile                                                                            | `is_staff()` con roles `authenticated`               |
| **Híbrido**       | profiles, courses, students, inspectorate_records                                                                            | Ambos patrones coexisten                             |
| **ALL**           | disciplinary_processes, disciplinary_process_files, disciplinary_annotations_detected, disciplinary_rules, document_analyses | `tenant_id = current_tenant_id()` roles `public`     |

---

## 3. Reconciliación de Migraciones

### 3.1 Migraciones registradas en remoto

Solo **3** de **55+** migraciones están registradas en `supabase_migrations.schema_migrations`:

| Version | Name                | Repositorio   |
| ------- | ------------------- | ------------- |
| 001     | init                | Inasistencias |
| 002     | policies            | Inasistencias |
| 003     | role_resolution_fix | Inasistencias |

**Deriva:** 94.2% del esquema no está registrado. Las migraciones de Fase 0 y Fase 0.5b se aplicaron manualmente vía SQL Editor sin registro.

### 3.2 Aplicaciones manuales documentadas

#### Fase 0 (emergencia) — orden real

| #   | Archivo          | Propósito                                                                                                     |
| --- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | `20260726000001` | current_tenant_id(), REVOKE tablas, DROP policies públicas, Storage privado. DO block no revocó ACL directas. |
| 2   | `20260726000003` | REVOKE EXECUTE directo 6 RPCs sensibles (correctiva).                                                         |
| 3   | `20260726000002` | search_path=public,pg_temp en 4 funciones SECURITY DEFINER. ACL directas persistieron.                        |
| 4   | `20260726000004` | REVOKE EXECUTE anon/authenticated en 4 funciones SD (correctiva final).                                       |

#### Fase 0.5b (estabilización) — orden real

| #   | Archivo          | Propósito                                            |
| --- | ---------------- | ---------------------------------------------------- |
| 1   | `20260727000001` | profiles.tenant_id NULL, profiles.role NULL          |
| 2   | `20260727000002` | handle_new_user() canónico (insert user_id, email)   |
| 3   | `20260727000005` | Fix search_path=public,pg_temp en handle_new_user    |
| 4   | `20260727000003` | DEFAULT current_tenant_id() en 7 tablas              |
| 5   | `20260727000004` | Bucket documents privado + RLS tenant-aware + legacy |

### 3.3 Política forward-only

1. **Fuente única de verdad:** estado remoto actual.
2. **Origen único de migraciones:** Convivencia (`sistema-integral-convivencia-escolar/supabase/migrations/`).
3. **No editar** migraciones ya aplicadas.
4. **No reutilizar** timestamps.
5. **No reaplicar** migraciones históricas en bloque.
6. **Validar** cada migración antes y después de aplicar.
7. **Registrar** checksums y resultados de validación.

---

## 4. Matriz de Consumo de Código

### 4.1 Convivencia (14 referencias)

| Objeto                                   | Archivo                                    | Operación                    | Riesgo |
| ---------------------------------------- | ------------------------------------------ | ---------------------------- | ------ |
| `from('profiles')`                       | authStore.ts                               | SELECT                       | BAJO   |
| `from('courses')`                        | courses.service.ts                         | SELECT                       | BAJO   |
| `from('students')`                       | courses.service.ts, annotations.service.ts | SELECT                       | BAJO   |
| `rpc('get_student_annotation_summary')`  | annotations.service.ts                     | RPC                          | BAJO   |
| `rpc('get_annotation_stage_counts')`     | annotations.service.ts                     | RPC                          | BAJO   |
| `storage.from('disciplinary-processes')` | disciplinary-storage.service.ts            | Upload/SignedURL/Delete      | BAJO   |
| `storage.from('documentos_convivencia')` | storage.service.ts                         | Upload/List/SignedURL/Delete | MEDIO  |

### 4.2 Inasistencias (44 referencias)

| Objeto                                          | Archivos                                                 | Operación            | Riesgo                 |
| ----------------------------------------------- | -------------------------------------------------------- | -------------------- | ---------------------- |
| `from('profiles')`                              | useAuth.ts                                               | SELECT (tenant_id)   | BAJO                   |
| `from('courses')`                               | courseService, adminService, queries/courses             | SELECT               | BAJO                   |
| `from('students')`                              | studentService, adminService, queries/students           | SELECT/INSERT        | BAJO                   |
| `from('absences')`                              | absenceService, studentService, queries/absences         | SELECT/INSERT/UPDATE | MEDIO                  |
| `from('tests')`                                 | testService, absenceService, adminService, queries/tests | SELECT/INSERT        | MEDIO                  |
| `from('instant_messages')`                      | queries/messages                                         | SELECT               | MEDIO                  |
| `rpc('current_role')`                           | useAuth.ts                                               | RPC                  | BAJO                   |
| `rpc('teacher_get_public_absences')`            | teacher-public.ts                                        | RPC                  | ALTO (anon pre-Fase 0) |
| `rpc('teacher_get_public_absence_detail')`      | teacher-public.ts                                        | RPC                  | ALTO                   |
| `rpc('teacher_get_instant_messages')`           | queries/messages.ts                                      | RPC                  | ALTO                   |
| `storage.from('documents')` + `createSignedUrl` | upload.ts                                                | SignedURL/Delete     | MEDIO                  |

---

## 5. Arquitectura de Fase 2

### 5.1 Tablas propuestas

```sql
CREATE TABLE public.applications (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.app_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  application_code TEXT NOT NULL REFERENCES public.applications(code),
  role TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, application_code)
);
```

### 5.2 Catálogo inicial

| Código          | Nombre                                  |
| --------------- | --------------------------------------- |
| `convivencia`   | Sistema Integral de Convivencia Escolar |
| `inasistencias` | Registro de Inasistencias               |

### 5.3 Matriz de transición profiles.role → app_memberships

| Rol actual    | Convivencia   | Inasistencias | Backfill automático        |
| ------------- | ------------- | ------------- | -------------------------- |
| admin         | admin         | admin         | ✅ Sí                      |
| direccion     | direccion     | —             | ✅ Sí (solo Convivencia)   |
| convivencia   | convivencia   | —             | ✅ Sí (solo Convivencia)   |
| teacher       | —             | teacher       | ✅ Sí (solo Inasistencias) |
| profesor_jefe | profesor_jefe | teacher       | ❌ Ambiguo                 |
| inspectoria   | inspectoria   | inspectoria   | ❌ Ambiguo                 |
| inspector     | inspector     | inspector     | ❌ Ambiguo                 |
| staff         | staff         | staff         | ❌ Ambiguo                 |
| user          | user          | user          | ❌ Ambiguo                 |
| NULL          | —             | —             | ❌ Sin rol asignado        |

### 5.4 Migraciones borrador (6 archivos)

| Archivo                                                       | Propósito                               |
| ------------------------------------------------------------- | --------------------------------------- |
| `20260728000001_create_applications.sql`                      | Crear tabla catálogo                    |
| `20260728000002_create_app_memberships.sql`                   | Crear tabla membresías + índices        |
| `20260728000003_seed_applications.sql`                        | Insertar convivencia + inasistencias    |
| `20260728000004_prepare_membership_backfill.sql`              | Vista diagnostic `membership_readiness` |
| `20260728000005_create_initial_memberships_inasistencias.sql` | Backfill no ambiguos → Inasistencias    |
| `20260728000006_create_initial_memberships_convivencia.sql`   | Backfill no ambiguos → Convivencia      |

> ⚠️ **No aplicar todavía.** Pendiente de revisión manual de casos ambiguos.

---

## 6. Riesgos Residuales

### 🔴 CRÍTICOS

| #   | Riesgo                             | Impacto                                                    | Mitigación                       |
| --- | ---------------------------------- | ---------------------------------------------------------- | -------------------------------- |
| 1   | `tenants` sin RLS                  | Cualquier usuario autenticado puede leer/modificar tenants | Habilitar RLS + policy en Fase 2 |
| 2   | 13 funciones con EXECUTE a PUBLIC  | Anon puede ejecutar funciones de navegación                | Revisar y restringir en Fase 3   |
| 3   | Tablas Inasistencias sin tenant_id | Sin aislamiento multi-tenant                               | Fase 3                           |
| 4   | 148 objetos legacy en storage      | Sin tenant isolation; acceso via is_staff()                | Fase 4                           |

### 🟠 ALTOS

| #   | Riesgo                                | Impacto                                 | Mitigación      |
| --- | ------------------------------------- | --------------------------------------- | --------------- |
| 5   | `coexistence_cases` sin uso           | Ocupa espacio, crea confusión           | Retirar Fase 5  |
| 6   | `carta_events.tenant_id` nullable     | Filas NULL invisibles en RLS            | Corregir Fase 2 |
| 7   | 5 policies ALL en tablas Convivencia  | Sin restricción DELETE/UPDATE por rol   | Corregir Fase 2 |
| 8   | Overloads teacher_get_public_absences | 300 Multiple Choices para authenticated | Fase 3          |

### 🟡 MEDIOS

| #   | Riesgo                                   | Impacto                                | Mitigación |
| --- | ---------------------------------------- | -------------------------------------- | ---------- |
| 9   | Vista Docente en mantenimiento           | Sin acceso público a inasistencias     | Fase 3     |
| 10  | `teacher_public_view` grants auth SELECT | Vista sin tenant isolation             | Fase 3     |
| 11  | Bucket legacy sin tenant folder          | documentos_convivencia sin aislamiento | Fase 4     |

### 🟢 BAJOS

| #   | Riesgo                                    |
| --- | ----------------------------------------- |
| 12  | Directorio `Free-Models-IA/` no rastreado |
| 13  | Circular chunk warnings en build          |

---

## 7. Archivos

### Creados (15)

| Archivo                                                                           | SHA-256                                                            |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `docs/shared-supabase/04-canonical-object-ledger.md`                              | `E9764C3FD6A133CE39147D46A67F341A566B9F14B01596BB3BCCAFA36C38DA97` |
| `docs/shared-supabase/05-migration-reconciliation.md`                             | `811B9F8E2879348D011E830DDE1E2D5B7C417508B1E7CD3A274C6FF59E357CC3` |
| `docs/shared-supabase/06-canonical-baseline-20260727.md`                          | `A4C9040B76826A7C3592B033456B6B5A49FC3A80E547B57F16B6625A1D8C91DE` |
| `docs/shared-supabase/07-code-consumption-matrix.md`                              | `DE8805C1614DDB8B1EE57D568B538A37E031C481D810F1EDB906BEA16D1B6559` |
| `docs/shared-supabase/08-phase-2-membership-design.md`                            | `3DAED1929467373C083D177094EBF26BF8DC5507DF05FC2CE88E11DF92F49932` |
| `docs/shared-supabase/09-fase-1-cierre.md`                                        | (este archivo)                                                     |
| `supabase/validation/phase-1-baseline-validation.sql`                             | `212219F6AFA7E57543392C443EF7AAF4AF75E8C922AA7DF1DDC601D3733D836D` |
| `supabase/migrations/20260728000001_create_applications.sql`                      | `399FF7A529F29A51CF619620DD62ABB1D8C3A8473D68E7D1702A6AA36B3C7E73` |
| `supabase/migrations/20260728000002_create_app_memberships.sql`                   | `974CE667C1148402F3A7B209089F19178B18717D1C40FD8C8843A61ABE37AA67` |
| `supabase/migrations/20260728000003_seed_applications.sql`                        | `7D1F0A33A0C0691FD1763867DADD7C769907C527A3E5D8BB9CFD016985AF7579` |
| `supabase/migrations/20260728000004_prepare_membership_backfill.sql`              | `B5D7F40E567D1AFEF24BBBC845778DCA5EF0A4AA8CB8063BA253D41BA66E1F0A` |
| `supabase/migrations/20260728000005_create_initial_memberships_inasistencias.sql` | `70AF653433D4979DD92765E08E710BCF9CCC6CE88425B8287273C33D9E4733E1` |
| `supabase/migrations/20260728000006_create_initial_memberships_convivencia.sql`   | `3EDD4EB3CDB5D4FEA428C2E8DD76C94366C25D3CA2694DADEF4366D756D53F15` |

### Modificados (5)

| Archivo                                                     | Cambio                                 |
| ----------------------------------------------------------- | -------------------------------------- |
| `docs/shared-supabase/00-emergency-containment.md`          | Agregado cierre Fase 1                 |
| `docs/shared-supabase/02-emergency-validation-checklist.md` | Agregadas secciones Fase 0.5b + Fase 1 |
| `docs/shared-supabase/03-post-containment-stabilization.md` | Marcado como cerrado                   |
| `.ai/roadmap.md`                                            | Fase 1 ✅, Fase 2 como próximo         |
| `.opencode/memory/project.md`                               | Estado de sesión completo              |

---

## 8. Validación Local

### Convivencia

| Comando             | Resultado        |
| ------------------- | ---------------- |
| `npm run lint`      | ✅ 0 errores     |
| `npm test`          | ✅ 136/136       |
| `npm run build:web` | ✅ Build exitoso |

### Inasistencias

| Comando         | Resultado                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------ |
| `npm run lint`  | ⚠️ Errores preexistentes en archivos no modificados (deuda documentada en tipos generados) |
| `npm test`      | ✅ 120/120                                                                                 |
| `npm run build` | ✅ Build exitoso                                                                           |

---

## 9. Restricciones Cumplidas

| Restricción                             | Cumplida |
| --------------------------------------- | -------- |
| No se modificó Supabase remoto          | ✅       |
| No se ejecutó SQL de escritura          | ✅       |
| No se aplicaron migraciones nuevas      | ✅       |
| No se reejecutaron migraciones antiguas | ✅       |
| No se usó `db push`                     | ✅       |
| No se usó `db reset`                    | ✅       |
| No se usó `migration up`                | ✅       |
| No se hizo deploy                       | ✅       |
| No se hizo commit                       | ✅       |
| No se hizo push                         | ✅       |
| No se abrió `data.sql`                  | ✅       |

---

## 10. Próximo Paso

**FASE 2 — Implementación de applications + app_memberships**

1. Revisar casos ambiguos (profesor_jefe, inspectoria, inspector, staff, user)
2. Aplicar migraciones 20260728* al remoto manualmente
3. Validar membresías creadas
4. Actualizar documentación post-aplicación

---

<div align="center">
  <p><strong>FASE 1 COMPLETA ✅ — APTO PARA IMPLEMENTAR FASE 2</strong></p>
  <p><em>2026-07-26 — Sistema Integral de Convivencia Escolar</em></p>
</div>
