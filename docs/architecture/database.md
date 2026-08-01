# Database Schema

**Supabase Project**: `mjhbcqwtjzgvqssfiore` — "GestionConvivencia"
**PostgreSQL**: 17.6.1
**Region**: us-west-2

## Tablas principales

| #   | Tabla                               | Propósito                              | RLS | Migración      |
| --- | ----------------------------------- | -------------------------------------- | --- | -------------- |
| 1   | `tenants`                           | Establecimientos educacionales         | ✅  | 17001          |
| 2   | `profiles`                          | Usuarios del sistema                   | ✅  | 16100200       |
| 3   | `students`                          | Estudiantes                            | ✅  | 00002          |
| 4   | `courses`                           | Cursos                                 | ✅  | 00002          |
| 5   | `causas`                            | Casos disciplinarios                   | ✅  | 00002          |
| 6   | `bitacora_entries`                  | Historial de casos                     | ✅  | 00002          |
| 7   | `checklist_items`                   | Checklist debido proceso               | ✅  | 00002          |
| 8   | `inspectorate_records`              | Anotaciones                            | ✅  | 00002          |
| 9   | `cartas_disciplinarias`             | Cartas emitidas                        | ✅  | 16100100       |
| 10  | `etapas_disciplinarias`             | Etapas del proceso                     | ✅  | 16100100       |
| 11  | `document_templates`                | Prompts AI                             | ✅  | 23001          |
| 12  | `document_analyses`                 | Análisis PDF                           | ✅  | 23002          |
| 13  | `disciplinary_processes`            | Procesos desde PDF                     | ✅  | 241000         |
| 14  | `disciplinary_process_files`        | PDFs adjuntos                          | ✅  | 251000         |
| 15  | `disciplinary_annotations_detected` | Anotaciones parseadas                  | ✅  | 251000         |
| 16  | `disciplinary_rules`                | Reglas de cartas                       | ✅  | 241000         |
| 17  | `applications`                      | Aplicaciones habilitadas               | ✅  | 28000001       |
| 18  | `app_memberships`                   | Membresías por tenant y aplicación     | ✅  | 28000002       |
| 19  | `audit_events`                      | Auditoría técnica append-only          | ✅  | 31200000       |
| 20  | `membership_invitations`            | Invitaciones de membresía              | ✅  | 31210000       |
| 21  | `notifications`                     | Notificaciones persistentes            | ✅  | 31220000       |
| 22  | `report_history`                    | Historial de generación de reportes    | ✅  | 31230000       |
| 23  | `institution_settings`              | Perfil institucional por tenant        | ✅  | 20260801100000 |
| 24  | `institution_rule_versions`         | Versiones del reglamento institucional | ✅  | 20260801100000 |

La configuración institucional se administra desde el panel del tenant o desde el panel global del superadministrador. Los logos se almacenan en el bucket privado `institution-assets`, con rutas por tenant y límite de 2 MiB. La API genera URLs firmadas.

## Relaciones Principales

```
tenants ─┬── profiles (tenant_id)
         ├── students (tenant_id)
         ├── courses (tenant_id)
         ├── causas (tenant_id)
         ├── bitacora_entries (tenant_id)
         ├── checklist_items (tenant_id)
         ├── inspectorate_records (tenant_id)
         ├── cartas_disciplinarias (tenant_id)
         ├── etapas_disciplinarias (tenant_id)
         ├── document_templates (tenant_id)
         ├── document_analyses (tenant_id)
         ├── disciplinary_processes (tenant_id)
         ├── disciplinary_process_files (tenant_id)
         ├── disciplinary_annotations_detected (tenant_id)
         └── disciplinary_rules (tenant_id)

Cada tenant también tiene configuración institucional (`institution_settings`) y versiones de reglamento (`institution_rule_versions`). La configuración inicial se crea al provisionar un tenant; el contenido del reglamento y el logo deben ser cargados por el establecimiento.

courses ─── students (course_id)
students ─── causas (student_id)
          ─── inspectorate_records (student_id)
          ─── cartas_disciplinarias (student_id)
          ─── etapas_disciplinarias (student_id)
          ─── disciplinary_processes (student_id)
          ─── document_analyses (student_id)

causas ─── bitacora_entries (causa_id)
      ─── checklist_items (causa_id)

disciplinary_processes ─── disciplinary_process_files (process_id)
                      ─── disciplinary_annotations_detected (process_id)
```

## RPCs (Funciones Store)

| Función                                | Propósito                     |
| -------------------------------------- | ----------------------------- |
| `current_app_role()`                   | Rol del usuario actual        |
| `is_staff()`                           | Check staff-level role        |
| `current_tenant_id()`                  | Tenant actual (JWT fast path) |
| `get_student_annotation_summary()`     | Dashboard summary             |
| `get_annotation_stage_counts()`        | Conteo por etapa              |
| `get_usage_stats(since, until)`        | Stats de uso                  |
| `get_daily_active_users(since, until)` | DAU                           |
| `get_latest_analysis(p_student_id)`    | Último análisis PDF           |
| `generate_process_number(p_tenant_id)` | Número DP-YYYY-NNNN           |
| `get_suggested_letter_type(...)`       | Sugerencia de carta           |

## API administrativa institucional

| Método         | Ruta                                          | Acceso                                        |
| -------------- | --------------------------------------------- | --------------------------------------------- |
| GET/PATCH      | `/api/admin/institution`                      | `admin`, `direccion`, `superadmin` del tenant |
| POST           | `/api/admin/institution/logo`                 | `admin`, `direccion`, `superadmin` del tenant |
| GET/POST/PATCH | `/api/admin/rules` y `/api/admin/rules/:id`   | `admin`, `direccion`, `superadmin` del tenant |
| POST           | `/api/admin/rules/:id/publish`                | `admin`, `direccion`, `superadmin` del tenant |
| GET            | `/api/onboarding/status`                      | cualquier usuario autenticado del tenant      |
| GET/PATCH      | `/api/platform/tenants/:tenantId/institution` | solo `superadmin` global                      |

El aislamiento se valida con `npm run test:multitenant` y los permisos de rol en producción con `npm run test:roles`.

## Triggers

| Trigger                           | Tabla                    | Evento                 | Función                      |
| --------------------------------- | ------------------------ | ---------------------- | ---------------------------- |
| `on_auth_user_created`            | `auth.users`             | AFTER INSERT           | `handle_new_user()`          |
| `trg_profiles_sync_tenant_to_jwt` | `profiles`               | AFTER INSERT OR UPDATE | `sync_tenant_to_jwt()`       |
| `trigger_..._updated_at`          | `disciplinary_processes` | BEFORE UPDATE          | `update_updated_at_column()` |
| `trigger_..._updated_at`          | `disciplinary_rules`     | BEFORE UPDATE          | `update_updated_at_column()` |
