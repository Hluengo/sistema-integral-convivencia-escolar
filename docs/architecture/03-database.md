# 03 — Database

> **Referencia detallada:** `docs/architecture/database.md`, `supabase.md`

## Schema

16 tablas multi-tenant con RLS. Supabase PostgreSQL 17.

## Tables

tenants, profiles, students, courses, causas, bitacora_entries, checklist_items, inspectorate_records, cartas_disciplinarias, etapas_disciplinarias, document_templates, document_analyses, disciplinary_processes, disciplinary_process_files, disciplinary_annotations_detected, disciplinary_rules, usage_events

`cartas_disciplinarias` distingue `origin` (`platform` o `physical`) y `school_year`. El RPC `register_physical_carta` registra atómicamente una constancia física y su evento, con ejecución exclusiva para `authenticated`.

`save_bitacora_snapshot` y `save_checklist_snapshot` guardan deltas de bitácora/checklist en una única transacción por colección. Son `security invoker`, resuelven `current_tenant_id()` desde el JWT/RLS y no aceptan `tenant_id` desde el cliente.
