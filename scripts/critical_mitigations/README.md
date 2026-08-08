# Runbook de Mitigaciones Críticas de Seguridad (2026-08-08)

Mitigaciones aplicadas al proyecto Supabase de producción `mjhbcqwtjzgvqssfiore`
a partir de los hallazgos de `supabase_get_advisors(security)` (auditoría integral
2026-08-08). Los cambios A, B y C se aplicaron **directamente en producción** vía
MCP Supabase y quedan documentados aquí como SQL reproducibles.

---

## Resumen de hallazgos y remediación

| ID     | Hallazgo                                                                                                                                                       | Severidad | Estado              |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------- |
| SEC-A  | `teacher_public_view` expone PII (ausencias + estudiantes + cursos) a `authenticated` sin filtro de tenant y con grants DML                                    | **ERROR** | ✅ Aplicado         |
| SEC-B  | 5 funciones sensibles ejecutables por `anon`/`authenticated` (`set_tenant_id`, `process_audit_log`, `clean_old_logs`, `sync_tenant_to_jwt`, `handle_new_user`) | **WARN**  | ✅ Aplicado         |
| SEC-C  | 5 funciones con `search_path` mutable (`app_role`, `audit_logs_sync_actor_columns`, `get_absence_stats`, `is_management`, `update_updated_at_column`)          | WARN      | ✅ Aplicado         |
| SEC-F  | 8 funciones SECURITY DEFINER sin call sites que exponían PII cross-tenant (nombres completos, observaciones, mensajes) a anon/authenticated                    | WARN      | ✅ Aplicado         |
| SEC-G  | `coexistence_cases` con `GRANT ALL` a anon/authenticated heredado del baseline (tabla no usada por la app)                                                     | INFO      | ✅ Aplicado         |
| SEC-H  | 5 funciones SECURITY DEFINER autenticadas sin call sites que aceptaban `student_id`/`tenant_id` como parámetro (cross-tenant)                                  | WARN      | ✅ Aplicado         |
| SEC-D  | Leaked-password protection deshabilitada                                                                                                                       | WARN      | ⏳ Manual (consola) |
| SEC-E  | Drop final DB-01 (columnas TEXT de `carta_events`)                                                                                                             | —         | ⏳ Diferido 24–72h  |
| PERF-A | Índice duplicado `idx_causas_tenant_updated` (idéntico a `idx_causas_tenant_fecha`)                                                                            | INFO      | ✅ Aplicado         |
| PERF-B | `carta_events_pre_swap_backup` sin primary key                                                                                                                 | INFO      | ✅ Aplicado         |
| PERF-C | 17 foreign keys sin índice (joins + cascadas)                                                                                                                  | INFO      | ✅ Aplicado         |
| PERF-D | 13 políticas RLS con `auth.uid()` por fila (sin initplan)                                                                                                      | WARN      | ✅ Aplicado         |

---

## Pasos A, B, C (aplicados 2026-08-08)

### A) `teacher_public_view` → SECURITY INVOKER + solo lectura

Archivo: [`01_alter_view_to_invoker.sql`](01_alter_view_to_invoker.sql)

La vista dejó de ejecutar como definer y pasa a aplicar las RLS de las tablas
base (`absences`, `students`, `courses`) → filtro por `tenant_id` automático.
Se revocaron los DML sobre la vista y se dejó `SELECT` para `authenticated`.

Verificado en producción:

```sql
SELECT relname, reloptions FROM pg_class WHERE relname = 'teacher_public_view';
-- → {security_invoker=true}
```

### B) REVOKE EXECUTE en funciones sensibles

Archivo: [`02_revoke_grant_functions.sql`](02_revoke_grant_functions.sql)

| Función                   | Uso                                          | Reasignación        |
| ------------------------- | -------------------------------------------- | ------------------- |
| `set_tenant_id(uuid)`     | Cambiar tenant_id de sesión                  | solo `service_role` |
| `process_audit_log()`     | Trigger en `absences`, `students`            | solo `service_role` |
| `clean_old_logs(integer)` | Mantenimiento de logs                        | solo `service_role` |
| `sync_tenant_to_jwt()`    | Trigger en `profiles` (tenía grant a PUBLIC) | solo `service_role` |
| `handle_new_user()`       | Trigger de signup                            | solo `service_role` |

> Los triggers **siguen funcionando**: PostgreSQL no exige EXECUTE del usuario
> que dispara la DML para la invocación interna de la función-trigger.

Verificado: `execute_grantees = postgres,service_role` para las 5.

### C) Endurecer `search_path`

Archivo: [`03_harden_search_path.sql`](03_harden_search_path.sql)

Las 5 funciones reportadas se recrearon con `SET search_path TO 'public', 'pg_temp'`
(mismo patrón del resto del proyecto). `CREATE OR REPLACE` conserva la OID → los
triggers que las invocan (`trigger_causas_updated_at`, `trg_audit_logs_sync_actor_columns`,
etc.) siguen apuntando a la misma función.

> ⚠️ **Bug latente corregido de paso**: `is_management()` original usaba
> `p.id = auth.uid()`, pero `profiles` no tiene columna `id` (usa `user_id`).
> La función nunca pudo devolver `true` por esa vía. Corregido a `p.user_id`.

---

## Pasos pendientes

### SEC-F/H: REVOKE de funciones SECURITY DEFINER sin uso y con riesgo cross-tenant

Aplicado en producción. **8 funciones** revocadas de `anon`/`authenticated`
(quedan solo para `service_role`):

| Función                                                         | Riesgo que se eliminó                                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `teacher_get_public_absences(integer,integer,text,uuid)`        | Nombres completos + observaciones de **todos los tenants**                                              |
| `teacher_get_public_absences_masked(integer,integer,text,uuid)` | Idem (variante masked)                                                                                  |
| `teacher_get_public_absence_detail(uuid)`                       | Tests afectados de cualquier ausencia                                                                   |
| `teacher_get_public_courses(text)`                              | Catálogo de cursos cross-tenant                                                                         |
| `teacher_get_public_instant_messages(text,uuid)`                | Mensajes institucionales activos cross-tenant                                                           |
| `teacher_get_instant_messages(text,uuid,uuid)`                  | Mensajes con `student_name` de todos los tenants                                                        |
| `get_teacher_dashboard()`                                       | Rota (vista `teacher_dashboard_absences` inexistente) + sin filtro; **tenía grant a PUBLIC** → revocado |
| `current_role()`                                                | Sin call sites                                                                                          |

**5 funciones** revocadas de `authenticated` (aceptaban `student_id`/`tenant_id`
como parámetro → cross-tenant):

| Función                                                   | Riesgo que se eliminó                    |
| --------------------------------------------------------- | ---------------------------------------- |
| `count_affected_tests(uuid,date,date)`                    | Conteo de tests de estudiante arbitrario |
| `generate_process_number(uuid)`                           | Generar número de proceso de otro tenant |
| `get_suggested_letter_type(integer,integer,integer,uuid)` | Reglas de otro tenant                    |
| `get_usage_stats(timestamp,timestamp)`                    | Estadísticas globales                    |
| `get_daily_active_users(timestamp,timestamp)`             | Métricas globales                        |

**Se mantuvieron** (legítimas): `get_public_dashboard_kpis` (dashboard público
read-only con filtro tenant 'default'), `get_annotation_stage_counts`,
`get_course_carta_ranking`, `get_student_annotation_ranking`,
`get_student_annotation_summary`, `get_teacher_annotation_ranking`,
`current_user_memberships` (usadas vía RPC en la app), y `current_app_role`,
`current_tenant_id`, `has_app_access`, `get_latest_analysis` (filtran por
`auth.uid()`/`current_tenant_id()`).

### SEC-G: limpieza de grants en `coexistence_cases`

Tabla no usada por la app (solo seed/validaciones). RLS habilitado sin policies
(deny-all, seguro). Se revocó el `GRANT ALL` heredado a `anon`/`authenticated` del
baseline; quedó solo `service_role` (mismo patrón que `membership_invitations`).
Ambas tablas mantienen RLS deny-all intencional (INFO de advisors, no es hallazgo
de fuga).

### D) Leaked-password protection (manual, consola)

No hay API/MCP para este toggle. **Acción manual de Ops**:

1. Supabase Dashboard → proyecto → **Authentication → Security**.
2. Activar **"Leaked password protection"** (verifica contraseñas contra
   HaveIBeenPwned.org).
3. Registrar hora y operador.

### E) Drop final DB-01 (diferido 24–72h)

La migración swap `carta_events` TEXT→UUID se aplicó el **2026-08-08**. El drop
de las columnas `carta_id_text_old` / `student_id_text_old` debe ejecutarse solo
tras observación sin incidentes (mín. 24h, recomendado 72h):

```bash
export DATABASE_URL="postgresql://..."
bash scripts/run_swap_carta_events.sh --drop
```

Migración: `supabase/migrations/20260808100000_drop_carta_events_text_columns.sql`

---

## Pasos PERF (advisors de rendimiento, aplicados 2026-08-08)

### PERF-A: Índice duplicado en `causas`

`idx_causas_tenant_updated` era idéntico a `idx_causas_tenant_fecha`
(`btree (tenant_id, fecha_ultima_actualizacion DESC)`, baseline líneas 2455/2463).
Se eliminó el duplicado:

```sql
DROP INDEX IF EXISTS public.idx_causas_tenant_updated;
```

### PERF-B: Primary key en `carta_events_pre_swap_backup`

La tabla de backup del swap DB-01 no tenía PK. Se agregó sobre `id`
(227/227 filas únicas, sin NULLs):

```sql
ALTER TABLE public.carta_events_pre_swap_backup ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.carta_events_pre_swap_backup
  ADD CONSTRAINT carta_events_pre_swap_backup_pkey PRIMARY KEY (id);
```

### PERF-C: Índices para foreign keys sin cubrir (17 → 0)

Se crearon índices compuestos (tennant + FK) para los patrones de join/cascada
reportados como `unindexed_foreign_keys`:

| Índice                                                                                   | Tabla                               |
| ---------------------------------------------------------------------------------------- | ----------------------------------- |
| `idx_instant_messages_course_id`, `idx_instant_messages_created_by`                      | `instant_messages`                  |
| `idx_notifications_user_id`                                                              | `notifications`                     |
| `idx_report_history_created_by`                                                          | `report_history`                    |
| `idx_institution_documents_uploaded_by`, `idx_institution_documents_archived_by`         | `institution_documents`             |
| `idx_institution_rule_versions_created_by`, `idx_institution_rule_versions_published_by` | `institution_rule_versions`         |
| `idx_institution_settings_updated_by`                                                    | `institution_settings`              |
| `idx_membership_invitations_application_code`                                            | `membership_invitations`            |
| `idx_disciplinary_processes_created_by`                                                  | `disciplinary_processes`            |
| `idx_disciplinary_process_files_uploaded_by`                                             | `disciplinary_process_files`        |
| `idx_disciplinary_annotations_corrected_by`                                              | `disciplinary_annotations_detected` |
| `idx_document_analyses_confirmed_by`, `idx_document_analyses_file_id`                    | `document_analyses`                 |
| `idx_coexistence_cases_curso_id`                                                         | `coexistence_cases`                 |
| `idx_causa_documents_causa_id`                                                           | `causa_documents`                   |

### PERF-D: Initplan en políticas RLS (13 → 0)

Se reescribieron 13 políticas que evaluaban `auth.uid()` por fila, cambiando a
initplan `(select auth.uid())` para que la subconsulta se evalúe una sola vez por
consulta:

- `app_memberships_select_own`
- `audit_events_insert_same_tenant`
- `p_instant_messages_staff_insert`
- `p_profiles_self_select`
- `profiles_tenant_insert`, `profiles_tenant_update`, `profiles_tenant_select`
- `usage_events_insert_own`
- `notifications_insert_own`, `notifications_select_own`, `notifications_update_own`
- `report_history_insert_same_tenant`, `report_history_update_creator`

> Al verificar en `pg_policies`, Postgres normaliza la re-serialización a
> `( SELECT auth.uid() AS uid)` (mayúsculas) — usar `ILIKE '%select auth.uid()%'`.

### Pendientes de rendimiento (documentados, NO accionar a ciegas)

- **`unused_index` (49)**: todos reportan `idx_scan = 0` con tamaño mínimo
  (8–312 KB) — dataset pequeño donde el planificador prefiere seq scan. Los 17
  índices de PERF-C aparecen como "sin uso" hasta tener tráfico real. **No dropar
  sin re-analizar con `pg_stat_user_indexes` tras un periodo de uso real.**
- **`multiple_permissive_policies` (19)**: patrón **intencional** — cada tabla
  tiene una política por tenant + una por staff/superuser combinadas con OR.
  Consolidar cambiaría la semántica RLS; se documenta como decisión de diseño.

---

## Verificación

```bash
# Con conexión a la BD (Docker + DATABASE_URL):
bash scripts/critical_mitigations.sh --verify
# o SQL directo:
psql "$DATABASE_URL" -f scripts/critical_mitigations/04_verify.sql
```

## Notas

- **No** se revocaron las demás funciones SECURITY DEFINER reportadas por los
  advisors: las que quedan para `authenticated` son las que la app usa vía RPC
  (dashboard público read-only, rankings, resúmenes de anotaciones, membresías)
  o las que filtran por `auth.uid()`/`current_tenant_id()` (`current_app_role`,
  `current_tenant_id`, `has_app_access`, `get_latest_analysis`). Evaluar una a
  una antes de cualquier cambio adicional; no revocar a ciegas.
- WARNs INFO restantes (RLS sin policy en `coexistence_cases` y
  `membership_invitations`) son deny-all **intencional** (tablas no usadas por la
  app); los grants de `coexistence_cases` ya se limpiaron a solo service_role.
