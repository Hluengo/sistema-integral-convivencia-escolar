# Database Schema

**Supabase Project**: `jjzwwhnofiepvliugowr` — "Registro Inasistencia"
**PostgreSQL**: 17.6.1
**Region**: us-west-2

## Tablas (16)

| # | Tabla | Propósito | RLS | Migración |
|---|-------|-----------|-----|-----------|
| 1 | `tenants` | Establecimientos educacionales | ✅ | 17001 |
| 2 | `profiles` | Usuarios del sistema | ✅ | 16100200 |
| 3 | `students` | Estudiantes | ✅ | 00002 |
| 4 | `courses` | Cursos | ✅ | 00002 |
| 5 | `causas` | Casos disciplinarios | ✅ | 00002 |
| 6 | `bitacora_entries` | Historial de casos | ✅ | 00002 |
| 7 | `checklist_items` | Checklist debido proceso | ✅ | 00002 |
| 8 | `inspectorate_records` | Anotaciones | ✅ | 00002 |
| 9 | `cartas_disciplinarias` | Cartas emitidas | ✅ | 16100100 |
| 10 | `etapas_disciplinarias` | Etapas del proceso | ✅ | 16100100 |
| 11 | `document_templates` | Prompts AI | ✅ | 23001 |
| 12 | `document_analyses` | Análisis PDF | ✅ | 23002 |
| 13 | `disciplinary_processes` | Procesos desde PDF | ✅ | 241000 |
| 14 | `disciplinary_process_files` | PDFs adjuntos | ✅ | 251000 |
| 15 | `disciplinary_annotations_detected` | Anotaciones parseadas | ✅ | 251000 |
| 16 | `disciplinary_rules` | Reglas de cartas | ✅ | 241000 |

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

| Función | Propósito |
|---------|-----------|
| `current_app_role()` | Rol del usuario actual |
| `is_staff()` | Check staff-level role |
| `current_tenant_id()` | Tenant actual (JWT fast path) |
| `get_student_annotation_summary()` | Dashboard summary |
| `get_annotation_stage_counts()` | Conteo por etapa |
| `get_usage_stats(since, until)` | Stats de uso |
| `get_daily_active_users(since, until)` | DAU |
| `get_latest_analysis(p_student_id)` | Último análisis PDF |
| `generate_process_number(p_tenant_id)` | Número DP-YYYY-NNNN |
| `get_suggested_letter_type(...)` | Sugerencia de carta |

## Triggers

| Trigger | Tabla | Evento | Función |
|---------|-------|--------|---------|
| `on_auth_user_created` | `auth.users` | AFTER INSERT | `handle_new_user()` |
| `trg_profiles_sync_tenant_to_jwt` | `profiles` | AFTER INSERT OR UPDATE | `sync_tenant_to_jwt()` |
| `trigger_..._updated_at` | `disciplinary_processes` | BEFORE UPDATE | `update_updated_at_column()` |
| `trigger_..._updated_at` | `disciplinary_rules` | BEFORE UPDATE | `update_updated_at_column()` |
