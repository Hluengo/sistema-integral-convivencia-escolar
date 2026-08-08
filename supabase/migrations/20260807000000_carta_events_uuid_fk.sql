-- DB-01: Migración carta_events.carta_id / student_id TEXT → UUID con FKs
--
-- Contexto: carta_id y student_id son TEXT referenciando UUIDs de
-- cartas_disciplinarias.id y students.id. Esto causa casts implícitos,
-- riesgo de errores silenciosos y pobre indexing.
--
-- Estrategia: columnas nuevas UUID → backfill validado → FKs → swap en ventana.
-- Validación previa: 227 filas, 100% formato UUID válido, 100% referencias existentes.

-- 1. Agregar columnas UUID nuevas (nullable para backfill seguro)
ALTER TABLE public.carta_events
  ADD COLUMN carta_id_uuid uuid NULL,
  ADD COLUMN student_id_uuid uuid NULL;

-- 2. Backfill con validación estricta
-- Solo actualizar donde el cast es válido Y existe la FK referenciada
UPDATE public.carta_events
SET carta_id_uuid = carta_id::uuid
WHERE carta_id ~ '^[0-9a-fA-F-]{36}$'
  AND EXISTS (SELECT 1 FROM public.cartas_disciplinarias WHERE id = carta_id::uuid);

UPDATE public.carta_events
SET student_id_uuid = student_id::uuid
WHERE student_id ~ '^[0-9a-fA-F-]{36}$'
  AND EXISTS (SELECT 1 FROM public.students WHERE id = student_id::uuid);

-- 3. Verificación de integridad post-backfill
-- Debe ser 0 filas sin backfill (todas las 227 válidas)
DO $$
DECLARE
  missing_carta int;
  missing_student int;
BEGIN
  SELECT COUNT(*) INTO missing_carta
  FROM public.carta_events
  WHERE carta_id_uuid IS NULL;
  
  SELECT COUNT(*) INTO missing_student
  FROM public.carta_events
  WHERE student_id_uuid IS NULL;
  
  IF missing_carta > 0 OR missing_student > 0 THEN
    RAISE EXCEPTION 'Backfill incompleto: % filas sin carta_id_uuid, % sin student_id_uuid', missing_carta, missing_student;
  END IF;
END $$;

-- 4. Índices compuestos para patrones de lectura frecuentes
CREATE INDEX IF NOT EXISTS idx_carta_events_carta_id_uuid_created_at
  ON public.carta_events (carta_id_uuid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_carta_events_student_id_uuid_created_at
  ON public.carta_events (student_id_uuid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_carta_events_tenant_carta_student
  ON public.carta_events (tenant_id, carta_id_uuid, student_id_uuid);

-- 5. Foreign Keys (validan integridad referencial)
ALTER TABLE public.carta_events
  ADD CONSTRAINT fk_carta_events_carta_id_uuid
  FOREIGN KEY (carta_id_uuid) REFERENCES public.cartas_disciplinarias (id)
  ON DELETE CASCADE;

ALTER TABLE public.carta_events
  ADD CONSTRAINT fk_carta_events_student_id_uuid
  FOREIGN KEY (student_id_uuid) REFERENCES public.students (id)
  ON DELETE CASCADE;

-- 6. Comentarios para auditoría
COMMENT ON COLUMN public.carta_events.carta_id_uuid IS 'FK a cartas_disciplinarias.id (UUID). Reemplaza carta_id (TEXT) en swap futuro.';
COMMENT ON COLUMN public.carta_events.student_id_uuid IS 'FK a students.id (UUID). Reemplaza student_id (TEXT) en swap futuro.';

-- NOTA: El swap final (DROP columnas TEXT, RENAME UUID columns) debe hacerse
-- en ventana de mantenimiento coordinada, actualizando código cliente simultáneamente.
-- Ver cartas.service.ts y queries relacionadas.