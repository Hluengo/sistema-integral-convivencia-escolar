-- DB-01 (swap final): carta_events.carta_id / student_id pasan a UUID canónico.
--
-- Contexto: la migración 20260807000000 agregó carta_id_uuid/student_id_uuid
-- (UUID), backfill 227/227 filas, 3 índices y 2 FKs ON DELETE CASCADE.
-- Este swap final, en ventana de mantenimiento coordinada con el código
-- cliente (cartas.service.ts deja de escribir/leer *_uuid), completa el cambio:
--
--   1) Backfill defensivo de *_uuid desde las columnas text (cubre entornos
--      sembrados con seed que no pobló *_uuid) y precheck estricto.
--   2) RENAME: text → *_text_old, uuid → nombres canónicos. Los índices y
--      FKs siguen automáticamente el rename.
--   3) SET NOT NULL en las columnas canónicas (restaura invariante original).
--   4) Drop de índices que quedan sobre las columnas text (*_text_old).
--   5) Rewrite de las 3 funciones SQL que comparaban/insertaban TEXT, para
--      operar uuid = uuid sin casts implícitos.
--
-- La observación post-swap dura 24-72h; el DROP de *_text_old y los renames
-- cosméticos viven en 20260808100000_drop_carta_events_text_columns.sql.

-- 1a. Backfill defensivo: completa *_uuid desde text donde el cast es válido
-- y la FK referenciada existe (mismo patrón validado de 20260807000000).
-- Útil cuando un entorno local fue sembrado con seed canónico pre-swap.
UPDATE public.carta_events
SET carta_id_uuid = carta_id::uuid
WHERE carta_id_uuid IS NULL
  AND carta_id ~ '^[0-9a-fA-F-]{36}$'
  AND EXISTS (SELECT 1 FROM public.cartas_disciplinarias WHERE id = carta_id::uuid);

UPDATE public.carta_events
SET student_id_uuid = student_id::uuid
WHERE student_id_uuid IS NULL
  AND student_id ~ '^[0-9a-fA-F-]{36}$'
  AND EXISTS (SELECT 1 FROM public.students WHERE id = student_id::uuid);

-- 1b. Precheck estricto: el swap se aborta si queda alguna fila sin uuid.
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
    RAISE EXCEPTION 'Swap abortado: % filas sin carta_id_uuid, % sin student_id_uuid', missing_carta, missing_student;
  END IF;
END $$;

-- 2. RENAME: las columnas text pasan a *_text_old y las uuid a canónicas.
-- Los índices y FKs asociados se reasocian automáticamente a las nuevas
-- columnas (idx_carta_events_carta_id_uuid_created_at indexará carta_id).
ALTER TABLE public.carta_events RENAME COLUMN carta_id TO carta_id_text_old;
ALTER TABLE public.carta_events RENAME COLUMN student_id TO student_id_text_old;
ALTER TABLE public.carta_events RENAME COLUMN carta_id_uuid TO carta_id;
ALTER TABLE public.carta_events RENAME COLUMN student_id_uuid TO student_id;

-- 3. Restaurar la invariante NOT NULL de las columnas canónicas.
ALTER TABLE public.carta_events ALTER COLUMN carta_id SET NOT NULL;
ALTER TABLE public.carta_events ALTER COLUMN student_id SET NOT NULL;

-- 4. Drop de índices que quedan sobre las columnas text (*_text_old).
-- El baseline creó idx_carta_events_carta_id y idx_carta_events_student_id;
-- 20260803004959 agregó los compuestos idx_carta_events_tenant_student_created
-- e idx_carta_events_tenant_carta_student_type sobre las mismas columnas text.
DROP INDEX IF EXISTS public.idx_carta_events_carta_id;
DROP INDEX IF EXISTS public.idx_carta_events_student_id;
DROP INDEX IF EXISTS public.idx_carta_events_tenant_student_created;
DROP INDEX IF EXISTS public.idx_carta_events_tenant_carta_student_type;

-- 5. Rewrite de funciones: carta_events.carta_id/student_id ahora son uuid.
-- cartas_disciplinarias.id/student_id ya eran uuid; se comparan directo.

CREATE OR REPLACE FUNCTION public.get_annotation_course_stage_counts()
RETURNS TABLE("course_id" "uuid", "course_name" "text", "total_students" bigint, "con_carta_count" bigint, "amonestacion_count" bigint, "compromiso_count" bigint, "derivacion_count" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  with tenant_scope as (
    select
      public.current_tenant_id() as tenant_id,
      extract(year from timezone('America/Santiago', now()))::integer as school_year
  ),
  negative_counts as (
    select
      s.id as student_id,
      s.course_id,
      count(ir.id) filter (where ir.type = 'Negativa')::integer as negatives
    from public.students s
    cross join tenant_scope scope
    left join public.inspectorate_records ir
      on ir.student_id = s.id
     and ir.tenant_id = scope.tenant_id
    where s.tenant_id = scope.tenant_id
      and s.course_id is not null
    group by s.id, s.course_id
  ),
  completed_letters as (
    select
      carta.student_id,
      max(
        case
          when carta.letter_type in ('Ficha de Derivación', 'Derivación a Convivencia Escolar') then 3
          when carta.letter_type = 'Carta de Compromiso Conductual' then 2
          when carta.letter_type = 'Amonestación Escrita' then 1
          else 0
        end
      )::integer as completed_rank
    from public.cartas_disciplinarias carta
    cross join tenant_scope scope
    where carta.tenant_id = scope.tenant_id
      and carta.status <> 'Anulada'
      and coalesce(carta.school_year, extract(year from carta.emission_date)::integer) = scope.school_year
      and (
        carta.origin = 'physical'
        or exists (
          select 1
          from public.carta_events event
          where event.carta_id = carta.id
            and event.student_id = carta.student_id
            and event.tenant_id = carta.tenant_id
            and event.event_type in ('registered', 'printed', 'processed_manually')
        )
      )
    group by carta.student_id
  ),
  classified as (
    select
      nc.course_id,
      greatest(
        case
          when nc.negatives >= 15 then 3
          when nc.negatives >= 10 then 2
          when nc.negatives >= 5 then 1
          else 0
        end,
        coalesce(cl.completed_rank, 0)
      ) as effective_rank
    from negative_counts nc
    left join completed_letters cl on cl.student_id = nc.student_id
  )
  select
    course.id as course_id,
    course.name as course_name,
    count(classified.*)::bigint as total_students,
    count(*) filter (where classified.effective_rank > 0)::bigint as con_carta_count,
    count(*) filter (where classified.effective_rank = 1)::bigint as amonestacion_count,
    count(*) filter (where classified.effective_rank = 2)::bigint as compromiso_count,
    count(*) filter (where classified.effective_rank = 3)::bigint as derivacion_count
  from classified
  join public.courses course
    on course.id = classified.course_id
   and course.tenant_id = public.current_tenant_id()
  group by course.id, course.name
  order by
    count(*) filter (where classified.effective_rank > 0) desc,
    count(*) desc,
    course.name asc;
$$;

CREATE OR REPLACE FUNCTION public.get_annotation_stage_counts()
RETURNS TABLE("stage" "text", "total_count" bigint, "pending_count" bigint, "processed_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  with tenant_scope as (
    select
      public.current_tenant_id() as tenant_id,
      extract(year from timezone('America/Santiago', now()))::integer as school_year
  ),
  negative_counts as (
    select
      s.id as student_id,
      count(ir.id) filter (where ir.type = 'Negativa')::integer as negatives
    from public.students s
    cross join tenant_scope scope
    left join public.inspectorate_records ir
      on ir.student_id = s.id
     and ir.tenant_id = scope.tenant_id
     and extract(year from timezone('America/Santiago', ir.date_time))::integer = scope.school_year
    where s.tenant_id = scope.tenant_id
    group by s.id
  ),
  completed_letters as (
    select
      c.student_id,
      max(
        case
          when c.letter_type in ('Ficha de Derivación', 'Derivación a Convivencia Escolar') then 3
          when c.letter_type = 'Carta de Compromiso Conductual' then 2
          when c.letter_type = 'Amonestación Escrita' then 1
          else 0
        end
      )::integer as completed_rank
    from public.cartas_disciplinarias c
    cross join tenant_scope scope
    where c.tenant_id = scope.tenant_id
      and c.status <> 'Anulada'
      and coalesce(c.school_year, extract(year from c.emission_date)::integer) = scope.school_year
      and (
        c.origin = 'physical'
        or exists (
          select 1
          from public.carta_events ce
          where ce.carta_id = c.id
            and ce.student_id = c.student_id
            and ce.tenant_id = c.tenant_id
            and ce.event_type in ('registered', 'printed', 'processed_manually')
        )
      )
    group by c.student_id
  ),
  classified as (
    select
      greatest(
        case
          when nc.negatives >= 15 then 3
          when nc.negatives >= 10 then 2
          when nc.negatives >= 5 then 1
          else 0
        end,
        coalesce(cl.completed_rank, 0)
      ) as effective_rank,
      coalesce(cl.completed_rank, 0) as completed_rank
    from negative_counts nc
    left join completed_letters cl on cl.student_id = nc.student_id
    where nc.negatives > 0 or coalesce(cl.completed_rank, 0) > 0
  ),
  aggregated as (
    select
      effective_rank,
      count(*)::bigint as total_count,
      count(*) filter (
        where not (effective_rank > 0 and completed_rank = effective_rank)
      )::bigint as pending_count,
      count(*) filter (
        where effective_rank > 0 and completed_rank = effective_rank
      )::bigint as processed_count
    from classified
    group by effective_rank
  ),
  stage_catalog(stage, stage_rank) as (
    values
      ('sin_carta'::text, 0),
      ('amonestacion'::text, 1),
      ('compromiso'::text, 2),
      ('derivacion'::text, 3)
  )
  select
    catalog.stage,
    coalesce(aggregated.total_count, 0)::bigint,
    coalesce(aggregated.pending_count, 0)::bigint,
    coalesce(aggregated.processed_count, 0)::bigint
  from stage_catalog catalog
  left join aggregated on aggregated.effective_rank = catalog.stage_rank
  order by catalog.stage_rank;
$$;

CREATE OR REPLACE FUNCTION public.register_physical_carta("p_student_id" "uuid", "p_letter_type" "text", "p_emission_date" "date" DEFAULT CURRENT_DATE, "p_observations" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_carta_id uuid;
  v_student_name text;
  v_course_name text;
  v_school_year integer;
  v_created_by text;
begin
  if auth.uid() is null or v_tenant_id is null then
    raise exception 'Authentication and tenant membership are required'
      using errcode = '42501';
  end if;

  if p_letter_type not in (
    'Amonestación Escrita',
    'Carta de Compromiso Conductual'
  ) then
    raise exception 'Unsupported physical letter type'
      using errcode = '22023';
  end if;

  if p_emission_date is null or p_emission_date > current_date then
    raise exception 'Physical letter date must be today or earlier'
      using errcode = '22023';
  end if;

  if length(coalesce(p_observations, '')) > 1000 then
    raise exception 'Physical letter observation is too long'
      using errcode = '22023';
  end if;

  select s.full_name, coalesce(c.name, 'Sin curso')
    into v_student_name, v_course_name
  from public.students s
  left join public.courses c
    on c.id = s.course_id
   and c.tenant_id = s.tenant_id
  where s.id = p_student_id
    and s.tenant_id = v_tenant_id;

  if not found then
    raise exception 'Student not found in the active tenant'
      using errcode = 'P0002';
  end if;

  v_school_year := extract(year from p_emission_date)::integer;
  v_created_by := coalesce(auth.jwt() ->> 'email', auth.uid()::text);

  insert into public.cartas_disciplinarias (
    student_id,
    tenant_id,
    letter_type,
    emission_date,
    status,
    emitted_by,
    supervisor_name,
    apoderado_name,
    annotations_count,
    student_name,
    course,
    regulation_basis,
    observations,
    created_by,
    origin,
    school_year
  )
  values (
    p_student_id,
    v_tenant_id,
    p_letter_type,
    p_emission_date,
    'Vigente',
    'Constancia de documento físico',
    null,
    'No informado',
    0,
    v_student_name,
    v_course_name,
    'Constancia de carta física previa a la implementación de la plataforma',
    nullif(btrim(p_observations), ''),
    v_created_by,
    'physical',
    v_school_year
  )
  returning id into v_carta_id;

  insert into public.carta_events (
    carta_id,
    student_id,
    tenant_id,
    event_type,
    event_detail,
    created_by,
    metadata
  )
  values (
    v_carta_id,
    p_student_id,
    v_tenant_id,
    'registered',
    'Constancia de carta física existente registrada en la ficha disciplinaria.',
    v_created_by,
    jsonb_build_object(
      'origin', 'physical',
      'schoolYear', v_school_year,
      'doesNotChangeAnnotationCount', true
    )
  );

  return v_carta_id;
end;
$$;

-- Los permisos, owners y comentarios de las funciones se conservan con
-- CREATE OR REPLACE; no se alteran grants de anon/authenticated/service_role.
