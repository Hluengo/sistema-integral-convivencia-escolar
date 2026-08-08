---
name: DB-01 — Migración carta_events → UUID + seed fix
about: PR para el swap final de carta_events (TEXT → UUID)
title: '[DB-01] Migración carta_events → UUID + seed fix'
labels: ['database', 'migration', 'DB-01']
assignees: ''
---

## Qué

Añade las migraciones para normalizar `carta_events.carta_id` / `student_id` a UUID y elimina la deuda técnica de las columnas text legacy:

- `supabase/migrations/20260807000000_carta_events_uuid_fk.sql` — migración dual-write previa (columnas `carta_id_uuid`/`student_id_uuid`, backfill, FKs ON DELETE CASCADE). **Ya aplicada en remoto.**
- `supabase/migrations/20260808000000_swap_carta_events_uuid_final.sql` — swap final: backfill defensivo, precheck estricto, RENAME text → `*_text_old` y `*_uuid` → canónicos, `SET NOT NULL`, drop de 4 índices text, rewrite de 3 funciones SQL (`get_annotation_course_stage_counts`, `get_annotation_stage_counts`, `register_physical_carta`).
- `supabase/migrations/20260808100000_drop_carta_events_text_columns.sql` — drop final de columnas text legacy + renames cosméticos de FKs/índices (aplica **después** de la ventana de observación 24–72h).
- `supabase/seed.sql` — corrige `ON CONFLICT (id)` → `ON CONFLICT (id, causa_id)` en `checklist_items` (PK compuesta; el seed fallaba con `42P10`).
- `scripts/run_swap_carta_events.sh` — runbook automatizado (backup, prechecks, swap, postchecks, drop, rollback) para ejecutar en ventana de mantenimiento.
- `src/shared/api/services/cartas.service.ts` — limpieza del cliente: sin referencias `carta_id_uuid`/`student_id_uuid`.

## Por qué

- Normalizar las FKs a UUID (coherentes con `cartas_disciplinarias.id` y `students.id`).
- Eliminar casts `::text` en funciones y comparaciones del cliente.
- Reducir deuda técnica (columnas duplicadas `text` + `uuid`).
- El seed local no podía completarse (`supabase db reset` fallaba), bloqueando smoke tests locales.

## Cómo validar (staging / local)

```bash
# Stack local completo (migraciones + seed)
supabase db reset --local

# Cliente
npm run lint && npm run typecheck && npm run test

# Sin referencias residuales *_uuid
grep -rE "carta_id_uuid|student_id_uuid" src/ server/  # => sin coincidencias
```

## Riesgos y mitigación

| Riesgo                                | Mitigación                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Pérdida de datos durante swap         | Backup single-table obligatorio (`pg_dump -t public.carta_events -Fc`) + prechecks abortan si hay NULLs/huérfanos   |
| Escrituras concurrentes durante swap  | Ventana de mantenimiento + jobs/cron pausados                                                                       |
| Regresión en queries (cast implícito) | Rewrite de las 3 funciones SQL en la migración swap; `get_course_carta_ranking` verificado (no toca `carta_events`) |
| Inconsistencia post-swap              | Observación 24–72h antes del drop final; rollback vía `pg_restore --clean`                                          |
| Seed roto                             | Fix `ON CONFLICT (id, causa_id)`                                                                                    |

## Notas para el ejecutor

- `supabase db push` **no** soporta `--file`; aplicar el swap con `psql -f` o con el directorio de migraciones completo.
- Orden remoto: `20260807000000` (ya aplicada) → swap (ventana 1) → drop (ventana 2, +24–72h).

## Checklist

- [ ] PR merged + build passing
- [ ] Backup creado y verificado
- [ ] Prechecks == 0
- [ ] Jobs pausados; equipo en call
- [ ] Swap aplicado sin errores
- [ ] Postchecks == 0
- [ ] Smoke tests OK
- [ ] Monitor 24–72h OK
- [ ] Drop aplicado
- [ ] Documentado en `.opencode/memory/project.md`
