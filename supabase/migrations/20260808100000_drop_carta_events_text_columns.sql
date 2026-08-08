-- DB-01 (fase final): drop de columnas text legacy y renames cosméticos.
--
-- Aplica SOLO después de la ventana de observación (24-72h) posterior a
-- 20260808000000_swap_carta_events_uuid_final.sql y tras validar los smoke
-- tests (crear carta, timeline, dashboard stage counts, ranking cursos,
-- constancia física RPC, anotaciones → carta_events).
--
-- Al dropar las columnas *_text_old, PostgreSQL elimina automáticamente los
-- índices que dependan exclusivamente de ellas; los restantes ya fueron
-- removidos en la migración swap (idx_carta_events_carta_id,
-- idx_carta_events_student_id, idx_carta_events_tenant_student_created,
-- idx_carta_events_tenant_carta_student_type).

-- 1. Drop de columnas text legacy
ALTER TABLE public.carta_events DROP COLUMN IF EXISTS carta_id_text_old;
ALTER TABLE public.carta_events DROP COLUMN IF EXISTS student_id_text_old;

-- 2. Renames cosméticos: FKs que conservan sufijo _uuid del período dual-write.
-- Las FKs siguieron el rename automático y ahora referencian las columnas
-- canónicas carta_id/student_id; solo se ajusta el nombre del constraint.
ALTER TABLE public.carta_events
  RENAME CONSTRAINT fk_carta_events_carta_id_uuid TO fk_carta_events_carta_id;
ALTER TABLE public.carta_events
  RENAME CONSTRAINT fk_carta_events_student_id_uuid TO fk_carta_events_student_id;

-- 3. Renames cosméticos de índices que seguían el rename de las columnas uuid.
-- idx_carta_events_tenant_carta_student no requiere cambio: su nombre ya no
-- contiene _uuid y ahora indexa las columnas canónicas.
ALTER INDEX public.idx_carta_events_carta_id_uuid_created_at
  RENAME TO idx_carta_events_carta_id_created_at;
ALTER INDEX public.idx_carta_events_student_id_uuid_created_at
  RENAME TO idx_carta_events_student_id_created_at;
