-- DB-02: `carta_events.tenant_id` pasa a NOT NULL.
--
-- Hasta ahora `tenant_id` era nullable, lo que hacía invisibles esas filas bajo
-- las policies RLS (`tenant_id = current_tenant_id()`). Backfill en tres pasos:
--   1. Desde `cartas_disciplinarias` (fuente canónica, tenant_id NOT NULL).
--   2. Desde `students` para eventos que no tienen carta relacionada.
--   3. Eliminación de eventos huérfanos sin carta ni estudiante (basura de log).
-- Luego se aplica SET NOT NULL.

-- 1. Backfill principal: el evento hereda el tenant de su carta.
UPDATE public.carta_events ce
SET tenant_id = cd.tenant_id
FROM public.cartas_disciplinarias cd
WHERE ce.carta_id = cd.id::text
  AND ce.tenant_id IS NULL;

-- 2. Backfill secundario: hereda el tenant del estudiante.
UPDATE public.carta_events ce
SET tenant_id = s.tenant_id
FROM public.students s
WHERE ce.student_id = s.id::text
  AND ce.tenant_id IS NULL;

-- 3. Limpieza de huérfanos: eventos sin carta ni estudiante no aportan
-- trazabilidad válida y quedarían invisibles bajo RLS.
DELETE FROM public.carta_events ce
WHERE ce.tenant_id IS NULL;

-- 4. Garantía estructural.
ALTER TABLE public.carta_events
  ALTER COLUMN tenant_id SET NOT NULL;
