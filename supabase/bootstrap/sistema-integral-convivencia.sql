-- Bootstrap consolidado de Supabase para una instalación NUEVA de Sistema Integral de Convivencia Escolar.
-- Generado desde master el 2026-11-20.
-- Incluye el baseline actual y las 92 migraciones activas posteriores, en orden de versión.
-- No incluye supabase/migrations-legacy/ ni supabase/seed.sql: el primero es historial archivado;
-- el segundo crea usuarios de demostración, contraseñas conocidas y datos ficticios.
--
-- USO: ejecutar el archivo completo una sola vez en SQL Editor de un proyecto Supabase recién creado,
-- como postgres. No ejecutar en el proyecto actual, en producción, ni sobre una base con tablas de la app.
-- El bloque inicial aborta si detecta tablas centrales existentes. El script no es idempotente.
--
-- El SQL crea esquema, funciones, políticas RLS, índices, triggers y configuración de Storage.
-- No crea tenants, usuarios Auth ni datos institucionales. Esos datos deben provisionarse después
-- mediante el flujo de alta de la aplicación. No usar supabase/seed.sql en producción.
--
-- Si luego se usará Supabase CLI, iniciar el historial de migraciones del NUEVO proyecto desde este
-- snapshot. No aplicar después las 93 migraciones de este repositorio: repetiría los cambios.
--
-- Cada delimitador SOURCE conserva el archivo de origen para facilitar auditorías.

BEGIN;

DO $bootstrap_guard$
BEGIN
  IF to_regclass('public.tenants') IS NOT NULL
     OR to_regclass('public.profiles') IS NOT NULL
     OR to_regclass('public.courses') IS NOT NULL
     OR to_regclass('public.students') IS NOT NULL
     OR to_regclass('public.causas') IS NOT NULL
     OR to_regclass('public.app_memberships') IS NOT NULL THEN
    RAISE EXCEPTION
      'Este bootstrap solo se ejecuta en un proyecto Supabase nuevo. Usa el flujo de migraciones normal para bases existentes.';
  END IF;
END
$bootstrap_guard$;


-- ===== SOURCE START: supabase/migrations/00000_remote_schema_baseline.sql =====



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."absence_status" AS ENUM (
    'PENDIENTE',
    'JUSTIFICADA'
);


ALTER TYPE "public"."absence_status" OWNER TO "postgres";


CREATE TYPE "public"."education_level" AS ENUM (
    'BASICA',
    'MEDIA'
);


ALTER TYPE "public"."education_level" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'inspector',
    'coordinador',
    'director',
    'superuser'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."app_role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select p.role
  from public.profiles p
  where p.user_id = auth.uid()
$$;


ALTER FUNCTION "public"."app_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_logs_sync_actor_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.performed_by is null and new.changed_by is not null then
    new.performed_by := new.changed_by;
  end if;

  if new.changed_by is null and new.performed_by is not null then
    new.changed_by := new.performed_by;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."audit_logs_sync_actor_columns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clean_old_logs"("days_to_keep" integer DEFAULT 365) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NOT public.is_superuser() THEN
    RAISE EXCEPTION 'Acceso denegado: Se requiere rol Superuser';
  END IF;

  DELETE FROM public.audit_logs
  WHERE created_at < (now() - (days_to_keep || ' days')::interval);

  RETURN 'Logs limpiados exitosamente';
END;
$$;


ALTER FUNCTION "public"."clean_old_logs"("days_to_keep" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_affected_tests"("p_student_id" "uuid", "p_start" "date", "p_end" "date") RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT count(*)
  FROM public.tests t
  JOIN public.students s ON s.course_id = t.course_id
  WHERE s.id = p_student_id
    AND t.date BETWEEN p_start AND p_end;
$$;


ALTER FUNCTION "public"."count_affected_tests"("p_student_id" "uuid", "p_start" "date", "p_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_app_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid()
$$;


ALTER FUNCTION "public"."current_app_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (select p.role from public.profiles p where p.user_id = auth.uid()),
    'teacher'
  );
$$;


ALTER FUNCTION "public"."current_role"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_role"() IS 'Resuelve rol por auth.uid() contra public.profiles. SECURITY DEFINER para evitar falsos teacher por RLS.';



CREATE OR REPLACE FUNCTION "public"."current_tenant_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_claim_tenant TEXT;
  v_profile_tenant UUID;
BEGIN
  -- Usuarios no autenticados no tienen tenant.
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  -- Fast-path: leer tenant_id desde el claim JWT app_metadata.
  BEGIN
    v_claim_tenant := (auth.jwt() ->> 'app_metadata')::jsonb ->> 'tenant_id';
  EXCEPTION WHEN OTHERS THEN
    v_claim_tenant := NULL;
  END;

  IF v_claim_tenant IS NOT NULL
     AND v_claim_tenant ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN
    RETURN v_claim_tenant::uuid;
  END IF;

  -- Fallback: consultar profiles.tenant_id.
  SELECT tenant_id INTO v_profile_tenant
  FROM public.profiles
  WHERE user_id = auth.uid();

  RETURN v_profile_tenant;
END;
$_$;


ALTER FUNCTION "public"."current_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_memberships"() RETURNS TABLE("application_code" "text", "role" "text", "is_active" boolean, "app_is_active" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT
    m.application_code,
    m.role,
    m.is_active,
    a.is_active AS app_is_active
  FROM public.app_memberships m
  JOIN public.applications a ON a.code = m.application_code
  WHERE m.user_id = auth.uid()
    AND m.tenant_id = public.current_tenant_id()
    AND m.is_active = true
    AND a.is_active = true;
$$;


ALTER FUNCTION "public"."current_user_memberships"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_user_memberships"() IS 'Retorna las membresías activas del usuario autenticado en el tenant actual';



CREATE OR REPLACE FUNCTION "public"."generate_process_number"("p_tenant_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_number TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM now())::TEXT;

  SELECT COUNT(*) + 1 INTO v_count
  FROM disciplinary_processes
  WHERE tenant_id = p_tenant_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now());

  v_number := LPAD(v_count::TEXT, 4, '0');

  RETURN 'DP-' || v_year || '-' || v_number;
END;
$$;


ALTER FUNCTION "public"."generate_process_number"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_absence_stats"("p_level" "text", "p_course_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("total" bigint, "justified" bigint, "pending" bigint, "with_tests" bigint, "without_doc" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  WITH base AS (
    SELECT a.id, a.student_id, a.start_date, a.end_date, a.status, a.document_url, s.course_id
    FROM public.absences a
    JOIN public.students s ON s.id = a.student_id
    JOIN public.courses c ON c.id = s.course_id
    WHERE (p_level IS NULL OR c.level = p_level)
      AND (p_course_id IS NULL OR s.course_id = p_course_id)
      AND (
        (p_start_date IS NULL AND p_end_date IS NULL)
        OR (p_start_date IS NULL AND a.start_date <= p_end_date)
        OR (p_end_date IS NULL AND a.end_date >= p_start_date)
        OR (a.start_date <= p_end_date AND a.end_date >= p_start_date)
      )
  )
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'JUSTIFICADA') AS justified,
    COUNT(*) FILTER (WHERE status = 'PENDIENTE') AS pending,
    COUNT(*) FILTER (WHERE document_url IS NULL) AS without_doc,
    COUNT(*) FILTER (
      WHERE EXISTS (
        SELECT 1
        FROM public.tests t
        WHERE t.course_id = base.course_id
          AND t.date >= base.start_date
          AND t.date <= base.end_date
      )
    ) AS with_tests
  FROM base;
$$;


ALTER FUNCTION "public"."get_absence_stats"("p_level" "text", "p_course_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_annotation_course_stage_counts"() RETURNS TABLE("course_id" "uuid", "course_name" "text", "total_students" bigint, "con_carta_count" bigint, "amonestacion_count" bigint, "compromiso_count" bigint, "derivacion_count" bigint)
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
          where event.carta_id = carta.id::text
            and event.student_id = carta.student_id::text
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


ALTER FUNCTION "public"."get_annotation_course_stage_counts"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_annotation_course_stage_counts"() IS 'Tenant-scoped dashboard totals by course for effective annotation carta stages; returns no student data.';



CREATE OR REPLACE FUNCTION "public"."get_annotation_stage_counts"() RETURNS TABLE("stage" "text", "total_count" bigint, "pending_count" bigint, "processed_count" bigint)
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
          where ce.carta_id = c.id::text
            and ce.student_id = c.student_id::text
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


ALTER FUNCTION "public"."get_annotation_stage_counts"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_annotation_stage_counts"() IS 'Live tenant-scoped annotation stages for the current school year, split into pending and processed using current-year completed carta events.';



CREATE OR REPLACE FUNCTION "public"."get_course_carta_ranking"() RETURNS TABLE("course_name" "text", "amonestacion_count" bigint, "compromiso_count" bigint, "derivacion_count" bigint, "total_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  with tenant_scope as (
    select
      public.current_tenant_id() as tenant_id,
      extract(year from timezone('America/Santiago', now()))::integer as school_year
  )
  select
    min(c.course)::text as course_name,
    count(*) filter (where c.letter_type = 'Amonestación Escrita')::bigint as amonestacion_count,
    count(*) filter (where c.letter_type = 'Carta de Compromiso Conductual')::bigint as compromiso_count,
    count(*) filter (where c.letter_type = 'Ficha de Derivación')::bigint as derivacion_count,
    count(*)::bigint as total_count
  from public.cartas_disciplinarias c
  cross join tenant_scope scope
  where c.tenant_id = scope.tenant_id
    and c.status <> 'Anulada'
    and coalesce(c.school_year, extract(year from c.emission_date)::integer) = scope.school_year
  group by lower(btrim(c.course))
  having count(*) > 0
  order by total_count desc, min(c.course) asc
  limit 5;
$$;


ALTER FUNCTION "public"."get_course_carta_ranking"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_course_carta_ranking"() IS 'Tenant-scoped ranking of disciplinary letters for the current school year, aggregated by normalized carta course snapshot and limited to top 5.';



CREATE OR REPLACE FUNCTION "public"."get_daily_active_users"("since" timestamp with time zone DEFAULT ("now"() - '30 days'::interval), "until" timestamp with time zone DEFAULT "now"()) RETURNS TABLE("date" "date", "active_users" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    e.created_at::DATE AS date,
    COUNT(DISTINCT e.user_id)::BIGINT AS active_users
  FROM usage_events e
  WHERE e.created_at >= since
    AND e.created_at <= until
    AND e.user_id IS NOT NULL
  GROUP BY e.created_at::DATE
  ORDER BY date;
$$;


ALTER FUNCTION "public"."get_daily_active_users"("since" timestamp with time zone, "until" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_latest_analysis"("p_student_id" "uuid") RETURNS TABLE("negativas" integer, "positivas" integer, "informativas" integer, "analyzed_at" timestamp with time zone, "file_name" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT da.negativas, da.positivas, da.informativas, da.analyzed_at, da.file_name
  FROM document_analyses da
  WHERE da.student_id = p_student_id
    AND da.tenant_id = public.current_tenant_id()
  ORDER BY da.analyzed_at DESC
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_latest_analysis"("p_student_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_dashboard_kpis"() RETURNS TABLE("total_causes" bigint, "active_causes" bigint, "investigation_causes" bigint, "resolved_causes" bigint, "critical_alerts" bigint, "leve_count" bigint, "grave_count" bigint, "muy_grave_count" bigint, "gravisima_count" bigint, "amonestacion_count" bigint, "compromiso_count" bigint, "derivacion_count" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  with target_tenant as (
    select id from public.tenants where slug = 'default' limit 1
  ),
  causa_counts as (
    select
      count(*)::bigint as total_causes,
      count(*) filter (where c.estado_actual not in ('Causa Cerrada', 'Resolución Ejecutoriada'))::bigint as active_causes,
      count(*) filter (where c.estado_actual ilike '%Investig%' or c.estado_actual ilike '%Indag%')::bigint as investigation_causes,
      count(*) filter (where c.estado_actual in ('Causa Cerrada', 'Resolución Ejecutoriada'))::bigint as resolved_causes,
      0::bigint as critical_alerts,
      count(*) filter (where c.tipo_infraccion = 'Leve')::bigint as leve_count,
      count(*) filter (where c.tipo_infraccion = 'Grave')::bigint as grave_count,
      count(*) filter (where c.tipo_infraccion = 'Muy Grave')::bigint as muy_grave_count,
      count(*) filter (where c.tipo_infraccion = 'Gravísima')::bigint as gravisima_count
    from public.causas c
    join target_tenant t on t.id = c.tenant_id
  ),
  per_student as (
    select ir.student_id, count(*) filter (where ir.type = 'Negativa')::int as negativas
    from public.inspectorate_records ir
    join target_tenant t on t.id = ir.tenant_id
    group by ir.student_id
  ),
  annotation_counts as (
    select
      count(*) filter (where negativas between 5 and 9)::bigint as amonestacion_count,
      count(*) filter (where negativas between 10 and 14)::bigint as compromiso_count,
      count(*) filter (where negativas >= 15)::bigint as derivacion_count
    from per_student
  )
  select
    c.total_causes,
    c.active_causes,
    c.investigation_causes,
    c.resolved_causes,
    c.critical_alerts,
    c.leve_count,
    c.grave_count,
    c.muy_grave_count,
    c.gravisima_count,
    a.amonestacion_count,
    a.compromiso_count,
    a.derivacion_count
  from causa_counts c cross join annotation_counts a;
$$;


ALTER FUNCTION "public"."get_public_dashboard_kpis"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_student_annotation_ranking"() RETURNS TABLE("student_id" "uuid", "student_name" "text", "course_name" "text", "negative_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  with tenant_scope as (
    select
      public.current_tenant_id() as tenant_id,
      extract(year from timezone('America/Santiago', now()))::integer as school_year
  )
  select
    s.id as student_id,
    s.full_name::text as student_name,
    coalesce(c.name, 'Sin curso')::text as course_name,
    count(*)::bigint as negative_count
  from public.students s
  cross join tenant_scope scope
  join public.inspectorate_records ir
    on ir.student_id = s.id
   and ir.tenant_id = scope.tenant_id
   and extract(year from timezone('America/Santiago', ir.date_time))::integer = scope.school_year
  left join public.courses c
    on c.id = s.course_id
   and c.tenant_id = scope.tenant_id
  where s.tenant_id = scope.tenant_id
    and ir.type = 'Negativa'
  group by s.id, s.full_name, c.name
  having count(*) > 0
  order by negative_count desc, s.full_name asc
  limit 5;
$$;


ALTER FUNCTION "public"."get_student_annotation_ranking"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_student_annotation_ranking"() IS 'Tenant-scoped ranking of students by current-school-year negative annotations, grouped by student id, limited to top 5, with course name.';



CREATE OR REPLACE FUNCTION "public"."get_student_annotation_summary"() RETURNS TABLE("id" "uuid", "full_name" "text", "course_id" "uuid", "teacher_id" "uuid", "status" "text", "annotations_count" bigint, "positive_annotations_count" bigint, "informative_annotations_count" bigint, "last_annotation_date" timestamp with time zone, "disciplinary_status" "text", "rut" "text", "course_name" "text", "ai_analysis" "jsonb")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  with tenant_scope as (
    select
      public.current_tenant_id() as tenant_id,
      extract(year from timezone('America/Santiago', now()))::integer as school_year
  )
  select
    s.id,
    s.full_name,
    s.course_id,
    null::uuid as teacher_id,
    'Activo'::text as status,
    coalesce(annotation_totals.negativas, 0)::bigint as annotations_count,
    coalesce(annotation_totals.positivas, 0)::bigint as positive_annotations_count,
    coalesce(annotation_totals.informativas, 0)::bigint as informative_annotations_count,
    annotation_totals.last_date as last_annotation_date,
    case
      when coalesce(annotation_totals.negativas, 0) >= 15 then 'Rojo'
      when coalesce(annotation_totals.negativas, 0) >= 10 then 'Naranja'
      when coalesce(annotation_totals.negativas, 0) >= 5 then 'Amarillo'
      else 'Verde'
    end as disciplinary_status,
    s.rut,
    c.name as course_name,
    latest.analysis_json as ai_analysis
  from public.students s
  cross join tenant_scope scope
  left join public.courses c
    on c.id = s.course_id
   and c.tenant_id = scope.tenant_id
  left join lateral (
    select
      count(*) filter (where ir.type = 'Negativa')::bigint as negativas,
      count(*) filter (where ir.type = 'Positiva')::bigint as positivas,
      count(*) filter (where ir.type = 'Información')::bigint as informativas,
      max(ir.date_time) as last_date
    from public.inspectorate_records ir
    where ir.student_id = s.id
      and ir.tenant_id = scope.tenant_id
      and extract(year from timezone('America/Santiago', ir.date_time))::integer = scope.school_year
  ) annotation_totals on true
  left join lateral (
    select jsonb_build_object(
      'negativas', da.negativas,
      'positivas', da.positivas,
      'informativas', da.informativas,
      'analyzed_at', da.analyzed_at
    ) as analysis_json
    from public.document_analyses da
    where da.student_id = s.id
      and da.tenant_id = scope.tenant_id
    order by da.analyzed_at desc
    limit 1
  ) latest on true
  where s.tenant_id = scope.tenant_id
  order by s.full_name;
$$;


ALTER FUNCTION "public"."get_student_annotation_summary"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_student_annotation_summary"() IS 'Stable tenant-scoped student annotation totals for the current school year only.';



CREATE OR REPLACE FUNCTION "public"."get_suggested_letter_type"("p_negativas" integer, "p_positivas" integer, "p_informativas" integer, "p_tenant_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_suggested TEXT;
BEGIN
  SELECT suggested_letter_type INTO v_suggested
  FROM disciplinary_rules
  WHERE tenant_id = p_tenant_id
    AND is_active = true
    AND (min_negativas IS NULL OR p_negativas >= min_negativas)
    AND (max_negativas IS NULL OR p_negativas <= max_negativas)
    AND (min_positivas IS NULL OR p_positivas >= min_positivas)
    AND (max_positivas IS NULL OR p_positivas <= max_positivas)
    AND (min_informativas IS NULL OR p_informativas >= min_informativas)
    AND (max_informativas IS NULL OR p_informativas <= max_informativas)
  ORDER BY priority DESC
  LIMIT 1;

  RETURN COALESCE(v_suggested, 'none');
END;
$$;


ALTER FUNCTION "public"."get_suggested_letter_type"("p_negativas" integer, "p_positivas" integer, "p_informativas" integer, "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_teacher_annotation_ranking"() RETURNS TABLE("teacher_name" "text", "negative_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  with tenant_scope as (
    select
      public.current_tenant_id() as tenant_id,
      extract(year from timezone('America/Santiago', now()))::integer as school_year
  )
  select
    min(d.teacher_name)::text as teacher_name,
    count(*)::bigint as negative_count
  from public.disciplinary_annotations_detected d
  cross join tenant_scope scope
  where d.tenant_id = scope.tenant_id
    and d.teacher_name is not null
    and d.teacher_name <> ''
    and d.annotation_type = 'Negativa'
    and d.detected_at is not null
    and extract(year from timezone('America/Santiago', d.detected_at))::integer = scope.school_year
  group by lower(btrim(d.teacher_name))
  having count(*) > 0
  order by negative_count desc, min(d.teacher_name) asc
  limit 5;
$$;


ALTER FUNCTION "public"."get_teacher_annotation_ranking"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_teacher_annotation_ranking"() IS 'Tenant-scoped ranking of teachers by dated current-school-year negative annotations.';



CREATE OR REPLACE FUNCTION "public"."get_teacher_dashboard"() RETURNS TABLE("absence_id" "uuid", "start_date" "date", "end_date" "date", "status" "text", "observation" "text", "student_name" "text", "course_name" "text", "course_level" "text", "affected_tests_count" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select * from public.teacher_dashboard_absences
  order by start_date desc;
$$;


ALTER FUNCTION "public"."get_teacher_dashboard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_usage_stats"("since" timestamp with time zone DEFAULT ("now"() - '30 days'::interval), "until" timestamp with time zone DEFAULT "now"()) RETURNS TABLE("event_name" "text", "total_count" bigint, "unique_users" bigint, "last_occurrence" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    e.event_name,
    COUNT(*)::BIGINT AS total_count,
    COUNT(DISTINCT e.user_id)::BIGINT AS unique_users,
    MAX(e.created_at) AS last_occurrence
  FROM usage_events e
  WHERE e.created_at >= since
    AND e.created_at <= until
  GROUP BY e.event_name
  ORDER BY total_count DESC;
$$;


ALTER FUNCTION "public"."get_usage_stats"("since" timestamp with time zone, "until" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, COALESCE(NEW.email, ''))
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_app_access"("p_application_code" "text", "p_roles" "text"[] DEFAULT NULL::"text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_memberships m
    JOIN public.applications a ON a.code = m.application_code
    WHERE m.user_id = auth.uid()
      AND m.tenant_id = public.current_tenant_id()
      AND m.application_code = p_application_code
      AND m.is_active = true
      AND a.is_active = true
      AND (p_roles IS NULL OR m.role = ANY (p_roles))
  );
$$;


ALTER FUNCTION "public"."has_app_access"("p_application_code" "text", "p_roles" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_app_access"("p_application_code" "text", "p_roles" "text"[]) IS 'Verifica si el usuario tiene acceso activo a una aplicación, opcionalmente filtrando por roles';



CREATE OR REPLACE FUNCTION "public"."is_management"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  SELECT public.is_superuser()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('inspector', 'coordinador', 'director')
  );
$$;


ALTER FUNCTION "public"."is_management"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_staff"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select public.current_role() in ('staff', 'superuser');
$$;


ALTER FUNCTION "public"."is_staff"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_superuser"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select public.current_role() = 'superuser';
$$;


ALTER FUNCTION "public"."is_superuser"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_audit_log"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, performed_by, old_data)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, performed_by, old_data, new_data)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, performed_by, new_data)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."process_audit_log"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_physical_carta"("p_student_id" "uuid", "p_letter_type" "text", "p_emission_date" "date" DEFAULT CURRENT_DATE, "p_observations" "text" DEFAULT NULL::"text") RETURNS "uuid"
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
    v_carta_id::text,
    p_student_id::text,
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


ALTER FUNCTION "public"."register_physical_carta"("p_student_id" "uuid", "p_letter_type" "text", "p_emission_date" "date", "p_observations" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."register_physical_carta"("p_student_id" "uuid", "p_letter_type" "text", "p_emission_date" "date", "p_observations" "text") IS 'Registers an existing physical warning or commitment letter without changing annotation counts.';



CREATE OR REPLACE FUNCTION "public"."reject_audit_event_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  raise exception 'audit_events is append-only: UPDATE and DELETE are forbidden';
end;
$$;


ALTER FUNCTION "public"."reject_audit_event_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_tenant_id"("p_tenant_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
END;
$$;


ALTER FUNCTION "public"."set_tenant_id"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_convivencia_membership_from_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if tg_op = 'UPDATE'
     and (
       old.tenant_id is distinct from new.tenant_id
       or old.user_id is distinct from new.user_id
       or old.role is distinct from new.role
     ) then
    update public.app_memberships
    set is_active = false,
        updated_at = now()
    where tenant_id = old.tenant_id
      and user_id = old.user_id
      and application_code = 'convivencia';
  end if;

  if new.tenant_id is not null
     and new.role in (
       'superadmin',
       'admin',
       'direccion',
       'convivencia',
       'inspectoria',
       'profesor_jefe',
       'teacher',
       'inspector',
       'user',
       'staff'
     ) then
    insert into public.app_memberships (
      tenant_id,
      user_id,
      application_code,
      role,
      is_active
    )
    values (new.tenant_id, new.user_id, 'convivencia', new.role, true)
    on conflict (tenant_id, user_id, application_code)
    do update set
      role = excluded.role,
      is_active = true,
      updated_at = now();
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_convivencia_membership_from_profile"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_convivencia_membership_from_profile"() IS 'Synchronizes Convivencia application membership with allowed profile roles for enforced authorization.';



CREATE OR REPLACE FUNCTION "public"."sync_notification"("p_notification_key" "text", "p_notification_type" "text", "p_title" "text", "p_description" "text", "p_severity" "text", "p_entity_type" "text" DEFAULT NULL::"text", "p_entity_id" "text" DEFAULT NULL::"text", "p_action_url" "text" DEFAULT NULL::"text", "p_expires_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_id uuid;
begin
  insert into public.notifications (
    tenant_id, user_id, notification_key, notification_type, title,
    description, severity, entity_type, entity_id, action_url, expires_at
  ) values (
    public.current_tenant_id(), auth.uid(), p_notification_key, p_notification_type, p_title,
    p_description, p_severity, p_entity_type, p_entity_id, p_action_url, p_expires_at
  )
  on conflict (tenant_id, user_id, notification_key)
  do update set
    notification_type = excluded.notification_type,
    title = excluded.title,
    description = excluded.description,
    severity = excluded.severity,
    entity_type = excluded.entity_type,
    entity_id = excluded.entity_id,
    action_url = excluded.action_url,
    expires_at = excluded.expires_at,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."sync_notification"("p_notification_key" "text", "p_notification_type" "text", "p_title" "text", "p_description" "text", "p_severity" "text", "p_entity_type" "text", "p_entity_id" "text", "p_action_url" "text", "p_expires_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_tenant_to_jwt"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('tenant_id', NEW.tenant_id::text)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_tenant_to_jwt"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."teacher_get_instant_messages"("p_level" "text" DEFAULT NULL::"text", "p_course_id" "uuid" DEFAULT NULL::"uuid", "p_student_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "title" "text", "body" "text", "level" "text", "course_id" "uuid", "student_id" "uuid", "student_name" "text", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    m.id,
    m.title,
    m.body,
    m.level,
    m.course_id,
    m.student_id,
    s.full_name as student_name,
    m.starts_at,
    m.ends_at,
    m.created_at
  from public.instant_messages m
  left join public.students s on s.id = m.student_id
  where m.is_active = true
    and m.starts_at <= now()
    and (m.ends_at is null or m.ends_at >= now())
    and (p_level is null or m.level is null or m.level = p_level)
    and (p_course_id is null or m.course_id is null or m.course_id = p_course_id)
    and (p_student_id is null or m.student_id is null or m.student_id = p_student_id)
  order by m.starts_at desc, m.created_at desc;
$$;


ALTER FUNCTION "public"."teacher_get_instant_messages"("p_level" "text", "p_course_id" "uuid", "p_student_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."teacher_get_public_absence_detail"("p_absence_id" "uuid") RETURNS TABLE("id" "uuid", "date" "date", "subject" "text", "type" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    t.id,
    t.date,
    t.subject,
    t.type
  from public.absences a
  join public.students s on s.id = a.student_id
  join public.tests t on t.course_id = s.course_id
  where a.id = p_absence_id
    and t.date between a.start_date and a.end_date
  order by t.date;
$$;


ALTER FUNCTION "public"."teacher_get_public_absence_detail"("p_absence_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."teacher_get_public_absence_detail"("p_absence_id" "uuid") IS 'Detalle de pruebas afectadas para una inasistencia de la vista docente publica.';



CREATE OR REPLACE FUNCTION "public"."teacher_get_public_absences"("p_month" integer, "p_year" integer, "p_level" "text" DEFAULT NULL::"text", "p_course_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("absence_id" "uuid", "student_name" "text", "course_id" "uuid", "course_name" "text", "course_level" "text", "start_date" "date", "end_date" "date", "status" "text", "observation" "text", "affected_tests_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_month_start date;
  v_month_end date;
begin
  if p_month is null or p_month < 1 or p_month > 12 then
    raise exception 'p_month must be between 1 and 12';
  end if;
  if p_year is null or p_year < 2000 or p_year > 2100 then
    raise exception 'p_year must be between 2000 and 2100';
  end if;

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end := (v_month_start + interval '1 month - 1 day')::date;

  return query
  select
    a.id as absence_id,
    s.full_name as student_name,
    c.id as course_id,
    c.name as course_name,
    c.level as course_level,
    a.start_date,
    a.end_date,
    a.status,
    a.observation,
    coalesce(ta.affected_tests_count, 0)::int as affected_tests_count
  from public.absences a
  join public.students s on s.id = a.student_id
  join public.courses c on c.id = s.course_id
  left join lateral (
    select count(*)::int as affected_tests_count
    from public.tests t
    where t.course_id = c.id
      and t.date between a.start_date and a.end_date
      and t.date between v_month_start and v_month_end
  ) ta on true
  where a.start_date <= v_month_end
    and a.end_date >= v_month_start
    and (p_level is null or c.level = p_level)
    and (p_course_id is null or c.id = p_course_id)
  order by a.start_date desc, s.full_name asc;
end;
$$;


ALTER FUNCTION "public"."teacher_get_public_absences"("p_month" integer, "p_year" integer, "p_level" "text", "p_course_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."teacher_get_public_absences"("p_month" integer, "p_year" integer, "p_level" "text", "p_course_id" "uuid") IS 'Canonical teacher public absences RPC. Optional p_course_id supports both unfiltered and course-filtered teacher views without PostgREST overload ambiguity.';



CREATE OR REPLACE FUNCTION "public"."teacher_get_public_absences_masked"("p_month" integer, "p_year" integer, "p_level" "text" DEFAULT NULL::"text", "p_course_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("absence_id" "text", "student_name" "text", "course_id" "uuid", "course_name" "text", "course_level" "text", "start_date" "date", "end_date" "date", "status" "text", "observation" "text", "affected_tests_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_month_start date;
  v_month_end date;
begin
  if p_month is null or p_month < 1 or p_month > 12 then
    raise exception 'p_month must be between 1 and 12';
  end if;
  if p_year is null or p_year < 2000 or p_year > 2100 then
    raise exception 'p_year must be between 2000 and 2100';
  end if;

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end := (v_month_start + interval '1 month - 1 day')::date;

  return query
  select
    md5(a.id::text) as absence_id,
    (
      select string_agg(upper(left(name_part, 1)) || '.', ' ' order by part_order)
      from regexp_split_to_table(trim(s.full_name), E'\\s+') with ordinality as parts(name_part, part_order)
      where name_part <> ''
    ) as student_name,
    c.id as course_id,
    c.name as course_name,
    c.level as course_level,
    a.start_date,
    a.end_date,
    a.status,
    null::text as observation,
    coalesce(ta.affected_tests_count, 0)::int as affected_tests_count
  from public.absences a
  join public.students s on s.id = a.student_id
  join public.courses c on c.id = s.course_id
  left join lateral (
    select count(*)::int as affected_tests_count
    from public.tests t
    where t.course_id = c.id
      and t.date between a.start_date and a.end_date
      and t.date between v_month_start and v_month_end
  ) ta on true
  where a.start_date <= v_month_end
    and a.end_date >= v_month_start
    and (p_level is null or c.level = p_level)
    and (p_course_id is null or c.id = p_course_id)
  order by a.start_date desc, s.full_name asc;
end;
$$;


ALTER FUNCTION "public"."teacher_get_public_absences_masked"("p_month" integer, "p_year" integer, "p_level" "text", "p_course_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."teacher_get_public_courses"("p_level" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "name" "text", "level" "text", "position" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select c.id, c.name, c.level, c.position
  from public.courses c
  where p_level is null or c.level = p_level
  order by c.position, c.name;
$$;


ALTER FUNCTION "public"."teacher_get_public_courses"("p_level" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."teacher_get_public_instant_messages"("p_level" "text" DEFAULT NULL::"text", "p_course_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "title" "text", "body" "text", "level" "text", "course_id" "uuid", "student_id" "uuid", "student_name" "text", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    m.id,
    m.title,
    m.body,
    m.level,
    m.course_id,
    null::uuid as student_id,
    null::text as student_name,
    m.starts_at,
    m.ends_at,
    m.created_at
  from public.instant_messages m
  where m.is_active = true
    and m.starts_at <= now()
    and (m.ends_at is null or m.ends_at >= now())
    and m.student_id is null
    and (p_level is null or m.level is null or m.level = p_level)
    and (p_course_id is null or m.course_id is null or m.course_id = p_course_id)
  order by m.starts_at desc, m.created_at desc;
$$;


ALTER FUNCTION "public"."teacher_get_public_instant_messages"("p_level" "text", "p_course_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_instant_messages_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_instant_messages_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_app_memberships_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_app_memberships_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."absences" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid",
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "observation" "text",
    "document_url" "text",
    "status" "text" DEFAULT 'PENDIENTE'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."absences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "application_code" "text" NOT NULL,
    "role" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "app_memberships_role_not_empty" CHECK (("role" <> ''::"text"))
);


ALTER TABLE "public"."app_memberships" OWNER TO "postgres";


COMMENT ON TABLE "public"."app_memberships" IS 'Membresías de usuarios por aplicación y tenant';



COMMENT ON COLUMN "public"."app_memberships"."role" IS 'Rol del usuario dentro de la aplicación';



COMMENT ON COLUMN "public"."app_memberships"."is_active" IS 'Permite desactivar temporalmente una membresía';



CREATE TABLE IF NOT EXISTS "public"."applications" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "applications_code_not_empty" CHECK (("code" <> ''::"text")),
    CONSTRAINT "applications_name_not_empty" CHECK (("name" <> ''::"text"))
);


ALTER TABLE "public"."applications" OWNER TO "postgres";


COMMENT ON TABLE "public"."applications" IS 'Catálogo de aplicaciones registradas en el ecosistema Supabase compartido';



COMMENT ON COLUMN "public"."applications"."code" IS 'Identificador corto de la aplicación (ej. convivencia, inasistencias)';



COMMENT ON COLUMN "public"."applications"."name" IS 'Nombre legible de la aplicación';



COMMENT ON COLUMN "public"."applications"."is_active" IS 'Permite deshabilitar una aplicación sin borrar membresías';



CREATE TABLE IF NOT EXISTS "public"."audit_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "actor_user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text" NOT NULL,
    "previous_values" "jsonb",
    "new_values" "jsonb",
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "audit_events_action_not_empty" CHECK ((("char_length"("btrim"("action")) >= 1) AND ("char_length"("btrim"("action")) <= 120))),
    CONSTRAINT "audit_events_entity_id_not_empty" CHECK ((("char_length"("btrim"("entity_id")) >= 1) AND ("char_length"("btrim"("entity_id")) <= 200))),
    CONSTRAINT "audit_events_entity_type_not_empty" CHECK ((("char_length"("btrim"("entity_type")) >= 1) AND ("char_length"("btrim"("entity_type")) <= 120)))
);


ALTER TABLE "public"."audit_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_events" IS 'Technical immutable audit trail. Separate from the AI-assisted audit-due-process report.';



COMMENT ON COLUMN "public"."audit_events"."actor_user_id" IS 'Authenticated user responsible for the action. No FK is used so events survive account removal.';



COMMENT ON COLUMN "public"."audit_events"."previous_values" IS 'Values before the action, when applicable.';



COMMENT ON COLUMN "public"."audit_events"."new_values" IS 'Values after the action, when applicable.';



CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" bigint NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid",
    "action" "text" NOT NULL,
    "old_data" "jsonb",
    "new_data" "jsonb",
    "changed_by" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "performed_by" "uuid"
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."audit_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNED BY "public"."audit_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."bitacora_entries" (
    "id" "text" NOT NULL,
    "causa_id" "text" NOT NULL,
    "fecha" "text" NOT NULL,
    "tipo" "text" NOT NULL,
    "titulo" "text" NOT NULL,
    "descripcion" "text" DEFAULT ''::"text",
    "participantes" "jsonb" DEFAULT '[]'::"jsonb",
    "documento_adjunto" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" DEFAULT "public"."current_tenant_id"() NOT NULL
);


ALTER TABLE "public"."bitacora_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."carta_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "carta_id" "text" NOT NULL,
    "student_id" "text" NOT NULL,
    "tenant_id" "uuid",
    "event_type" "text" NOT NULL,
    "event_detail" "text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "carta_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['suggested'::"text", 'created'::"text", 'registered'::"text", 'printed'::"text", 'downloaded_pdf'::"text", 'downloaded_word'::"text", 'processed_manually'::"text", 'annulled'::"text"])))
);


ALTER TABLE "public"."carta_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cartas_disciplinarias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "letter_type" "text" NOT NULL,
    "emission_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "status" "text" DEFAULT 'Vigente'::"text",
    "emitted_by" "text" NOT NULL,
    "supervisor_name" "text",
    "apoderado_name" "text" NOT NULL,
    "annotations_count" integer NOT NULL,
    "student_name" "text" NOT NULL,
    "course" "text" NOT NULL,
    "regulation_basis" "text" NOT NULL,
    "observations" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" DEFAULT "public"."current_tenant_id"() NOT NULL,
    "content_snapshot" "jsonb",
    "origin" "text" DEFAULT 'platform'::"text" NOT NULL,
    "school_year" integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer NOT NULL,
    CONSTRAINT "cartas_disciplinarias_letter_type_check" CHECK (("letter_type" = ANY (ARRAY['Amonestación Escrita'::"text", 'Carta de Compromiso Conductual'::"text", 'Ficha de Derivación'::"text"]))),
    CONSTRAINT "cartas_disciplinarias_origin_check" CHECK (("origin" = ANY (ARRAY['platform'::"text", 'physical'::"text"]))),
    CONSTRAINT "cartas_disciplinarias_school_year_check" CHECK ((("school_year" >= 2000) AND ("school_year" <= 2100))),
    CONSTRAINT "cartas_disciplinarias_status_check" CHECK (("status" = ANY (ARRAY['Vigente'::"text", 'Cumplida'::"text", 'Incumplida'::"text", 'Anulada'::"text"])))
);


ALTER TABLE "public"."cartas_disciplinarias" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."causas" (
    "id" "text" NOT NULL,
    "estudiante_nombre" "text" NOT NULL,
    "estudiante_curso" "text" NOT NULL,
    "nna_protected_name" "text" NOT NULL,
    "run_estudiante" "text" NOT NULL,
    "fecha_apertura" "text" NOT NULL,
    "estado_actual" "text" NOT NULL,
    "tipo_infraccion" "text" NOT NULL,
    "responsable" "text" NOT NULL,
    "compromete_aula_segura" boolean DEFAULT false,
    "fecha_ultima_actualizacion" "text" NOT NULL,
    "observaciones" "text" DEFAULT ''::"text",
    "conducta_rice_id" "text",
    "medidas_ejecutadas" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "student_id" "uuid",
    "annotations_count" integer DEFAULT 0,
    "created_by" "text",
    "tenant_id" "uuid" DEFAULT "public"."current_tenant_id"() NOT NULL
);


ALTER TABLE "public"."causas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklist_items" (
    "id" "text" NOT NULL,
    "causa_id" "text" NOT NULL,
    "label" "text" NOT NULL,
    "descripcion" "text" DEFAULT ''::"text",
    "completado" boolean DEFAULT false,
    "fecha_completado" "text",
    "requerido_por" "text" NOT NULL,
    "registrado_por" "text",
    "observaciones" "text",
    "documento_nombre" "text",
    "documento_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" DEFAULT "public"."current_tenant_id"() NOT NULL
);


ALTER TABLE "public"."checklist_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coexistence_cases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "folio" "text" NOT NULL,
    "fecha_inicio" timestamp with time zone DEFAULT "now"(),
    "titulo" "text" NOT NULL,
    "descripcion" "text",
    "denunciante" "text",
    "denunciado" "text",
    "curso" "text",
    "curso_id" "uuid",
    "gravedad" "text",
    "etapa" "text" DEFAULT 'inicio'::"text",
    "plazo_24h" boolean DEFAULT false,
    "plazo_investigacion" timestamp with time zone,
    "plazo_cierre" timestamp with time zone,
    "documentos" "text"[] DEFAULT '{}'::"text"[],
    "entrevistas" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "coexistence_cases_etapa_check" CHECK (("etapa" = ANY (ARRAY['inicio'::"text", 'comunicacion'::"text", 'investigacion'::"text", 'resolucion'::"text", 'reconsideracion'::"text"]))),
    CONSTRAINT "coexistence_cases_gravedad_check" CHECK (("gravedad" = ANY (ARRAY['leve'::"text", 'grave'::"text", 'muy-grave'::"text"])))
);


ALTER TABLE "public"."coexistence_cases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "position" integer,
    "level" "text" DEFAULT 'MEDIA'::"text",
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "courses_level_check" CHECK (("level" = ANY (ARRAY['BASICA'::"text", 'MEDIA'::"text"])))
);

ALTER TABLE ONLY "public"."courses" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."disciplinary_annotations_detected" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "process_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "annotation_type" "text" NOT NULL,
    "annotation_text" "text",
    "page_number" integer,
    "position_in_page" integer,
    "annotation_date" "date",
    "teacher_name" "text",
    "line_number" integer,
    "character_position" integer,
    "detected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "raw_text" "text",
    "normalized_text" "text",
    "category" "text",
    "classification_method" "text",
    "confidence" numeric(4,3),
    "parser_version" "text",
    "confirmed_annotation_type" "text",
    "corrected_by" "uuid",
    "corrected_at" timestamp with time zone
);


ALTER TABLE "public"."disciplinary_annotations_detected" OWNER TO "postgres";


COMMENT ON COLUMN "public"."disciplinary_annotations_detected"."raw_text" IS 'Texto original extraído para auditoría. No reemplaza al PDF fuente.';



CREATE TABLE IF NOT EXISTS "public"."disciplinary_process_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "process_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "file_size" integer NOT NULL,
    "mime_type" "text" NOT NULL,
    "file_hash" "text",
    "uploaded_by" "uuid",
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "bucket" "text" DEFAULT 'disciplinary-processes'::"text" NOT NULL,
    "original_file_name" "text",
    "stored_file_name" "text",
    "processing_status" "text" DEFAULT 'confirmed'::"text" NOT NULL,
    "processing_error" "text",
    "analysis_version" "text",
    "student_id" "uuid"
);


ALTER TABLE "public"."disciplinary_process_files" OWNER TO "postgres";


COMMENT ON COLUMN "public"."disciplinary_process_files"."storage_path" IS 'Ruta privada en Supabase Storage. No debe contener nombres de estudiantes.';



CREATE TABLE IF NOT EXISTS "public"."disciplinary_processes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "process_number" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "course" "text",
    "teacher_name" "text",
    "incident_date" "date",
    "description" "text",
    "suggested_letter_type" "text",
    "final_letter_type" "text",
    "total_negativas" integer DEFAULT 0 NOT NULL,
    "total_positivas" integer DEFAULT 0 NOT NULL,
    "total_informativas" integer DEFAULT 0 NOT NULL,
    "is_completed" boolean DEFAULT false NOT NULL,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."disciplinary_processes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."disciplinary_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rule_type" "text" NOT NULL,
    "rule_name" "text" NOT NULL,
    "description" "text",
    "min_negativas" integer,
    "max_negativas" integer,
    "min_positivas" integer,
    "max_positivas" integer,
    "min_informativas" integer,
    "max_informativas" integer,
    "suggested_letter_type" "text" NOT NULL,
    "priority" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."disciplinary_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_analyses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid",
    "file_name" "text",
    "negativas" integer DEFAULT 0 NOT NULL,
    "positivas" integer DEFAULT 0 NOT NULL,
    "informativas" integer DEFAULT 0 NOT NULL,
    "analyzed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "process_id" "uuid",
    "file_id" "uuid",
    "status" "text" DEFAULT 'completed'::"text" NOT NULL,
    "detected_student_name" "text",
    "detected_course" "text",
    "student_match_status" "text",
    "warnings" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "file_hash" "text",
    "parser_version" "text",
    "confirmed_at" timestamp with time zone,
    "confirmed_by" "uuid"
);


ALTER TABLE "public"."document_analyses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_templates" (
    "id" "text" NOT NULL,
    "doc_type" "text" NOT NULL,
    "label" "text" NOT NULL,
    "system_prompt" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" DEFAULT "public"."current_tenant_id"() NOT NULL
);


ALTER TABLE "public"."document_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."etapas_disciplinarias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "step_number" integer NOT NULL,
    "stage_name" "text" NOT NULL,
    "responsible" "text" NOT NULL,
    "transition_date" timestamp with time zone DEFAULT "now"(),
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "text",
    "tenant_id" "uuid" DEFAULT "public"."current_tenant_id"() NOT NULL
);


ALTER TABLE "public"."etapas_disciplinarias" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feriados_chile" (
    "fecha" "date" NOT NULL,
    "descripcion" "text" NOT NULL,
    "es_irrenunciable" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."feriados_chile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inspectorate_records" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid",
    "date_time" timestamp with time zone NOT NULL,
    "observation" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "type" "text" DEFAULT 'Negativa'::"text" NOT NULL,
    "severity" "text" DEFAULT 'Leve'::"text" NOT NULL,
    "registered_by" "text" DEFAULT 'Inspectoría'::"text",
    "created_by" "text",
    "tenant_id" "uuid" DEFAULT "public"."current_tenant_id"() NOT NULL,
    "pdf_file_path" "text",
    CONSTRAINT "inspectorate_records_severity_check" CHECK (("severity" = ANY (ARRAY['Leve'::"text", 'Grave'::"text", 'Muy Grave'::"text", 'Gravísima'::"text"]))),
    CONSTRAINT "inspectorate_records_type_check" CHECK (("type" = ANY (ARRAY['Positiva'::"text", 'Negativa'::"text", 'Información'::"text"])))
);


ALTER TABLE "public"."inspectorate_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."instant_messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "level" "text",
    "course_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "starts_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ends_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "student_id" "uuid",
    CONSTRAINT "instant_messages_body_check" CHECK ((("char_length"("body") >= 3) AND ("char_length"("body") <= 1200))),
    CONSTRAINT "instant_messages_date_check" CHECK ((("ends_at" IS NULL) OR ("ends_at" >= "starts_at"))),
    CONSTRAINT "instant_messages_level_check" CHECK (("level" = ANY (ARRAY['BASICA'::"text", 'MEDIA'::"text"]))),
    CONSTRAINT "instant_messages_title_check" CHECK ((("char_length"("title") >= 3) AND ("char_length"("title") <= 120)))
);


ALTER TABLE "public"."instant_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."membership_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "application_code" "text" DEFAULT 'convivencia'::"text" NOT NULL,
    "auth_user_id" "uuid",
    "invited_by" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cancelled_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    CONSTRAINT "membership_invitations_email_format" CHECK ((("email" = "lower"("btrim"("email"))) AND (POSITION(('@'::"text") IN ("email")) > 1))),
    CONSTRAINT "membership_invitations_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'direccion'::"text", 'convivencia'::"text", 'inspectoria'::"text", 'profesor_jefe'::"text", 'teacher'::"text", 'inspector'::"text", 'user'::"text", 'staff'::"text"]))),
    CONSTRAINT "membership_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."membership_invitations" OWNER TO "postgres";


COMMENT ON TABLE "public"."membership_invitations" IS 'Invitaciones administrativas por tenant; la entrega del correo la realiza Supabase Auth.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "role" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text",
    "full_name" "text",
    "course_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['superadmin'::"text", 'admin'::"text", 'direccion'::"text", 'convivencia'::"text", 'inspectoria'::"text", 'profesor_jefe'::"text", 'teacher'::"text", 'inspector'::"text", 'user'::"text", 'staff'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."membership_readiness" WITH ("security_invoker"='true') AS
 SELECT "user_id",
    "tenant_id",
    "role" AS "current_role",
        CASE
            WHEN ("tenant_id" IS NULL) THEN 'no-tenant'::"text"
            WHEN ("role" IS NULL) THEN 'no-role'::"text"
            WHEN ("role" = ANY (ARRAY['direccion'::"text", 'convivencia'::"text"])) THEN 'convivencia-only'::"text"
            WHEN ("role" = 'teacher'::"text") THEN 'inasistencias-only'::"text"
            WHEN ("role" = ANY (ARRAY['admin'::"text", 'profesor_jefe'::"text", 'inspectoria'::"text", 'inspector'::"text", 'staff'::"text", 'user'::"text", 'superuser'::"text"])) THEN 'ambiguous'::"text"
            ELSE 'unknown'::"text"
        END AS "membership_category"
   FROM "public"."profiles" "p";


ALTER VIEW "public"."membership_readiness" OWNER TO "postgres";


COMMENT ON VIEW "public"."membership_readiness" IS 'Diagnóstico de backfill Phase 2: clasifica perfiles por categoría de membresía. Solo accesible por service_role y postgres.';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "notification_key" "text" NOT NULL,
    "notification_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "severity" "text" DEFAULT 'info'::"text" NOT NULL,
    "entity_type" "text",
    "entity_id" "text",
    "action_url" "text",
    "read_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notifications_description_not_empty" CHECK ((("char_length"("btrim"("description")) >= 1) AND ("char_length"("btrim"("description")) <= 2000))),
    CONSTRAINT "notifications_key_not_empty" CHECK ((("char_length"("btrim"("notification_key")) >= 1) AND ("char_length"("btrim"("notification_key")) <= 200))),
    CONSTRAINT "notifications_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warning'::"text", 'urgent'::"text"]))),
    CONSTRAINT "notifications_title_not_empty" CHECK ((("char_length"("btrim"("title")) >= 1) AND ("char_length"("btrim"("title")) <= 160)))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'Notificaciones persistentes por usuario; el historial se conserva aunque expire la alerta.';



COMMENT ON COLUMN "public"."notifications"."notification_key" IS 'Clave estable para actualizar una alerta derivada sin resetear su estado de lectura.';



COMMENT ON COLUMN "public"."notifications"."expires_at" IS 'Fecha de expiración lógica; no elimina el registro histórico.';



CREATE TABLE IF NOT EXISTS "public"."report_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "report_type" "text" NOT NULL,
    "status" "text" DEFAULT 'completed'::"text" NOT NULL,
    "filters" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "row_count" integer DEFAULT 0 NOT NULL,
    "file_name" "text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    CONSTRAINT "report_history_row_count_check" CHECK (("row_count" >= 0)),
    CONSTRAINT "report_history_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"]))),
    CONSTRAINT "report_history_type_check" CHECK (("report_type" = ANY (ARRAY['expedientes'::"text", 'anotaciones'::"text", 'uso'::"text", 'auditoria'::"text"])))
);


ALTER TABLE "public"."report_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."report_history" IS 'Historial de generación de reportes. No es audit-due-process ni reemplaza audit_events.';



COMMENT ON COLUMN "public"."report_history"."filters" IS 'Filtros aplicados al reporte: curso, fechas, estado y responsable.';



CREATE TABLE IF NOT EXISTS "public"."student_history_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "tenant_id" "uuid" DEFAULT "public"."current_tenant_id"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "student_history_entries_description_length" CHECK ((("char_length"("btrim"("description")) >= 3) AND ("char_length"("btrim"("description")) <= 2000))),
    CONSTRAINT "student_history_entries_title_length" CHECK ((("char_length"("btrim"("title")) >= 3) AND ("char_length"("btrim"("title")) <= 120)))
);


ALTER TABLE "public"."student_history_entries" OWNER TO "postgres";


COMMENT ON TABLE "public"."student_history_entries" IS 'Immutable manual events recorded in a student disciplinary history.';



COMMENT ON COLUMN "public"."student_history_entries"."created_by" IS 'Auth user UUID captured for audit; intentionally retained without an FK if the account is removed.';



CREATE TABLE IF NOT EXISTS "public"."students" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "full_name" "text" NOT NULL,
    "course_id" "uuid",
    "rut" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL,
    "ai_analysis" "jsonb"
);


ALTER TABLE "public"."students" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."teacher_public_view" AS
 SELECT "a"."id" AS "absence_id",
    "s"."full_name" AS "student_name",
    "c"."name" AS "course_name",
    "c"."level" AS "course_level",
    "a"."start_date",
    "a"."end_date",
    "a"."status",
    "a"."observation"
   FROM (("public"."absences" "a"
     JOIN "public"."students" "s" ON (("s"."id" = "a"."student_id")))
     JOIN "public"."courses" "c" ON (("c"."id" = "s"."course_id")));


ALTER VIEW "public"."teacher_public_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "course_id" "uuid",
    "date" "date" NOT NULL,
    "subject" "text" NOT NULL,
    "type" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usage_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_name" "text" NOT NULL,
    "user_id" "uuid",
    "properties" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."usage_events" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audit_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."absences"
    ADD CONSTRAINT "absences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_memberships"
    ADD CONSTRAINT "app_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_memberships"
    ADD CONSTRAINT "app_memberships_tenant_id_user_id_application_code_key" UNIQUE ("tenant_id", "user_id", "application_code");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."audit_events"
    ADD CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bitacora_entries"
    ADD CONSTRAINT "bitacora_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."carta_events"
    ADD CONSTRAINT "carta_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cartas_disciplinarias"
    ADD CONSTRAINT "cartas_disciplinarias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."causas"
    ADD CONSTRAINT "causas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_items"
    ADD CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id", "causa_id");



ALTER TABLE ONLY "public"."coexistence_cases"
    ADD CONSTRAINT "coexistence_cases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."disciplinary_annotations_detected"
    ADD CONSTRAINT "disciplinary_annotations_detected_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."disciplinary_process_files"
    ADD CONSTRAINT "disciplinary_process_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."disciplinary_processes"
    ADD CONSTRAINT "disciplinary_processes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."disciplinary_rules"
    ADD CONSTRAINT "disciplinary_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_analyses"
    ADD CONSTRAINT "document_analyses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_templates"
    ADD CONSTRAINT "document_templates_doc_type_key" UNIQUE ("doc_type");



ALTER TABLE ONLY "public"."document_templates"
    ADD CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."etapas_disciplinarias"
    ADD CONSTRAINT "etapas_disciplinarias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feriados_chile"
    ADD CONSTRAINT "feriados_chile_pkey" PRIMARY KEY ("fecha");



ALTER TABLE ONLY "public"."inspectorate_records"
    ADD CONSTRAINT "inspectorate_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."instant_messages"
    ADD CONSTRAINT "instant_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_invitations"
    ADD CONSTRAINT "membership_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_tenant_id_user_id_notification_key_key" UNIQUE ("tenant_id", "user_id", "notification_key");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."report_history"
    ADD CONSTRAINT "report_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_history_entries"
    ADD CONSTRAINT "student_history_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."tests"
    ADD CONSTRAINT "tests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usage_events"
    ADD CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id");



CREATE INDEX "audit_events_actor_occurred_at_idx" ON "public"."audit_events" USING "btree" ("actor_user_id", "occurred_at" DESC);



CREATE INDEX "audit_events_entity_idx" ON "public"."audit_events" USING "btree" ("tenant_id", "entity_type", "entity_id");



CREATE INDEX "audit_events_occurred_at_idx" ON "public"."audit_events" USING "btree" ("occurred_at" DESC);



CREATE INDEX "audit_events_tenant_occurred_at_idx" ON "public"."audit_events" USING "btree" ("tenant_id", "occurred_at" DESC);



CREATE INDEX "idx_absences_student_dates" ON "public"."absences" USING "btree" ("student_id", "start_date", "end_date");



CREATE INDEX "idx_app_memberships_application" ON "public"."app_memberships" USING "btree" ("application_code");



CREATE INDEX "idx_app_memberships_tenant" ON "public"."app_memberships" USING "btree" ("tenant_id");



CREATE INDEX "idx_app_memberships_tenant_user_active" ON "public"."app_memberships" USING "btree" ("tenant_id", "user_id", "is_active");



CREATE INDEX "idx_app_memberships_user" ON "public"."app_memberships" USING "btree" ("user_id");



CREATE INDEX "idx_app_memberships_user_app_active" ON "public"."app_memberships" USING "btree" ("user_id", "application_code", "is_active");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_table_record" ON "public"."audit_logs" USING "btree" ("table_name", "record_id");



CREATE INDEX "idx_bitacora_causa_fecha" ON "public"."bitacora_entries" USING "btree" ("causa_id", "fecha");



CREATE INDEX "idx_bitacora_entries_tenant_id" ON "public"."bitacora_entries" USING "btree" ("tenant_id");



CREATE INDEX "idx_carta_events_carta_id" ON "public"."carta_events" USING "btree" ("carta_id");



CREATE INDEX "idx_carta_events_created_at" ON "public"."carta_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_carta_events_student_id" ON "public"."carta_events" USING "btree" ("student_id");



CREATE INDEX "idx_carta_events_tenant_id" ON "public"."carta_events" USING "btree" ("tenant_id");



CREATE INDEX "idx_cartas_disciplinarias_content_snapshot_gin" ON "public"."cartas_disciplinarias" USING "gin" ("content_snapshot");



CREATE INDEX "idx_cartas_disciplinarias_tenant_id" ON "public"."cartas_disciplinarias" USING "btree" ("tenant_id");



CREATE INDEX "idx_cartas_emission_date" ON "public"."cartas_disciplinarias" USING "btree" ("emission_date");



CREATE INDEX "idx_cartas_letter_type" ON "public"."cartas_disciplinarias" USING "btree" ("letter_type");



CREATE INDEX "idx_cartas_student_id" ON "public"."cartas_disciplinarias" USING "btree" ("student_id");



CREATE INDEX "idx_cartas_student_school_year_origin" ON "public"."cartas_disciplinarias" USING "btree" ("tenant_id", "student_id", "school_year", "origin", "emission_date" DESC);



CREATE INDEX "idx_causas_estado" ON "public"."causas" USING "btree" ("estado_actual");



CREATE INDEX "idx_causas_estudiante_curso" ON "public"."causas" USING "btree" ("estudiante_curso");



CREATE INDEX "idx_causas_student_id" ON "public"."causas" USING "btree" ("student_id");



CREATE INDEX "idx_causas_tenant_fecha" ON "public"."causas" USING "btree" ("tenant_id", "fecha_ultima_actualizacion" DESC);



CREATE INDEX "idx_causas_tenant_id" ON "public"."causas" USING "btree" ("tenant_id");



CREATE INDEX "idx_causas_tenant_updated" ON "public"."causas" USING "btree" ("tenant_id", "fecha_ultima_actualizacion" DESC);



CREATE INDEX "idx_checklist_causa" ON "public"."checklist_items" USING "btree" ("causa_id");



CREATE INDEX "idx_checklist_causa_completado" ON "public"."checklist_items" USING "btree" ("causa_id", "completado");



CREATE INDEX "idx_checklist_items_tenant_id" ON "public"."checklist_items" USING "btree" ("tenant_id");



CREATE INDEX "idx_courses_tenant_id" ON "public"."courses" USING "btree" ("tenant_id");



CREATE INDEX "idx_disciplinary_annotations_process" ON "public"."disciplinary_annotations_detected" USING "btree" ("process_id");



CREATE INDEX "idx_disciplinary_annotations_process_sequence" ON "public"."disciplinary_annotations_detected" USING "btree" ("process_id", "line_number");



CREATE INDEX "idx_disciplinary_annotations_student" ON "public"."disciplinary_annotations_detected" USING "btree" ("student_id");



CREATE INDEX "idx_disciplinary_annotations_tenant" ON "public"."disciplinary_annotations_detected" USING "btree" ("tenant_id");



CREATE INDEX "idx_disciplinary_annotations_type" ON "public"."disciplinary_annotations_detected" USING "btree" ("annotation_type");



CREATE INDEX "idx_disciplinary_files_process" ON "public"."disciplinary_process_files" USING "btree" ("process_id");



CREATE UNIQUE INDEX "idx_disciplinary_files_storage_path" ON "public"."disciplinary_process_files" USING "btree" ("tenant_id", "storage_path");



CREATE INDEX "idx_disciplinary_files_student" ON "public"."disciplinary_process_files" USING "btree" ("student_id");



CREATE INDEX "idx_disciplinary_files_tenant" ON "public"."disciplinary_process_files" USING "btree" ("tenant_id");



CREATE UNIQUE INDEX "idx_disciplinary_processes_number" ON "public"."disciplinary_processes" USING "btree" ("process_number", "tenant_id");



CREATE INDEX "idx_disciplinary_processes_status" ON "public"."disciplinary_processes" USING "btree" ("status");



CREATE INDEX "idx_disciplinary_processes_student" ON "public"."disciplinary_processes" USING "btree" ("student_id", "created_at" DESC);



CREATE INDEX "idx_disciplinary_processes_tenant" ON "public"."disciplinary_processes" USING "btree" ("tenant_id");



CREATE INDEX "idx_disciplinary_rules_active" ON "public"."disciplinary_rules" USING "btree" ("is_active", "priority" DESC);



CREATE INDEX "idx_disciplinary_rules_tenant" ON "public"."disciplinary_rules" USING "btree" ("tenant_id");



CREATE INDEX "idx_disciplinary_rules_type" ON "public"."disciplinary_rules" USING "btree" ("rule_type");



CREATE UNIQUE INDEX "idx_disciplinary_rules_unique_threshold" ON "public"."disciplinary_rules" USING "btree" ("tenant_id", "rule_type", "suggested_letter_type", COALESCE("min_negativas", '-1'::integer), COALESCE("max_negativas", '-1'::integer), COALESCE("min_positivas", '-1'::integer), COALESCE("max_positivas", '-1'::integer), COALESCE("min_informativas", '-1'::integer), COALESCE("max_informativas", '-1'::integer));



CREATE INDEX "idx_document_analyses_process" ON "public"."document_analyses" USING "btree" ("process_id");



CREATE INDEX "idx_document_analyses_status" ON "public"."document_analyses" USING "btree" ("tenant_id", "status", "analyzed_at" DESC);



CREATE INDEX "idx_document_analyses_student" ON "public"."document_analyses" USING "btree" ("student_id", "analyzed_at" DESC);



CREATE INDEX "idx_document_analyses_tenant" ON "public"."document_analyses" USING "btree" ("tenant_id");



CREATE INDEX "idx_document_templates_tenant_id" ON "public"."document_templates" USING "btree" ("tenant_id");



CREATE INDEX "idx_etapas_disciplinarias_tenant_id" ON "public"."etapas_disciplinarias" USING "btree" ("tenant_id");



CREATE INDEX "idx_etapas_student_id" ON "public"."etapas_disciplinarias" USING "btree" ("student_id");



CREATE INDEX "idx_inspectorate_records_tenant_id" ON "public"."inspectorate_records" USING "btree" ("tenant_id");



CREATE INDEX "idx_inspectorate_severity" ON "public"."inspectorate_records" USING "btree" ("severity");



CREATE INDEX "idx_inspectorate_student_date" ON "public"."inspectorate_records" USING "btree" ("student_id", "date_time" DESC);



CREATE INDEX "idx_inspectorate_tenant_student" ON "public"."inspectorate_records" USING "btree" ("tenant_id", "student_id");



CREATE INDEX "idx_inspectorate_type" ON "public"."inspectorate_records" USING "btree" ("type");



CREATE INDEX "idx_instant_messages_active_window" ON "public"."instant_messages" USING "btree" ("is_active", "starts_at" DESC, "ends_at");



CREATE INDEX "idx_instant_messages_level_course" ON "public"."instant_messages" USING "btree" ("level", "course_id");



CREATE INDEX "idx_instant_messages_student_id" ON "public"."instant_messages" USING "btree" ("student_id");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_tenant_active" ON "public"."profiles" USING "btree" ("tenant_id", "is_active");



CREATE INDEX "idx_profiles_tenant_id" ON "public"."profiles" USING "btree" ("tenant_id");



CREATE INDEX "idx_profiles_tenant_role" ON "public"."profiles" USING "btree" ("tenant_id", "role");



CREATE INDEX "idx_students_course" ON "public"."students" USING "btree" ("course_id");



CREATE INDEX "idx_students_tenant_course" ON "public"."students" USING "btree" ("tenant_id", "course_id");



CREATE INDEX "idx_students_tenant_id" ON "public"."students" USING "btree" ("tenant_id");



CREATE INDEX "idx_tests_course_date" ON "public"."tests" USING "btree" ("course_id", "date");



CREATE INDEX "idx_usage_events_created_at" ON "public"."usage_events" USING "btree" ("created_at");



CREATE INDEX "idx_usage_events_event_name" ON "public"."usage_events" USING "btree" ("event_name");



CREATE INDEX "idx_usage_events_user_id" ON "public"."usage_events" USING "btree" ("user_id");



CREATE INDEX "membership_invitations_auth_user_idx" ON "public"."membership_invitations" USING "btree" ("auth_user_id");



CREATE UNIQUE INDEX "membership_invitations_pending_email_idx" ON "public"."membership_invitations" USING "btree" ("tenant_id", "email") WHERE ("status" = 'pending'::"text");



CREATE INDEX "membership_invitations_tenant_created_idx" ON "public"."membership_invitations" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "notifications_entity_idx" ON "public"."notifications" USING "btree" ("tenant_id", "entity_type", "entity_id");



CREATE INDEX "notifications_expiration_idx" ON "public"."notifications" USING "btree" ("tenant_id", "user_id", "expires_at");



CREATE INDEX "notifications_user_created_idx" ON "public"."notifications" USING "btree" ("tenant_id", "user_id", "created_at" DESC);



CREATE INDEX "notifications_user_unread_idx" ON "public"."notifications" USING "btree" ("tenant_id", "user_id", "read_at") WHERE ("read_at" IS NULL);



CREATE INDEX "report_history_creator_idx" ON "public"."report_history" USING "btree" ("tenant_id", "created_by", "created_at" DESC);



CREATE INDEX "report_history_tenant_created_idx" ON "public"."report_history" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "report_history_tenant_type_idx" ON "public"."report_history" USING "btree" ("tenant_id", "report_type", "created_at" DESC);



CREATE INDEX "student_history_entries_student_tenant_created_idx" ON "public"."student_history_entries" USING "btree" ("student_id", "tenant_id", "created_at" DESC);



CREATE INDEX "student_history_entries_tenant_student_created_idx" ON "public"."student_history_entries" USING "btree" ("tenant_id", "student_id", "created_at" DESC);



CREATE UNIQUE INDEX "uq_cartas_physical_active_type_year" ON "public"."cartas_disciplinarias" USING "btree" ("tenant_id", "student_id", "school_year", "letter_type") WHERE (("origin" = 'physical'::"text") AND ("status" <> 'Anulada'::"text"));



CREATE OR REPLACE TRIGGER "audit_events_append_only" BEFORE DELETE OR UPDATE ON "public"."audit_events" FOR EACH ROW EXECUTE FUNCTION "public"."reject_audit_event_mutation"();



CREATE OR REPLACE TRIGGER "tr_audit_absences" AFTER INSERT OR DELETE OR UPDATE ON "public"."absences" FOR EACH ROW EXECUTE FUNCTION "public"."process_audit_log"();



CREATE OR REPLACE TRIGGER "tr_audit_students" AFTER INSERT OR DELETE OR UPDATE ON "public"."students" FOR EACH ROW EXECUTE FUNCTION "public"."process_audit_log"();



CREATE OR REPLACE TRIGGER "trg_app_memberships_updated_at" BEFORE UPDATE ON "public"."app_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."update_app_memberships_updated_at"();



CREATE OR REPLACE TRIGGER "trg_audit_logs_sync_actor_columns" BEFORE INSERT OR UPDATE ON "public"."audit_logs" FOR EACH ROW EXECUTE FUNCTION "public"."audit_logs_sync_actor_columns"();



CREATE OR REPLACE TRIGGER "trg_profiles_sync_tenant_to_jwt" AFTER INSERT OR UPDATE OF "tenant_id" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_tenant_to_jwt"();



CREATE OR REPLACE TRIGGER "trg_sync_convivencia_membership" AFTER INSERT OR UPDATE OF "tenant_id", "user_id", "role" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_convivencia_membership_from_profile"();



CREATE OR REPLACE TRIGGER "trg_touch_instant_messages_updated_at" BEFORE UPDATE ON "public"."instant_messages" FOR EACH ROW EXECUTE FUNCTION "public"."touch_instant_messages_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_causas_updated_at" BEFORE UPDATE ON "public"."causas" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_disciplinary_processes_updated_at" BEFORE UPDATE ON "public"."disciplinary_processes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_disciplinary_rules_updated_at" BEFORE UPDATE ON "public"."disciplinary_rules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."absences"
    ADD CONSTRAINT "absences_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_memberships"
    ADD CONSTRAINT "app_memberships_application_code_fkey" FOREIGN KEY ("application_code") REFERENCES "public"."applications"("code");



ALTER TABLE ONLY "public"."app_memberships"
    ADD CONSTRAINT "app_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."app_memberships"
    ADD CONSTRAINT "app_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."audit_events"
    ADD CONSTRAINT "audit_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."bitacora_entries"
    ADD CONSTRAINT "bitacora_entries_causa_id_fkey" FOREIGN KEY ("causa_id") REFERENCES "public"."causas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bitacora_entries"
    ADD CONSTRAINT "bitacora_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."carta_events"
    ADD CONSTRAINT "carta_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cartas_disciplinarias"
    ADD CONSTRAINT "cartas_disciplinarias_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cartas_disciplinarias"
    ADD CONSTRAINT "cartas_disciplinarias_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."causas"
    ADD CONSTRAINT "causas_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."causas"
    ADD CONSTRAINT "causas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."checklist_items"
    ADD CONSTRAINT "checklist_items_causa_id_fkey" FOREIGN KEY ("causa_id") REFERENCES "public"."causas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_items"
    ADD CONSTRAINT "checklist_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."coexistence_cases"
    ADD CONSTRAINT "coexistence_cases_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."disciplinary_annotations_detected"
    ADD CONSTRAINT "disciplinary_annotations_detected_corrected_by_fkey" FOREIGN KEY ("corrected_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."disciplinary_annotations_detected"
    ADD CONSTRAINT "disciplinary_annotations_detected_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."disciplinary_processes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."disciplinary_annotations_detected"
    ADD CONSTRAINT "disciplinary_annotations_detected_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."disciplinary_annotations_detected"
    ADD CONSTRAINT "disciplinary_annotations_detected_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."disciplinary_process_files"
    ADD CONSTRAINT "disciplinary_process_files_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."disciplinary_processes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."disciplinary_process_files"
    ADD CONSTRAINT "disciplinary_process_files_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."disciplinary_process_files"
    ADD CONSTRAINT "disciplinary_process_files_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."disciplinary_process_files"
    ADD CONSTRAINT "disciplinary_process_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."disciplinary_processes"
    ADD CONSTRAINT "disciplinary_processes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."disciplinary_processes"
    ADD CONSTRAINT "disciplinary_processes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."disciplinary_processes"
    ADD CONSTRAINT "disciplinary_processes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."disciplinary_rules"
    ADD CONSTRAINT "disciplinary_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."document_analyses"
    ADD CONSTRAINT "document_analyses_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."document_analyses"
    ADD CONSTRAINT "document_analyses_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "public"."disciplinary_process_files"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."document_analyses"
    ADD CONSTRAINT "document_analyses_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."disciplinary_processes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."document_analyses"
    ADD CONSTRAINT "document_analyses_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_analyses"
    ADD CONSTRAINT "document_analyses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."document_templates"
    ADD CONSTRAINT "document_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."etapas_disciplinarias"
    ADD CONSTRAINT "etapas_disciplinarias_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."etapas_disciplinarias"
    ADD CONSTRAINT "etapas_disciplinarias_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."inspectorate_records"
    ADD CONSTRAINT "inspectorate_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id");



ALTER TABLE ONLY "public"."inspectorate_records"
    ADD CONSTRAINT "inspectorate_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."instant_messages"
    ADD CONSTRAINT "instant_messages_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."instant_messages"
    ADD CONSTRAINT "instant_messages_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."instant_messages"
    ADD CONSTRAINT "instant_messages_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."membership_invitations"
    ADD CONSTRAINT "membership_invitations_application_code_fkey" FOREIGN KEY ("application_code") REFERENCES "public"."applications"("code");



ALTER TABLE ONLY "public"."membership_invitations"
    ADD CONSTRAINT "membership_invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_history"
    ADD CONSTRAINT "report_history_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."report_history"
    ADD CONSTRAINT "report_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."student_history_entries"
    ADD CONSTRAINT "student_history_entries_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_history_entries"
    ADD CONSTRAINT "student_history_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."tests"
    ADD CONSTRAINT "tests_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."usage_events"
    ADD CONSTRAINT "usage_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE "public"."absences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_memberships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "app_memberships_select_own" ON "public"."app_memberships" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "applications_select_authenticated" ON "public"."applications" FOR SELECT TO "authenticated" USING (("is_active" = true));



ALTER TABLE "public"."audit_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_events_delete_denied" ON "public"."audit_events" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "audit_events_insert_same_tenant" ON "public"."audit_events" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("actor_user_id" = "auth"."uid"()) AND ("public"."current_app_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text", 'convivencia'::"text", 'inspectoria'::"text", 'inspector'::"text", 'staff'::"text", 'superuser'::"text"]))));



CREATE POLICY "audit_events_select_same_tenant" ON "public"."audit_events" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_app_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text", 'convivencia'::"text", 'inspectoria'::"text", 'inspector'::"text", 'staff'::"text", 'superuser'::"text"]))));



CREATE POLICY "audit_events_update_denied" ON "public"."audit_events" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bitacora_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bitacora_tenant_delete" ON "public"."bitacora_entries" FOR DELETE USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "bitacora_tenant_insert" ON "public"."bitacora_entries" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "bitacora_tenant_select" ON "public"."bitacora_entries" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "bitacora_tenant_update" ON "public"."bitacora_entries" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."carta_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "carta_events_insert_tenant" ON "public"."carta_events" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "carta_events_select_tenant" ON "public"."carta_events" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."cartas_disciplinarias" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cartas_tenant_delete" ON "public"."cartas_disciplinarias" FOR DELETE USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "cartas_tenant_insert" ON "public"."cartas_disciplinarias" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "cartas_tenant_select" ON "public"."cartas_disciplinarias" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "cartas_tenant_update" ON "public"."cartas_disciplinarias" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."causas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "causas_tenant_delete" ON "public"."causas" FOR DELETE USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_app_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text"]))));



CREATE POLICY "causas_tenant_insert" ON "public"."causas" FOR INSERT WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_app_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text", 'convivencia'::"text", 'inspectoria'::"text", 'profesor_jefe'::"text", 'teacher'::"text", 'staff'::"text"]))));



CREATE POLICY "causas_tenant_select" ON "public"."causas" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "causas_tenant_update" ON "public"."causas" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_app_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text", 'convivencia'::"text", 'inspectoria'::"text", 'profesor_jefe'::"text", 'teacher'::"text", 'staff'::"text"]))));



ALTER TABLE "public"."checklist_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checklist_tenant_delete" ON "public"."checklist_items" FOR DELETE USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "checklist_tenant_insert" ON "public"."checklist_items" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "checklist_tenant_select" ON "public"."checklist_items" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "checklist_tenant_update" ON "public"."checklist_items" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."coexistence_cases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "courses_tenant_delete" ON "public"."courses" FOR DELETE USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_app_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text"]))));



CREATE POLICY "courses_tenant_insert" ON "public"."courses" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "courses_tenant_select" ON "public"."courses" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "courses_tenant_update" ON "public"."courses" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."disciplinary_annotations_detected" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."disciplinary_process_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."disciplinary_processes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."disciplinary_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_analyses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."etapas_disciplinarias" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "etapas_tenant_delete" ON "public"."etapas_disciplinarias" FOR DELETE USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "etapas_tenant_insert" ON "public"."etapas_disciplinarias" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "etapas_tenant_select" ON "public"."etapas_disciplinarias" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "etapas_tenant_update" ON "public"."etapas_disciplinarias" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."feriados_chile" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inspectorate_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inspectorate_tenant_delete" ON "public"."inspectorate_records" FOR DELETE USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "inspectorate_tenant_insert" ON "public"."inspectorate_records" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "inspectorate_tenant_select" ON "public"."inspectorate_records" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "inspectorate_tenant_update" ON "public"."inspectorate_records" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."instant_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."membership_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_delete_denied" ON "public"."notifications" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "notifications_insert_own" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "notifications_update_own" ON "public"."notifications" FOR UPDATE TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("user_id" = "auth"."uid"()))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "p_absences_staff_insert" ON "public"."absences" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_staff"());



CREATE POLICY "p_absences_staff_select" ON "public"."absences" FOR SELECT TO "authenticated" USING ("public"."is_staff"());



CREATE POLICY "p_absences_staff_update" ON "public"."absences" FOR UPDATE TO "authenticated" USING ("public"."is_staff"()) WITH CHECK ("public"."is_staff"());



CREATE POLICY "p_absences_superuser_delete" ON "public"."absences" FOR DELETE TO "authenticated" USING ("public"."is_superuser"());



CREATE POLICY "p_audit_logs_staff_insert" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_staff"());



CREATE POLICY "p_audit_logs_superuser_select" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ("public"."is_superuser"());



CREATE POLICY "p_courses_staff_insert" ON "public"."courses" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_staff"());



CREATE POLICY "p_courses_staff_select" ON "public"."courses" FOR SELECT TO "authenticated" USING ("public"."is_staff"());



CREATE POLICY "p_courses_staff_update" ON "public"."courses" FOR UPDATE TO "authenticated" USING ("public"."is_staff"()) WITH CHECK ("public"."is_staff"());



CREATE POLICY "p_courses_superuser_delete" ON "public"."courses" FOR DELETE TO "authenticated" USING ("public"."is_superuser"());



CREATE POLICY "p_feriados_staff_insert" ON "public"."feriados_chile" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_staff"());



CREATE POLICY "p_feriados_staff_select" ON "public"."feriados_chile" FOR SELECT TO "authenticated" USING ("public"."is_staff"());



CREATE POLICY "p_feriados_staff_update" ON "public"."feriados_chile" FOR UPDATE TO "authenticated" USING ("public"."is_staff"()) WITH CHECK ("public"."is_staff"());



CREATE POLICY "p_feriados_superuser_delete" ON "public"."feriados_chile" FOR DELETE TO "authenticated" USING ("public"."is_superuser"());



CREATE POLICY "p_inspectorate_staff_insert" ON "public"."inspectorate_records" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_staff"());



CREATE POLICY "p_inspectorate_staff_select" ON "public"."inspectorate_records" FOR SELECT TO "authenticated" USING ("public"."is_staff"());



CREATE POLICY "p_inspectorate_staff_update" ON "public"."inspectorate_records" FOR UPDATE TO "authenticated" USING ("public"."is_staff"()) WITH CHECK ("public"."is_staff"());



CREATE POLICY "p_inspectorate_superuser_delete" ON "public"."inspectorate_records" FOR DELETE TO "authenticated" USING ("public"."is_superuser"());



CREATE POLICY "p_instant_messages_staff_insert" ON "public"."instant_messages" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_staff"() AND (("created_by" IS NULL) OR ("created_by" = "auth"."uid"()))));



CREATE POLICY "p_instant_messages_staff_select" ON "public"."instant_messages" FOR SELECT TO "authenticated" USING ("public"."is_staff"());



CREATE POLICY "p_instant_messages_staff_update" ON "public"."instant_messages" FOR UPDATE TO "authenticated" USING ("public"."is_staff"()) WITH CHECK ("public"."is_staff"());



CREATE POLICY "p_instant_messages_superuser_delete" ON "public"."instant_messages" FOR DELETE TO "authenticated" USING ("public"."is_superuser"());



CREATE POLICY "p_profiles_self_select" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "p_profiles_superuser_delete" ON "public"."profiles" FOR DELETE TO "authenticated" USING ("public"."is_superuser"());



CREATE POLICY "p_profiles_superuser_insert" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_superuser"());



CREATE POLICY "p_profiles_superuser_select" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."is_superuser"());



CREATE POLICY "p_profiles_superuser_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ("public"."is_superuser"()) WITH CHECK ("public"."is_superuser"());



CREATE POLICY "p_students_staff_insert" ON "public"."students" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_staff"());



CREATE POLICY "p_students_staff_select" ON "public"."students" FOR SELECT TO "authenticated" USING ("public"."is_staff"());



CREATE POLICY "p_students_staff_update" ON "public"."students" FOR UPDATE TO "authenticated" USING ("public"."is_staff"()) WITH CHECK ("public"."is_staff"());



CREATE POLICY "p_students_superuser_delete" ON "public"."students" FOR DELETE TO "authenticated" USING ("public"."is_superuser"());



CREATE POLICY "p_tests_staff_insert" ON "public"."tests" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_staff"());



CREATE POLICY "p_tests_staff_select" ON "public"."tests" FOR SELECT TO "authenticated" USING ("public"."is_staff"());



CREATE POLICY "p_tests_staff_update" ON "public"."tests" FOR UPDATE TO "authenticated" USING ("public"."is_staff"()) WITH CHECK ("public"."is_staff"());



CREATE POLICY "p_tests_superuser_delete" ON "public"."tests" FOR DELETE TO "authenticated" USING ("public"."is_superuser"());



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_tenant_delete" ON "public"."profiles" FOR DELETE USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_app_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text"]))));



CREATE POLICY "profiles_tenant_insert" ON "public"."profiles" FOR INSERT WITH CHECK (((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_app_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text"]))) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "profiles_tenant_select" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_app_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text"]))) OR ("public"."current_app_role"() = 'superadmin'::"text")));



CREATE POLICY "profiles_tenant_update" ON "public"."profiles" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR (("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_app_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text"]))))) WITH CHECK ((("user_id" = "auth"."uid"()) OR (("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_app_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text"])))));



ALTER TABLE "public"."report_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "report_history_delete_denied" ON "public"."report_history" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "report_history_insert_same_tenant" ON "public"."report_history" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("created_by" = "auth"."uid"()) AND ("public"."current_app_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text", 'convivencia'::"text", 'inspectoria'::"text"]))));



CREATE POLICY "report_history_select_same_tenant" ON "public"."report_history" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_app_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text", 'convivencia'::"text", 'inspectoria'::"text"]))));



CREATE POLICY "report_history_update_creator" ON "public"."report_history" FOR UPDATE TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("created_by" = "auth"."uid"()) AND ("public"."current_app_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text", 'convivencia'::"text", 'inspectoria'::"text"])))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("created_by" = "auth"."uid"()) AND ("public"."current_app_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text", 'convivencia'::"text", 'inspectoria'::"text"]))));



ALTER TABLE "public"."student_history_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "student_history_entries_delete_denied" ON "public"."student_history_entries" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "student_history_entries_insert_tenant" ON "public"."student_history_entries" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND (( SELECT "public"."current_app_role"() AS "current_app_role") = ANY (ARRAY['admin'::"text", 'direccion'::"text", 'convivencia'::"text", 'inspectoria'::"text", 'inspector'::"text", 'staff'::"text", 'superuser'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."students" "s"
  WHERE (("s"."id" = "student_history_entries"."student_id") AND ("s"."tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")))))));



CREATE POLICY "student_history_entries_select_tenant" ON "public"."student_history_entries" FOR SELECT TO "authenticated" USING ((("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND (( SELECT "public"."current_app_role"() AS "current_app_role") = ANY (ARRAY['admin'::"text", 'direccion'::"text", 'convivencia'::"text", 'inspectoria'::"text", 'inspector'::"text", 'staff'::"text", 'superuser'::"text"]))));



CREATE POLICY "student_history_entries_update_denied" ON "public"."student_history_entries" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "public"."students" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "students_tenant_delete" ON "public"."students" FOR DELETE USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_app_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text"]))));



CREATE POLICY "students_tenant_insert" ON "public"."students" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "students_tenant_select" ON "public"."students" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "students_tenant_update" ON "public"."students" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "templates_tenant_delete" ON "public"."document_templates" FOR DELETE USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_app_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text"]))));



CREATE POLICY "templates_tenant_insert" ON "public"."document_templates" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "templates_tenant_select" ON "public"."document_templates" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "templates_tenant_update" ON "public"."document_templates" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "tenant_analyses" ON "public"."document_analyses" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "tenant_detected_annotations" ON "public"."disciplinary_annotations_detected" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "tenant_files" ON "public"."disciplinary_process_files" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "tenant_processes" ON "public"."disciplinary_processes" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "tenant_rules" ON "public"."disciplinary_rules" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenants_insert_admin" ON "public"."tenants" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_app_role"() = ANY (ARRAY['admin'::"text", 'superadmin'::"text"])));



CREATE POLICY "tenants_select_own" ON "public"."tenants" FOR SELECT TO "authenticated" USING ((("id" = "public"."current_tenant_id"()) OR ("public"."current_app_role"() = 'superadmin'::"text")));



ALTER TABLE "public"."tests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usage_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "usage_events_insert_own" ON "public"."usage_events" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "usage_events_select_admin" ON "public"."usage_events" FOR SELECT TO "authenticated" USING (("public"."current_app_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text"])));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."app_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."app_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."app_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_logs_sync_actor_columns"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_logs_sync_actor_columns"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_logs_sync_actor_columns"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."clean_old_logs"("days_to_keep" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."clean_old_logs"("days_to_keep" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."clean_old_logs"("days_to_keep" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."clean_old_logs"("days_to_keep" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."count_affected_tests"("p_student_id" "uuid", "p_start" "date", "p_end" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."count_affected_tests"("p_student_id" "uuid", "p_start" "date", "p_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."count_affected_tests"("p_student_id" "uuid", "p_start" "date", "p_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_affected_tests"("p_student_id" "uuid", "p_start" "date", "p_end" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_app_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_app_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_tenant_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_tenant_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_user_memberships"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_memberships"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_memberships"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_process_number"("p_tenant_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_process_number"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_process_number"("p_tenant_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_absence_stats"("p_level" "text", "p_course_id" "uuid", "p_start_date" "date", "p_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_absence_stats"("p_level" "text", "p_course_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_absence_stats"("p_level" "text", "p_course_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_absence_stats"("p_level" "text", "p_course_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_annotation_course_stage_counts"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_annotation_course_stage_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_annotation_course_stage_counts"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_annotation_stage_counts"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_annotation_stage_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_annotation_stage_counts"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_course_carta_ranking"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_course_carta_ranking"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_course_carta_ranking"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_daily_active_users"("since" timestamp with time zone, "until" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_daily_active_users"("since" timestamp with time zone, "until" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_daily_active_users"("since" timestamp with time zone, "until" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_latest_analysis"("p_student_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_latest_analysis"("p_student_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_latest_analysis"("p_student_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_public_dashboard_kpis"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_public_dashboard_kpis"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_dashboard_kpis"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_dashboard_kpis"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_student_annotation_ranking"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_student_annotation_ranking"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_annotation_ranking"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_student_annotation_summary"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_student_annotation_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_annotation_summary"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_suggested_letter_type"("p_negativas" integer, "p_positivas" integer, "p_informativas" integer, "p_tenant_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_suggested_letter_type"("p_negativas" integer, "p_positivas" integer, "p_informativas" integer, "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_suggested_letter_type"("p_negativas" integer, "p_positivas" integer, "p_informativas" integer, "p_tenant_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_teacher_annotation_ranking"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_teacher_annotation_ranking"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teacher_annotation_ranking"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_teacher_dashboard"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_teacher_dashboard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teacher_dashboard"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_usage_stats"("since" timestamp with time zone, "until" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_usage_stats"("since" timestamp with time zone, "until" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_usage_stats"("since" timestamp with time zone, "until" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_app_access"("p_application_code" "text", "p_roles" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_app_access"("p_application_code" "text", "p_roles" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_app_access"("p_application_code" "text", "p_roles" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_management"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_management"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_management"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_staff"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_staff"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_staff"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_superuser"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_superuser"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_superuser"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_audit_log"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_audit_log"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_audit_log"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_audit_log"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."register_physical_carta"("p_student_id" "uuid", "p_letter_type" "text", "p_emission_date" "date", "p_observations" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_physical_carta"("p_student_id" "uuid", "p_letter_type" "text", "p_emission_date" "date", "p_observations" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."reject_audit_event_mutation"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."set_tenant_id"("p_tenant_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_tenant_id"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_tenant_id"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_tenant_id"("p_tenant_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_convivencia_membership_from_profile"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_convivencia_membership_from_profile"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_notification"("p_notification_key" "text", "p_notification_type" "text", "p_title" "text", "p_description" "text", "p_severity" "text", "p_entity_type" "text", "p_entity_id" "text", "p_action_url" "text", "p_expires_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_notification"("p_notification_key" "text", "p_notification_type" "text", "p_title" "text", "p_description" "text", "p_severity" "text", "p_entity_type" "text", "p_entity_id" "text", "p_action_url" "text", "p_expires_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_notification"("p_notification_key" "text", "p_notification_type" "text", "p_title" "text", "p_description" "text", "p_severity" "text", "p_entity_type" "text", "p_entity_id" "text", "p_action_url" "text", "p_expires_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_tenant_to_jwt"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_tenant_to_jwt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_tenant_to_jwt"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."teacher_get_instant_messages"("p_level" "text", "p_course_id" "uuid", "p_student_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."teacher_get_instant_messages"("p_level" "text", "p_course_id" "uuid", "p_student_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."teacher_get_instant_messages"("p_level" "text", "p_course_id" "uuid", "p_student_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."teacher_get_instant_messages"("p_level" "text", "p_course_id" "uuid", "p_student_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."teacher_get_public_absence_detail"("p_absence_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."teacher_get_public_absence_detail"("p_absence_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."teacher_get_public_absence_detail"("p_absence_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."teacher_get_public_absence_detail"("p_absence_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."teacher_get_public_absences"("p_month" integer, "p_year" integer, "p_level" "text", "p_course_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."teacher_get_public_absences"("p_month" integer, "p_year" integer, "p_level" "text", "p_course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."teacher_get_public_absences"("p_month" integer, "p_year" integer, "p_level" "text", "p_course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."teacher_get_public_absences"("p_month" integer, "p_year" integer, "p_level" "text", "p_course_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."teacher_get_public_absences_masked"("p_month" integer, "p_year" integer, "p_level" "text", "p_course_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."teacher_get_public_absences_masked"("p_month" integer, "p_year" integer, "p_level" "text", "p_course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."teacher_get_public_absences_masked"("p_month" integer, "p_year" integer, "p_level" "text", "p_course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."teacher_get_public_absences_masked"("p_month" integer, "p_year" integer, "p_level" "text", "p_course_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."teacher_get_public_courses"("p_level" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."teacher_get_public_courses"("p_level" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."teacher_get_public_courses"("p_level" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."teacher_get_public_courses"("p_level" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."teacher_get_public_instant_messages"("p_level" "text", "p_course_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."teacher_get_public_instant_messages"("p_level" "text", "p_course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."teacher_get_public_instant_messages"("p_level" "text", "p_course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."teacher_get_public_instant_messages"("p_level" "text", "p_course_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_instant_messages_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_instant_messages_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_instant_messages_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_app_memberships_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_app_memberships_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_app_memberships_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_app_memberships_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."absences" TO "anon";
GRANT ALL ON TABLE "public"."absences" TO "authenticated";
GRANT ALL ON TABLE "public"."absences" TO "service_role";



GRANT ALL ON TABLE "public"."app_memberships" TO "anon";
GRANT ALL ON TABLE "public"."app_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."app_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."applications" TO "anon";
GRANT ALL ON TABLE "public"."applications" TO "authenticated";
GRANT ALL ON TABLE "public"."applications" TO "service_role";



GRANT SELECT,INSERT ON TABLE "public"."audit_events" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_events" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bitacora_entries" TO "anon";
GRANT ALL ON TABLE "public"."bitacora_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."bitacora_entries" TO "service_role";



GRANT ALL ON TABLE "public"."carta_events" TO "anon";
GRANT ALL ON TABLE "public"."carta_events" TO "authenticated";
GRANT ALL ON TABLE "public"."carta_events" TO "service_role";



GRANT ALL ON TABLE "public"."cartas_disciplinarias" TO "anon";
GRANT ALL ON TABLE "public"."cartas_disciplinarias" TO "authenticated";
GRANT ALL ON TABLE "public"."cartas_disciplinarias" TO "service_role";



GRANT ALL ON TABLE "public"."causas" TO "anon";
GRANT ALL ON TABLE "public"."causas" TO "authenticated";
GRANT ALL ON TABLE "public"."causas" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_items" TO "anon";
GRANT ALL ON TABLE "public"."checklist_items" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_items" TO "service_role";



GRANT ALL ON TABLE "public"."coexistence_cases" TO "anon";
GRANT ALL ON TABLE "public"."coexistence_cases" TO "authenticated";
GRANT ALL ON TABLE "public"."coexistence_cases" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."disciplinary_annotations_detected" TO "anon";
GRANT ALL ON TABLE "public"."disciplinary_annotations_detected" TO "authenticated";
GRANT ALL ON TABLE "public"."disciplinary_annotations_detected" TO "service_role";



GRANT ALL ON TABLE "public"."disciplinary_process_files" TO "anon";
GRANT ALL ON TABLE "public"."disciplinary_process_files" TO "authenticated";
GRANT ALL ON TABLE "public"."disciplinary_process_files" TO "service_role";



GRANT ALL ON TABLE "public"."disciplinary_processes" TO "anon";
GRANT ALL ON TABLE "public"."disciplinary_processes" TO "authenticated";
GRANT ALL ON TABLE "public"."disciplinary_processes" TO "service_role";



GRANT ALL ON TABLE "public"."disciplinary_rules" TO "anon";
GRANT ALL ON TABLE "public"."disciplinary_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."disciplinary_rules" TO "service_role";



GRANT ALL ON TABLE "public"."document_analyses" TO "anon";
GRANT ALL ON TABLE "public"."document_analyses" TO "authenticated";
GRANT ALL ON TABLE "public"."document_analyses" TO "service_role";



GRANT ALL ON TABLE "public"."document_templates" TO "anon";
GRANT ALL ON TABLE "public"."document_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."document_templates" TO "service_role";



GRANT ALL ON TABLE "public"."etapas_disciplinarias" TO "anon";
GRANT ALL ON TABLE "public"."etapas_disciplinarias" TO "authenticated";
GRANT ALL ON TABLE "public"."etapas_disciplinarias" TO "service_role";



GRANT ALL ON TABLE "public"."feriados_chile" TO "anon";
GRANT ALL ON TABLE "public"."feriados_chile" TO "authenticated";
GRANT ALL ON TABLE "public"."feriados_chile" TO "service_role";



GRANT ALL ON TABLE "public"."inspectorate_records" TO "anon";
GRANT ALL ON TABLE "public"."inspectorate_records" TO "authenticated";
GRANT ALL ON TABLE "public"."inspectorate_records" TO "service_role";



GRANT ALL ON TABLE "public"."instant_messages" TO "anon";
GRANT ALL ON TABLE "public"."instant_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."instant_messages" TO "service_role";



GRANT ALL ON TABLE "public"."membership_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."membership_readiness" TO "anon";
GRANT ALL ON TABLE "public"."membership_readiness" TO "authenticated";
GRANT ALL ON TABLE "public"."membership_readiness" TO "service_role";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."report_history" TO "authenticated";
GRANT ALL ON TABLE "public"."report_history" TO "service_role";



GRANT SELECT ON TABLE "public"."student_history_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."student_history_entries" TO "service_role";



GRANT INSERT("student_id") ON TABLE "public"."student_history_entries" TO "authenticated";



GRANT INSERT("title") ON TABLE "public"."student_history_entries" TO "authenticated";



GRANT INSERT("description") ON TABLE "public"."student_history_entries" TO "authenticated";



GRANT ALL ON TABLE "public"."students" TO "anon";
GRANT ALL ON TABLE "public"."students" TO "authenticated";
GRANT ALL ON TABLE "public"."students" TO "service_role";



GRANT ALL ON TABLE "public"."teacher_public_view" TO "anon";
GRANT ALL ON TABLE "public"."teacher_public_view" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_public_view" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT ALL ON TABLE "public"."tests" TO "anon";
GRANT ALL ON TABLE "public"."tests" TO "authenticated";
GRANT ALL ON TABLE "public"."tests" TO "service_role";



GRANT ALL ON TABLE "public"."usage_events" TO "anon";
GRANT ALL ON TABLE "public"."usage_events" TO "authenticated";
GRANT ALL ON TABLE "public"."usage_events" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
-- ===== SOURCE END: supabase/migrations/00000_remote_schema_baseline.sql =====

-- ===== SOURCE START: supabase/migrations/20260801090000_scope_document_templates_by_tenant.sql =====
/** @license SPDX-License-Identifier: Apache-2.0 */

-- Permite que cada colegio tenga una plantilla por tipo de documento.
-- La restricción anterior era global y bloqueaba la provisión multi-tenant.
ALTER TABLE public.document_templates
  DROP CONSTRAINT IF EXISTS document_templates_doc_type_key;

CREATE UNIQUE INDEX IF NOT EXISTS document_templates_tenant_doc_type_key
  ON public.document_templates (tenant_id, doc_type);
-- ===== SOURCE END: supabase/migrations/20260801090000_scope_document_templates_by_tenant.sql =====

-- ===== SOURCE START: supabase/migrations/20260801100000_add_institutional_configuration.sql =====
/** @license SPDX-License-Identifier: Apache-2.0 */

CREATE TABLE IF NOT EXISTS public.institution_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  official_name text NOT NULL,
  institution_rut text,
  address text,
  commune text,
  region text,
  phone text,
  institutional_email text,
  proprietor text,
  director_name text,
  education_levels text[] NOT NULL DEFAULT '{}',
  logo_path text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.institution_rule_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  version text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  effective_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  published_by uuid REFERENCES auth.users(id),
  UNIQUE (tenant_id, version)
);

CREATE INDEX IF NOT EXISTS institution_rule_versions_tenant_status_idx
  ON public.institution_rule_versions (tenant_id, status, updated_at DESC);

DROP TRIGGER IF EXISTS institution_settings_updated_at ON public.institution_settings;
CREATE TRIGGER institution_settings_updated_at
  BEFORE UPDATE ON public.institution_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS institution_rule_versions_updated_at ON public.institution_rule_versions;
CREATE TRIGGER institution_rule_versions_updated_at
  BEFORE UPDATE ON public.institution_rule_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.institution_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_rule_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS institution_settings_select ON public.institution_settings;
CREATE POLICY institution_settings_select ON public.institution_settings
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.current_app_role() = 'superadmin');

DROP POLICY IF EXISTS institution_settings_write ON public.institution_settings;
CREATE POLICY institution_settings_write ON public.institution_settings
  FOR ALL TO authenticated
  USING (
    public.current_app_role() = 'superadmin'
    OR (tenant_id = public.current_tenant_id() AND public.current_app_role() IN ('admin', 'direccion'))
  )
  WITH CHECK (
    public.current_app_role() = 'superadmin'
    OR (tenant_id = public.current_tenant_id() AND public.current_app_role() IN ('admin', 'direccion'))
  );

DROP POLICY IF EXISTS institution_rules_select ON public.institution_rule_versions;
CREATE POLICY institution_rules_select ON public.institution_rule_versions
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.current_app_role() = 'superadmin');

DROP POLICY IF EXISTS institution_rules_write ON public.institution_rule_versions;
CREATE POLICY institution_rules_write ON public.institution_rule_versions
  FOR ALL TO authenticated
  USING (
    public.current_app_role() = 'superadmin'
    OR (tenant_id = public.current_tenant_id() AND public.current_app_role() IN ('admin', 'direccion'))
  )
  WITH CHECK (
    public.current_app_role() = 'superadmin'
    OR (tenant_id = public.current_tenant_id() AND public.current_app_role() IN ('admin', 'direccion'))
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('institution-assets', 'institution-assets', false, 2097152, ARRAY['image/png', 'image/jpeg', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 2097152,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS institution_assets_select ON storage.objects;
CREATE POLICY institution_assets_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'institution-assets'
    AND (
      (storage.foldername(name))[1] = public.current_tenant_id()::text
      OR public.current_app_role() = 'superadmin'
    )
  );

DROP POLICY IF EXISTS institution_assets_write ON storage.objects;
CREATE POLICY institution_assets_write ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'institution-assets'
    AND (
      public.current_app_role() = 'superadmin'
      OR (
        (storage.foldername(name))[1] = public.current_tenant_id()::text
        AND public.current_app_role() IN ('admin', 'direccion')
      )
    )
  )
  WITH CHECK (
    bucket_id = 'institution-assets'
    AND (
      public.current_app_role() = 'superadmin'
      OR (
        (storage.foldername(name))[1] = public.current_tenant_id()::text
        AND public.current_app_role() IN ('admin', 'direccion')
      )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.institution_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.institution_rule_versions TO authenticated;
GRANT ALL ON public.institution_settings, public.institution_rule_versions TO service_role;
-- ===== SOURCE END: supabase/migrations/20260801100000_add_institutional_configuration.sql =====

-- ===== SOURCE START: supabase/migrations/20260801120000_enable_notifications_realtime.sql =====
/** @license SPDX-License-Identifier: Apache-2.0 */

-- Habilita eventos de notificaciones persistentes para clientes autenticados.
-- La suscripción del frontend permanece opt-in mediante VITE_NOTIFICATIONS_REALTIME.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'notifications'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
-- ===== SOURCE END: supabase/migrations/20260801120000_enable_notifications_realtime.sql =====

-- ===== SOURCE START: supabase/migrations/20260801140000_add_institution_documents.sql =====
/** @license SPDX-License-Identifier: Apache-2.0 */

CREATE TABLE IF NOT EXISTS public.institution_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'otro',
  original_name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  uploaded_by uuid REFERENCES auth.users(id),
  archived_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS institution_documents_tenant_status_idx
  ON public.institution_documents (tenant_id, status, uploaded_at DESC);

ALTER TABLE public.institution_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS institution_documents_select ON public.institution_documents;
CREATE POLICY institution_documents_select ON public.institution_documents
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.current_app_role() = 'superadmin');

DROP POLICY IF EXISTS institution_documents_write ON public.institution_documents;
CREATE POLICY institution_documents_write ON public.institution_documents
  FOR ALL TO authenticated
  USING (
    public.current_app_role() = 'superadmin'
    OR (tenant_id = public.current_tenant_id() AND public.current_app_role() IN ('admin', 'direccion'))
  )
  WITH CHECK (
    public.current_app_role() = 'superadmin'
    OR (tenant_id = public.current_tenant_id() AND public.current_app_role() IN ('admin', 'direccion'))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.institution_documents TO authenticated;
GRANT ALL ON public.institution_documents TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'institution-assets',
  'institution-assets',
  false,
  20971520,
  ARRAY[
    'image/png', 'image/jpeg', 'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
-- ===== SOURCE END: supabase/migrations/20260801140000_add_institution_documents.sql =====

-- ===== SOURCE START: supabase/migrations/20260803004959_add_query_pattern_indexes.sql =====
/** @license SPDX-License-Identifier: Apache-2.0 */

-- Índices compuestos alineados con los patrones de lectura vigentes:
-- RLS/tenant + filtros frecuentes + ORDER BY. No cambian schema, datos ni políticas.

CREATE INDEX IF NOT EXISTS idx_courses_tenant_position_name
  ON public.courses (tenant_id, position ASC NULLS LAST, name ASC);

CREATE INDEX IF NOT EXISTS idx_students_tenant_full_name
  ON public.students (tenant_id, full_name ASC);

CREATE INDEX IF NOT EXISTS idx_students_tenant_course_full_name
  ON public.students (tenant_id, course_id, full_name ASC);

CREATE INDEX IF NOT EXISTS idx_students_tenant_rut_present
  ON public.students (tenant_id, rut)
  WHERE rut IS NOT NULL AND rut <> '';

CREATE INDEX IF NOT EXISTS idx_inspectorate_tenant_date_type_student
  ON public.inspectorate_records (tenant_id, date_time DESC, type, student_id);

CREATE INDEX IF NOT EXISTS idx_cartas_tenant_emission_created
  ON public.cartas_disciplinarias (tenant_id, emission_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cartas_tenant_student_emission_created
  ON public.cartas_disciplinarias (tenant_id, student_id, emission_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_carta_events_tenant_student_created
  ON public.carta_events (tenant_id, student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_carta_events_tenant_carta_student_type
  ON public.carta_events (tenant_id, carta_id, student_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_etapas_tenant_student_transition
  ON public.etapas_disciplinarias (tenant_id, student_id, transition_date DESC);

CREATE INDEX IF NOT EXISTS idx_disciplinary_files_tenant_student_uploaded
  ON public.disciplinary_process_files (tenant_id, student_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_disciplinary_files_tenant_hash_uploaded
  ON public.disciplinary_process_files (tenant_id, file_hash, uploaded_at DESC)
  WHERE file_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_disciplinary_annotations_tenant_student_detected
  ON public.disciplinary_annotations_detected (tenant_id, student_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_institution_rules_tenant_updated
  ON public.institution_rule_versions (tenant_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_institution_documents_tenant_uploaded
  ON public.institution_documents (tenant_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_events_letter_student_created
  ON public.usage_events ((properties ->> 'studentId'), created_at DESC)
  WHERE event_name IN ('letter_printed', 'letter_downloaded');
-- ===== SOURCE END: supabase/migrations/20260803004959_add_query_pattern_indexes.sql =====

-- ===== SOURCE START: supabase/migrations/20260803161755_add_archived_carta_event.sql =====
alter table public.carta_events
  drop constraint if exists carta_events_event_type_check;

alter table public.carta_events
  add constraint carta_events_event_type_check
  check (
    event_type = any (
      array[
        'suggested'::text,
        'created'::text,
        'registered'::text,
        'printed'::text,
        'downloaded_pdf'::text,
        'downloaded_word'::text,
        'processed_manually'::text,
        'archived'::text,
        'annulled'::text
      ]
    )
  );
-- ===== SOURCE END: supabase/migrations/20260803161755_add_archived_carta_event.sql =====

-- ===== SOURCE START: supabase/migrations/20260803165731_align_disciplinary_storage_roles.sql =====
/** @license SPDX-License-Identifier: Apache-2.0 */

-- Align the disciplinary-processes bucket RLS with the convivencia app roles
-- accepted by the application middleware. The previous policy only accepted
-- convivencia/direccion memberships, so admin users could open the PDF modal
-- but Storage rejected private uploads before analysis.

drop policy if exists "disciplinary_processes_insert_member" on storage.objects;
drop policy if exists "disciplinary_processes_select_member" on storage.objects;
drop policy if exists "disciplinary_processes_update_member" on storage.objects;
drop policy if exists "disciplinary_processes_delete_member" on storage.objects;

create policy "disciplinary_processes_insert_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'disciplinary-processes'
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role in (
        'superadmin',
        'admin',
        'direccion',
        'convivencia',
        'inspectoria',
        'profesor_jefe',
        'teacher',
        'inspector',
        'user',
        'staff'
      )
      and m.is_active
      and m.tenant_id::text = (storage.foldername(name))[1]
  )
);

create policy "disciplinary_processes_select_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'disciplinary-processes'
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role in (
        'superadmin',
        'admin',
        'direccion',
        'convivencia',
        'inspectoria',
        'profesor_jefe',
        'teacher',
        'inspector',
        'user',
        'staff'
      )
      and m.is_active
      and m.tenant_id::text = (storage.foldername(name))[1]
  )
);

create policy "disciplinary_processes_update_member"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'disciplinary-processes'
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role in (
        'superadmin',
        'admin',
        'direccion',
        'convivencia',
        'inspectoria',
        'profesor_jefe',
        'teacher',
        'inspector',
        'user',
        'staff'
      )
      and m.is_active
      and m.tenant_id::text = (storage.foldername(name))[1]
  )
)
with check (
  bucket_id = 'disciplinary-processes'
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role in (
        'superadmin',
        'admin',
        'direccion',
        'convivencia',
        'inspectoria',
        'profesor_jefe',
        'teacher',
        'inspector',
        'user',
        'staff'
      )
      and m.is_active
      and m.tenant_id::text = (storage.foldername(name))[1]
  )
);

create policy "disciplinary_processes_delete_member"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'disciplinary-processes'
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role in (
        'superadmin',
        'admin',
        'direccion',
        'convivencia',
        'inspectoria',
        'profesor_jefe',
        'teacher',
        'inspector',
        'user',
        'staff'
      )
      and m.is_active
      and m.tenant_id::text = (storage.foldername(name))[1]
  )
);
-- ===== SOURCE END: supabase/migrations/20260803165731_align_disciplinary_storage_roles.sql =====

-- ===== SOURCE START: supabase/migrations/20260804124453_expand_teacher_annotation_ranking_counts.sql =====
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

drop function if exists public.get_teacher_annotation_ranking();

create function public.get_teacher_annotation_ranking()
returns table (
  teacher_name text,
  negative_count bigint,
  positive_count bigint,
  informative_count bigint,
  total_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with tenant_scope as (
    select
      public.current_tenant_id() as tenant_id,
      extract(year from timezone('America/Santiago', now()))::integer as school_year
  )
  select
    min(d.teacher_name)::text as teacher_name,
    count(*) filter (where d.annotation_type = 'Negativa')::bigint as negative_count,
    count(*) filter (where d.annotation_type = 'Positiva')::bigint as positive_count,
    count(*) filter (where d.annotation_type = 'Información')::bigint as informative_count,
    count(*)::bigint as total_count
  from public.disciplinary_annotations_detected d
  cross join tenant_scope scope
  where d.tenant_id = scope.tenant_id
    and d.teacher_name is not null
    and d.teacher_name <> ''
    and d.detected_at is not null
    and extract(year from timezone('America/Santiago', d.detected_at))::integer = scope.school_year
  group by lower(btrim(d.teacher_name))
  having count(*) filter (where d.annotation_type = 'Negativa') > 0
  order by negative_count desc, min(d.teacher_name) asc
  limit 5;
$$;

alter function public.get_teacher_annotation_ranking() owner to postgres;

comment on function public.get_teacher_annotation_ranking() is
  'Tenant-scoped ranking of teachers by dated current-school-year negative annotations with full type counts.';

revoke all on function public.get_teacher_annotation_ranking() from public;
grant all on function public.get_teacher_annotation_ranking() to authenticated;
grant all on function public.get_teacher_annotation_ranking() to service_role;
-- ===== SOURCE END: supabase/migrations/20260804124453_expand_teacher_annotation_ranking_counts.sql =====

-- ===== SOURCE START: supabase/migrations/20260804125457_restrict_teacher_annotation_ranking_anon.sql =====
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

revoke all on function public.get_teacher_annotation_ranking() from anon;
grant execute on function public.get_teacher_annotation_ranking() to authenticated;
grant execute on function public.get_teacher_annotation_ranking() to service_role;
-- ===== SOURCE END: supabase/migrations/20260804125457_restrict_teacher_annotation_ranking_anon.sql =====

-- ===== SOURCE START: supabase/migrations/20260804135422_expand_course_and_student_rankings_to_10.sql =====
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

create or replace function public.get_course_carta_ranking()
returns table (
  course_name text,
  amonestacion_count bigint,
  compromiso_count bigint,
  derivacion_count bigint,
  total_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with tenant_scope as (
    select
      public.current_tenant_id() as tenant_id,
      extract(year from timezone('America/Santiago', now()))::integer as school_year
  )
  select
    min(c.course)::text as course_name,
    count(*) filter (where c.letter_type = 'Amonestación Escrita')::bigint as amonestacion_count,
    count(*) filter (where c.letter_type = 'Carta de Compromiso Conductual')::bigint as compromiso_count,
    count(*) filter (where c.letter_type = 'Ficha de Derivación')::bigint as derivacion_count,
    count(*)::bigint as total_count
  from public.cartas_disciplinarias c
  cross join tenant_scope scope
  where c.tenant_id = scope.tenant_id
    and c.status <> 'Anulada'
    and coalesce(c.school_year, extract(year from c.emission_date)::integer) = scope.school_year
  group by lower(btrim(c.course))
  having count(*) > 0
  order by total_count desc, min(c.course) asc
  limit 10;
$$;

comment on function public.get_course_carta_ranking() is
  'Tenant-scoped ranking of disciplinary letters for the current school year, aggregated by normalized carta course snapshot and limited to top 10.';

create or replace function public.get_student_annotation_ranking()
returns table (
  student_id uuid,
  student_name text,
  course_name text,
  negative_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with tenant_scope as (
    select
      public.current_tenant_id() as tenant_id,
      extract(year from timezone('America/Santiago', now()))::integer as school_year
  )
  select
    s.id as student_id,
    s.full_name::text as student_name,
    coalesce(c.name, 'Sin curso')::text as course_name,
    count(*)::bigint as negative_count
  from public.students s
  cross join tenant_scope scope
  join public.inspectorate_records ir
    on ir.student_id = s.id
   and ir.tenant_id = scope.tenant_id
   and extract(year from timezone('America/Santiago', ir.date_time))::integer = scope.school_year
  left join public.courses c
    on c.id = s.course_id
   and c.tenant_id = scope.tenant_id
  where s.tenant_id = scope.tenant_id
    and ir.type = 'Negativa'
  group by s.id, s.full_name, c.name
  having count(*) > 0
  order by negative_count desc, s.full_name asc
  limit 10;
$$;

comment on function public.get_student_annotation_ranking() is
  'Tenant-scoped ranking of students by current-school-year negative annotations, grouped by student id, limited to top 10, with course name.';
-- ===== SOURCE END: supabase/migrations/20260804135422_expand_course_and_student_rankings_to_10.sql =====

-- ===== SOURCE START: supabase/migrations/20260804135814_expand_course_and_student_rankings_to_12.sql =====
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

create or replace function public.get_course_carta_ranking()
returns table (
  course_name text,
  amonestacion_count bigint,
  compromiso_count bigint,
  derivacion_count bigint,
  total_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with tenant_scope as (
    select
      public.current_tenant_id() as tenant_id,
      extract(year from timezone('America/Santiago', now()))::integer as school_year
  )
  select
    min(c.course)::text as course_name,
    count(*) filter (where c.letter_type = 'Amonestación Escrita')::bigint as amonestacion_count,
    count(*) filter (where c.letter_type = 'Carta de Compromiso Conductual')::bigint as compromiso_count,
    count(*) filter (where c.letter_type = 'Ficha de Derivación')::bigint as derivacion_count,
    count(*)::bigint as total_count
  from public.cartas_disciplinarias c
  cross join tenant_scope scope
  where c.tenant_id = scope.tenant_id
    and c.status <> 'Anulada'
    and coalesce(c.school_year, extract(year from c.emission_date)::integer) = scope.school_year
  group by lower(btrim(c.course))
  having count(*) > 0
  order by total_count desc, min(c.course) asc
  limit 12;
$$;

comment on function public.get_course_carta_ranking() is
  'Tenant-scoped ranking of disciplinary letters for the current school year, aggregated by normalized carta course snapshot and limited to top 12.';

create or replace function public.get_student_annotation_ranking()
returns table (
  student_id uuid,
  student_name text,
  course_name text,
  negative_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with tenant_scope as (
    select
      public.current_tenant_id() as tenant_id,
      extract(year from timezone('America/Santiago', now()))::integer as school_year
  )
  select
    s.id as student_id,
    s.full_name::text as student_name,
    coalesce(c.name, 'Sin curso')::text as course_name,
    count(*)::bigint as negative_count
  from public.students s
  cross join tenant_scope scope
  join public.inspectorate_records ir
    on ir.student_id = s.id
   and ir.tenant_id = scope.tenant_id
   and extract(year from timezone('America/Santiago', ir.date_time))::integer = scope.school_year
  left join public.courses c
    on c.id = s.course_id
   and c.tenant_id = scope.tenant_id
  where s.tenant_id = scope.tenant_id
    and ir.type = 'Negativa'
  group by s.id, s.full_name, c.name
  having count(*) > 0
  order by negative_count desc, s.full_name asc
  limit 12;
$$;

comment on function public.get_student_annotation_ranking() is
  'Tenant-scoped ranking of students by current-school-year negative annotations, grouped by student id, limited to top 12, with course name.';
-- ===== SOURCE END: supabase/migrations/20260804135814_expand_course_and_student_rankings_to_12.sql =====

-- ===== SOURCE START: supabase/migrations/20260805011211_atomic_causa_related_snapshots.sql =====
create or replace function public.save_bitacora_snapshot(
  p_causa_id text,
  p_entries jsonb,
  p_removed_entry_ids jsonb default '[]'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_expected_count integer;
  v_written_count integer;
begin
  if auth.uid() is null or v_tenant_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_causa_id is null or btrim(p_causa_id) = '' then
    raise exception 'p_causa_id is required' using errcode = '22023';
  end if;

  if p_entries is null or jsonb_typeof(p_entries) <> 'array' then
    raise exception 'p_entries must be a JSON array' using errcode = '22023';
  end if;

  if p_removed_entry_ids is null or jsonb_typeof(p_removed_entry_ids) <> 'array' then
    raise exception 'p_removed_entry_ids must be a JSON array' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.causas c
    where c.id = p_causa_id
      and c.tenant_id = v_tenant_id
  ) then
    raise exception 'causa not found or not visible' using errcode = '42501';
  end if;

  with payload as (
    select *
    from jsonb_to_recordset(p_entries) as entry(
      id text,
      fecha text,
      tipo text,
      titulo text,
      descripcion text,
      participantes jsonb,
      documento_adjunto text
    )
  )
  select count(*)::integer
  into v_expected_count
  from payload;

  with payload as (
    select *
    from jsonb_to_recordset(p_entries) as entry(
      id text,
      fecha text,
      tipo text,
      titulo text,
      descripcion text,
      participantes jsonb,
      documento_adjunto text
    )
  )
  select count(*)::integer
  into v_written_count
  from payload
  where id is null
    or btrim(id) = ''
    or fecha is null
    or btrim(fecha) = ''
    or tipo is null
    or btrim(tipo) = ''
    or titulo is null
    or btrim(titulo) = ''
    or (participantes is not null and jsonb_typeof(participantes) <> 'array');

  if v_written_count > 0 then
    raise exception 'invalid bitacora snapshot payload' using errcode = '22023';
  end if;

  with payload as (
    select *
    from jsonb_to_recordset(p_entries) as entry(
      id text,
      fecha text,
      tipo text,
      titulo text,
      descripcion text,
      participantes jsonb,
      documento_adjunto text
    )
  )
  select (count(*) - count(distinct id))::integer
  into v_written_count
  from payload;

  if v_written_count > 0 then
    raise exception 'duplicate bitacora entry ids in snapshot' using errcode = '23505';
  end if;

  with payload as (
    select *
    from jsonb_to_recordset(p_entries) as entry(
      id text,
      fecha text,
      tipo text,
      titulo text,
      descripcion text,
      participantes jsonb,
      documento_adjunto text
    )
  ),
  written as (
    insert into public.bitacora_entries (
      id,
      causa_id,
      tenant_id,
      fecha,
      tipo,
      titulo,
      descripcion,
      participantes,
      documento_adjunto
    )
    select
      id,
      p_causa_id,
      v_tenant_id,
      fecha,
      tipo,
      titulo,
      coalesce(descripcion, ''),
      coalesce(participantes, '[]'::jsonb),
      nullif(documento_adjunto, '')
    from payload
    on conflict (id) do update
      set fecha = excluded.fecha,
          tipo = excluded.tipo,
          titulo = excluded.titulo,
          descripcion = excluded.descripcion,
          participantes = excluded.participantes,
          documento_adjunto = excluded.documento_adjunto
      where public.bitacora_entries.tenant_id = v_tenant_id
        and public.bitacora_entries.causa_id = p_causa_id
    returning 1
  )
  select count(*)::integer
  into v_written_count
  from written;

  if v_written_count <> v_expected_count then
    raise exception 'bitacora snapshot write conflict' using errcode = '40001';
  end if;

  delete from public.bitacora_entries entry
  where entry.tenant_id = v_tenant_id
    and entry.causa_id = p_causa_id
    and entry.id in (
      select removed_id
      from jsonb_array_elements_text(p_removed_entry_ids) as removed(removed_id)
    );
end;
$$;

revoke all on function public.save_bitacora_snapshot(text, jsonb, jsonb) from public;
grant execute on function public.save_bitacora_snapshot(text, jsonb, jsonb) to authenticated;
grant execute on function public.save_bitacora_snapshot(text, jsonb, jsonb) to service_role;

create or replace function public.save_checklist_snapshot(
  p_causa_id text,
  p_items jsonb,
  p_removed_item_ids jsonb default '[]'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_expected_count integer;
  v_written_count integer;
begin
  if auth.uid() is null or v_tenant_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_causa_id is null or btrim(p_causa_id) = '' then
    raise exception 'p_causa_id is required' using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items must be a JSON array' using errcode = '22023';
  end if;

  if p_removed_item_ids is null or jsonb_typeof(p_removed_item_ids) <> 'array' then
    raise exception 'p_removed_item_ids must be a JSON array' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.causas c
    where c.id = p_causa_id
      and c.tenant_id = v_tenant_id
  ) then
    raise exception 'causa not found or not visible' using errcode = '42501';
  end if;

  with payload as (
    select *
    from jsonb_to_recordset(p_items) as item(
      id text,
      label text,
      descripcion text,
      completado boolean,
      fecha_completado text,
      requerido_por text,
      registrado_por text,
      observaciones text,
      documento_nombre text,
      documento_url text
    )
  )
  select count(*)::integer
  into v_expected_count
  from payload;

  with payload as (
    select *
    from jsonb_to_recordset(p_items) as item(
      id text,
      label text,
      descripcion text,
      completado boolean,
      fecha_completado text,
      requerido_por text,
      registrado_por text,
      observaciones text,
      documento_nombre text,
      documento_url text
    )
  )
  select count(*)::integer
  into v_written_count
  from payload
  where id is null
    or btrim(id) = ''
    or label is null
    or btrim(label) = ''
    or requerido_por is null
    or btrim(requerido_por) = '';

  if v_written_count > 0 then
    raise exception 'invalid checklist snapshot payload' using errcode = '22023';
  end if;

  with payload as (
    select *
    from jsonb_to_recordset(p_items) as item(
      id text,
      label text,
      descripcion text,
      completado boolean,
      fecha_completado text,
      requerido_por text,
      registrado_por text,
      observaciones text,
      documento_nombre text,
      documento_url text
    )
  )
  select (count(*) - count(distinct id))::integer
  into v_written_count
  from payload;

  if v_written_count > 0 then
    raise exception 'duplicate checklist item ids in snapshot' using errcode = '23505';
  end if;

  with payload as (
    select *
    from jsonb_to_recordset(p_items) as item(
      id text,
      label text,
      descripcion text,
      completado boolean,
      fecha_completado text,
      requerido_por text,
      registrado_por text,
      observaciones text,
      documento_nombre text,
      documento_url text
    )
  ),
  written as (
    insert into public.checklist_items (
      id,
      causa_id,
      tenant_id,
      label,
      descripcion,
      completado,
      fecha_completado,
      requerido_por,
      registrado_por,
      observaciones,
      documento_nombre,
      documento_url
    )
    select
      id,
      p_causa_id,
      v_tenant_id,
      label,
      coalesce(descripcion, ''),
      coalesce(completado, false),
      nullif(fecha_completado, ''),
      requerido_por,
      nullif(registrado_por, ''),
      nullif(observaciones, ''),
      nullif(documento_nombre, ''),
      nullif(documento_url, '')
    from payload
    on conflict (id, causa_id) do update
      set label = excluded.label,
          descripcion = excluded.descripcion,
          completado = excluded.completado,
          fecha_completado = excluded.fecha_completado,
          requerido_por = excluded.requerido_por,
          registrado_por = excluded.registrado_por,
          observaciones = excluded.observaciones,
          documento_nombre = excluded.documento_nombre,
          documento_url = excluded.documento_url
      where public.checklist_items.tenant_id = v_tenant_id
        and public.checklist_items.causa_id = p_causa_id
    returning 1
  )
  select count(*)::integer
  into v_written_count
  from written;

  if v_written_count <> v_expected_count then
    raise exception 'checklist snapshot write conflict' using errcode = '40001';
  end if;

  delete from public.checklist_items item
  where item.tenant_id = v_tenant_id
    and item.causa_id = p_causa_id
    and item.id in (
      select removed_id
      from jsonb_array_elements_text(p_removed_item_ids) as removed(removed_id)
    );
end;
$$;

revoke all on function public.save_checklist_snapshot(text, jsonb, jsonb) from public;
grant execute on function public.save_checklist_snapshot(text, jsonb, jsonb) to authenticated;
grant execute on function public.save_checklist_snapshot(text, jsonb, jsonb) to service_role;
-- ===== SOURCE END: supabase/migrations/20260805011211_atomic_causa_related_snapshots.sql =====

-- ===== SOURCE START: supabase/migrations/20260805170822_align_convivencia_document_storage_roles.sql =====
/** @license SPDX-License-Identifier: Apache-2.0 */

-- Align documentos_convivencia Storage RLS with the convivencia app roles
-- accepted by the application middleware. Staff users can update causes and
-- checklist entries, so they must also be able to upload the private evidence
-- documents attached to those records.

drop policy if exists "documentos_convivencia_insert_member" on storage.objects;
drop policy if exists "documentos_convivencia_select_member" on storage.objects;
drop policy if exists "documentos_convivencia_delete_member" on storage.objects;

create policy "documentos_convivencia_insert_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documentos_convivencia'
  and (storage.foldername(name))[2] = 'documentos'
  and exists (
    select 1
    from public.causas c
    join public.app_memberships m on m.tenant_id = c.tenant_id
    where c.id = (storage.foldername(name))[1]
      and m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role in (
        'superadmin',
        'admin',
        'direccion',
        'convivencia',
        'inspectoria',
        'profesor_jefe',
        'teacher',
        'inspector',
        'user',
        'staff'
      )
      and m.is_active
  )
);

create policy "documentos_convivencia_select_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documentos_convivencia'
  and (storage.foldername(name))[2] = 'documentos'
  and exists (
    select 1
    from public.causas c
    join public.app_memberships m on m.tenant_id = c.tenant_id
    where c.id = (storage.foldername(name))[1]
      and m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role in (
        'superadmin',
        'admin',
        'direccion',
        'convivencia',
        'inspectoria',
        'profesor_jefe',
        'teacher',
        'inspector',
        'user',
        'staff'
      )
      and m.is_active
  )
);

create policy "documentos_convivencia_delete_member"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'documentos_convivencia'
  and (storage.foldername(name))[2] = 'documentos'
  and exists (
    select 1
    from public.causas c
    join public.app_memberships m on m.tenant_id = c.tenant_id
    where c.id = (storage.foldername(name))[1]
      and m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role in (
        'superadmin',
        'admin',
        'direccion',
        'convivencia',
        'inspectoria',
        'profesor_jefe',
        'teacher',
        'inspector',
        'user',
        'staff'
      )
      and m.is_active
  )
);
-- ===== SOURCE END: supabase/migrations/20260805170822_align_convivencia_document_storage_roles.sql =====

-- ===== SOURCE START: supabase/migrations/20260806090000_add_causa_documents_notificacion_inicio_indagacion.sql =====
-- Notificación de Inicio de Indagación como documento oficial de causa.
--
-- Aísla la persistencia de la notificación (formato hoja Carta, sin IA) del
-- flujo de cartas disciplinarias y del generador Gemini. La tabla guarda el
-- snapshot final del documento emitido (trazabilidad) y el RPC transaccional
-- completa el hito chk_rec_3 y agrega la entrada de bitácora en una sola
-- transacción, con tenant resuelto por RLS en PostgreSQL.

create table if not exists public.causa_documents (
  id uuid primary key default gen_random_uuid(),
  causa_id text not null references public.causas(id),
  doc_type text not null,
  status text not null default 'Pendiente',
  content_snapshot jsonb not null default '{}'::jsonb,
  created_by text,
  emitted_by text,
  student_name text not null,
  apoderado_name text not null,
  course text not null,
  emission_date date not null default CURRENT_DATE,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  tenant_id uuid not null default public.current_tenant_id(),
  constraint causa_documents_doc_type_check
    check (doc_type = 'notificacion_inicio_indagacion'),
  constraint causa_documents_status_check
    check (status in ('Pendiente', 'Notificada', 'Anulada'))
);

alter table public.causa_documents owner to postgres;

create index if not exists idx_causa_documents_tenant_causa_type
  on public.causa_documents (tenant_id, causa_id, doc_type);

alter table public.causa_documents enable row level security;

create policy "causa_documents_tenant_select"
  on public.causa_documents for select
  using ((tenant_id = public.current_tenant_id()));

create policy "causa_documents_tenant_insert"
  on public.causa_documents for insert
  with check ((tenant_id = public.current_tenant_id()));

create policy "causa_documents_tenant_update"
  on public.causa_documents for update
  using ((tenant_id = public.current_tenant_id()))
  with check ((tenant_id = public.current_tenant_id()));

create policy "causa_documents_tenant_delete"
  on public.causa_documents for delete
  using ((tenant_id = public.current_tenant_id()));

-- Marca una notificación como notificada de forma atómica:
--   1) actualiza el documento (snapshot final, emisor, fecha/hora de notificación);
--   2) completa el hito chk_rec_3 del checklist de la causa;
--   3) agrega la entrada de bitácora tipo 'Notificación'.
-- Todo dentro de una única transacción, validando auth, tenant y visibilidad.
create or replace function public.mark_causa_document_notified(
  p_document_id uuid,
  p_snapshot jsonb,
  p_checklist_item jsonb,
  p_bitacora_entry jsonb
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_causa_id text;
  v_student_name text;
  v_course text;
  v_emitted_by text;
  v_now timestamptz := now();
begin
  if auth.uid() is null or v_tenant_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_document_id is null then
    raise exception 'p_document_id is required' using errcode = '22023';
  end if;

  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then
    raise exception 'p_snapshot must be a JSON object' using errcode = '22023';
  end if;

  select c.causa_id, c.student_name, c.course, c.emitted_by
    into v_causa_id, v_student_name, v_course, v_emitted_by
  from public.causa_documents c
  where c.id = p_document_id
    and c.tenant_id = v_tenant_id
    and c.doc_type = 'notificacion_inicio_indagacion';

  if v_causa_id is null then
    raise exception 'document not found or not visible' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.causas c
    where c.id = v_causa_id
      and c.tenant_id = v_tenant_id
  ) then
    raise exception 'causa not found or not visible' using errcode = '42501';
  end if;

  if p_checklist_item is not null then
    if jsonb_typeof(p_checklist_item) <> 'object'
       or p_checklist_item->>'id' is null
       or btrim(p_checklist_item->>'id') = ''
       or p_checklist_item->>'label' is null
       or btrim(p_checklist_item->>'label') = ''
       or p_checklist_item->>'requerido_por' is null
       or btrim(p_checklist_item->>'requerido_por') = '' then
      raise exception 'invalid checklist item payload' using errcode = '22023';
    end if;
  end if;

  if p_bitacora_entry is not null then
    if jsonb_typeof(p_bitacora_entry) <> 'object'
       or p_bitacora_entry->>'id' is null
       or btrim(p_bitacora_entry->>'id') = ''
       or p_bitacora_entry->>'fecha' is null
       or btrim(p_bitacora_entry->>'fecha') = ''
       or p_bitacora_entry->>'tipo' is null
       or btrim(p_bitacora_entry->>'tipo') = ''
       or p_bitacora_entry->>'titulo' is null
       or btrim(p_bitacora_entry->>'titulo') = ''
       or (p_bitacora_entry->'participantes' is not null
           and jsonb_typeof(p_bitacora_entry->'participantes') <> 'array') then
      raise exception 'invalid bitacora entry payload' using errcode = '22023';
    end if;
  end if;

  update public.causa_documents
     set status = 'Notificada',
         content_snapshot = p_snapshot,
         emitted_by = coalesce(p_snapshot->>'emittedBy', v_emitted_by),
         student_name = coalesce(p_snapshot->>'studentName', v_student_name),
         apoderado_name = coalesce(p_snapshot->>'apoderadoName', apoderado_name),
         course = coalesce(p_snapshot->>'course', v_course),
         notified_at = v_now,
         updated_at = v_now
   where id = p_document_id
     and tenant_id = v_tenant_id
     and status = 'Pendiente';

  if not found then
    raise exception 'document already notified or not visible' using errcode = '42501';
  end if;

  if p_checklist_item is not null then
    insert into public.checklist_items (
      id,
      causa_id,
      tenant_id,
      label,
      descripcion,
      completado,
      fecha_completado,
      requerido_por,
      registrado_por,
      observaciones,
      documento_nombre,
      documento_url
    )
    values (
      p_checklist_item->>'id',
      v_causa_id,
      v_tenant_id,
      p_checklist_item->>'label',
      coalesce(p_checklist_item->>'descripcion', ''),
      true,
      coalesce(
        p_checklist_item->>'fecha_completado',
        to_char(v_now at time zone 'America/Santiago', 'YYYY-MM-DD')
      ),
      p_checklist_item->>'requerido_por',
      coalesce(p_checklist_item->>'registrado_por', v_emitted_by),
      nullif(p_checklist_item->>'observaciones', ''),
      nullif(p_checklist_item->>'documento_nombre', ''),
      nullif(p_checklist_item->>'documento_url', '')
    )
    on conflict (id, causa_id) do update
      set label = excluded.label,
          descripcion = excluded.descripcion,
          completado = true,
          fecha_completado = excluded.fecha_completado,
          requerido_por = excluded.requerido_por,
          registrado_por = excluded.registrado_por,
          observaciones = excluded.observaciones,
          documento_nombre = excluded.documento_nombre,
          documento_url = excluded.documento_url
      where public.checklist_items.tenant_id = v_tenant_id
        and public.checklist_items.causa_id = v_causa_id;
  end if;

  if p_bitacora_entry is not null then
    insert into public.bitacora_entries (
      id,
      causa_id,
      tenant_id,
      fecha,
      tipo,
      titulo,
      descripcion,
      participantes,
      documento_adjunto
    )
    values (
      p_bitacora_entry->>'id',
      v_causa_id,
      v_tenant_id,
      p_bitacora_entry->>'fecha',
      p_bitacora_entry->>'tipo',
      p_bitacora_entry->>'titulo',
      coalesce(p_bitacora_entry->>'descripcion', ''),
      coalesce(p_bitacora_entry->'participantes', '[]'::jsonb),
      nullif(p_bitacora_entry->>'documento_adjunto', '')
    )
    on conflict (id) do update
      set fecha = excluded.fecha,
          tipo = excluded.tipo,
          titulo = excluded.titulo,
          descripcion = excluded.descripcion,
          participantes = excluded.participantes,
          documento_adjunto = excluded.documento_adjunto
      where public.bitacora_entries.tenant_id = v_tenant_id
        and public.bitacora_entries.causa_id = v_causa_id;
  end if;
end;
$$;

revoke all on function public.mark_causa_document_notified(uuid, jsonb, jsonb, jsonb) from public;
grant execute on function public.mark_causa_document_notified(uuid, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.mark_causa_document_notified(uuid, jsonb, jsonb, jsonb) to service_role;
-- ===== SOURCE END: supabase/migrations/20260806090000_add_causa_documents_notificacion_inicio_indagacion.sql =====

-- ===== SOURCE START: supabase/migrations/20260806093000_revoke_anon_table_access.sql =====
-- Revoca permisos directos del rol anon sobre las tablas del schema public.
--
-- Contexto: el baseline (00000_remote_schema_baseline.sql) otorga
-- GRANT ALL ON TABLE ... TO anon en 57 objetos (students, profiles, causas,
-- cartas_disciplinarias, inspectorate_records, etc.). El RLS está habilitado y
-- no hay policies para anon, por lo que el aislamiento se mantiene hoy, pero
-- esto es defensa en profundidad débil: si en el futuro se crea una policy sin
-- restringir rol o se deshabilita RLS, anon tendría acceso total.
--
-- Esta migración revoca el acceso directo a tablas. Los flujos públicos que
-- requieren datos (dashboard público, vista docente) usan funciones
-- SECURITY DEFINER con grants propios (get_public_dashboard_kpis,
-- teacher_get_public_*), que NO se ven afectadas por este REVOKE.
--
-- Regla: las políticas RLS siguen siendo la primera línea de defensa; este
-- REVOKE es la segunda capa (least privilege).

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- SEC-02: revoca ejecución de funciones internas que no deben ser invocables
-- por anon. app_role() resuelve el rol del usuario desde auth.uid() y no tiene
-- uso legítimo público. current_app_role()/current_tenant_id() son usadas por
-- las RLS policies (se evalúan como SECURITY DEFINER dentro del contexto de la
-- policy) y conservan su grant para authenticated vía las policies, pero
-- anon no debe invocarlas directamente.

REVOKE ALL ON FUNCTION public.app_role() FROM anon;
REVOKE ALL ON FUNCTION public.current_app_role() FROM anon;
REVOKE ALL ON FUNCTION public.current_tenant_id() FROM anon;
REVOKE ALL ON FUNCTION public.clean_old_logs(integer) FROM anon;
REVOKE ALL ON FUNCTION public.count_affected_tests(uuid, date, date) FROM anon;

-- Verificación esperada tras aplicar:
--   SELECT has_table_privilege('anon', 'public.students', 'SELECT');  -- false
--   SELECT has_table_privilege('anon', 'public.causas', 'SELECT');    -- false
--   SELECT has_function_privilege('anon', 'public.app_role()', 'EXECUTE'); -- false
--   SELECT has_function_privilege('anon', 'public.get_public_dashboard_kpis()', 'EXECUTE'); -- true
-- ===== SOURCE END: supabase/migrations/20260806093000_revoke_anon_table_access.sql =====

-- ===== SOURCE START: supabase/migrations/20260806120000_add_annual_annotation_trend_rpc.sql =====
-- RPC get_annual_annotation_trend: devuelve la agregación mensual de
-- anotaciones del ciclo escolar (marzo-diciembre) en lugar de descargar
-- miles de filas de inspectorate_records para agregarlas en el cliente.
--
-- PERF-04: fetchAnnualAnnotationTrends descargaba todas las
-- inspectorate_records del año (5.000+ filas) y agregaba por mes en el
-- navegador. Esta función devuelve solo ~10-12 filas (una por mes) con
-- conteos disjuntos por celda (tipo × severidad alta) para que el cliente
-- reconstruya exactamente las métricas del dashboard: total, negativas,
-- positivas y de alta severidad, sin doble conteo.
--
-- tenant resuelto en base de datos vía current_tenant_id() (mismo patrón
-- que save_bitacora_snapshot/save_checklist_snapshot), security invoker y
-- EXECUTE solo a authenticated + service_role.

CREATE OR REPLACE FUNCTION public.get_annual_annotation_trend(p_year integer)
RETURNS TABLE (
  month_key text,
  total_count bigint,
  negative_count bigint,
  negative_high_count bigint,
  positive_count bigint,
  positive_high_count bigint,
  other_count bigint,
  other_high_count bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid := public.current_tenant_id();
  v_start timestamp with time zone := make_timestamp(p_year, 3, 1, 0, 0, 0);
  v_end timestamp with time zone := make_timestamp(p_year + 1, 1, 1, 0, 0, 0);
BEGIN
  IF p_year < 2000 OR p_year > 2200 THEN
    RAISE EXCEPTION 'El año escolar solicitado no es válido.';
  END IF;

  RETURN QUERY
  SELECT
    to_char(date_trunc('month', r.date_time), 'YYYY-MM') AS month_key,
    count(*) AS total_count,
    count(*) FILTER (WHERE r.type = 'Negativa' AND r.severity NOT IN ('Muy Grave', 'Gravísima')) AS negative_count,
    count(*) FILTER (WHERE r.type = 'Negativa' AND r.severity IN ('Muy Grave', 'Gravísima')) AS negative_high_count,
    count(*) FILTER (WHERE r.type = 'Positiva' AND r.severity NOT IN ('Muy Grave', 'Gravísima')) AS positive_count,
    count(*) FILTER (WHERE r.type = 'Positiva' AND r.severity IN ('Muy Grave', 'Gravísima')) AS positive_high_count,
    count(*) FILTER (WHERE r.type NOT IN ('Negativa', 'Positiva') AND r.severity NOT IN ('Muy Grave', 'Gravísima')) AS other_count,
    count(*) FILTER (WHERE r.type NOT IN ('Negativa', 'Positiva') AND r.severity IN ('Muy Grave', 'Gravísima')) AS other_high_count
  FROM public.inspectorate_records r
  WHERE r.tenant_id = v_tenant_id
    AND r.date_time >= v_start
    AND r.date_time < v_end
  GROUP BY month_key
  ORDER BY month_key;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_annual_annotation_trend(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_annual_annotation_trend(integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_annual_annotation_trend(integer) FROM anon;

-- Verificación esperada tras aplicar:
--   SELECT has_function_privilege('anon', 'public.get_annual_annotation_trend(integer)', 'EXECUTE'); -- false
--   SELECT has_function_privilege('authenticated', 'public.get_annual_annotation_trend(integer)', 'EXECUTE'); -- true
-- ===== SOURCE END: supabase/migrations/20260806120000_add_annual_annotation_trend_rpc.sql =====

-- ===== SOURCE START: supabase/migrations/20260806123000_add_tenant_user_counts_rpc.sql =====
-- RPC get_tenant_user_counts: devuelve el conteo de usuarios (profiles) por
-- tenant en una sola query agregada.
--
-- PERF-02: GET /api/platform/tenants iteraba todos los colegios y ejecutaba
-- profiles.select(count) por cada uno (N+1). Con 200 colegios eran 201
-- queries. Esta función devuelve todos los conteos con GROUP BY tenant_id en
-- una sola ejecución.
--
-- Solo la invoca el backend con service_role (superadmin), por lo que se
-- concede EXECUTE solo a service_role.

CREATE OR REPLACE FUNCTION public.get_tenant_user_counts()
RETURNS TABLE (
  tenant_id uuid,
  user_count bigint
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.tenant_id, count(*)::bigint AS user_count
  FROM public.profiles p
  GROUP BY p.tenant_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_user_counts() TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_tenant_user_counts() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_tenant_user_counts() FROM anon;

-- Verificación esperada tras aplicar:
--   SELECT has_function_privilege('anon', 'public.get_tenant_user_counts()', 'EXECUTE'); -- false
--   SELECT has_function_privilege('service_role', 'public.get_tenant_user_counts()', 'EXECUTE'); -- true
-- ===== SOURCE END: supabase/migrations/20260806123000_add_tenant_user_counts_rpc.sql =====

-- ===== SOURCE START: supabase/migrations/20260806124000_enforce_carta_events_tenant.sql =====
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
-- ===== SOURCE END: supabase/migrations/20260806124000_enforce_carta_events_tenant.sql =====

-- ===== SOURCE START: supabase/migrations/20260806130000_revoke_app_role_public_execute.sql =====
-- SEC-02 fix: `app_role()` seguía ejecutable por anon vía el grant default a
-- PUBLIC (acl de función recién creada). El REVOKE FROM anon de
-- 20260806093000 quita el grant directo, pero como anon es miembro de PUBLIC,
-- el default `=x/owner` seguía permitiendo EXECUTE.
--
-- Se revoca de PUBLIC (authenticated y service_role conservan sus grants
-- explícitos registrados en el baseline/00000 y en las políticas RLS).

REVOKE ALL ON FUNCTION public.app_role() FROM PUBLIC;

-- Verificación esperada tras aplicar:
--   SELECT has_function_privilege('anon', 'public.app_role()', 'EXECUTE'); -- false
--   SELECT has_function_privilege('authenticated', 'public.app_role()', 'EXECUTE'); -- true
--   SELECT has_function_privilege('service_role', 'public.app_role()', 'EXECUTE'); -- true
-- ===== SOURCE END: supabase/migrations/20260806130000_revoke_app_role_public_execute.sql =====

-- ===== SOURCE START: supabase/migrations/20260807000000_carta_events_uuid_fk.sql =====
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
-- ===== SOURCE END: supabase/migrations/20260807000000_carta_events_uuid_fk.sql =====

-- ===== SOURCE START: supabase/migrations/20260808000000_swap_carta_events_uuid_final.sql =====
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
-- ===== SOURCE END: supabase/migrations/20260808000000_swap_carta_events_uuid_final.sql =====

-- ===== SOURCE START: supabase/migrations/20260808100000_drop_carta_events_text_columns.sql =====
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
-- ===== SOURCE END: supabase/migrations/20260808100000_drop_carta_events_text_columns.sql =====

-- ===== SOURCE START: supabase/migrations/20260808120000_restore_current_role_execute.sql =====
-- Restaura el EXECUTE de current_role() para anon y authenticated.
--
-- Contexto: el baseline (00000_remote_schema_baseline.sql, líneas 3576-3579)
-- concede EXECUTE de current_role() a anon, authenticated y service_role.
-- Un REVOKE aplicado fuera de las migraciones locales dejó el ACL real con
-- solo {postgres, service_role}, lo que rompe las policies RLS is_staff()/
-- is_superuser() (que usan current_role()) para usuarios authenticated y anon
-- (error 42501 "permission denied for function current_role") en courses,
-- inspectorate_records, students, etc.
--
-- current_role() es SECURITY DEFINER y para anon devuelve 'teacher'
-- (auth.uid() es NULL), por lo que no expone datos: is_staff()/is_superuser()
-- evalúan false. Se restaura el estado documentado del baseline.

GRANT EXECUTE ON FUNCTION public.current_role() TO anon;
GRANT EXECUTE ON FUNCTION public.current_role() TO authenticated;

-- Cierra el drift de get_annual_annotation_trend: la migración
-- 20260806120000 revocó EXECUTE de anon, pero como anon es miembro de PUBLIC,
-- el default =X/postgres seguía permitiendo EXECUTE (mismo bug que SEC-02 en
-- app_role). REVOKE FROM PUBLIC quita el default; authenticated y service_role
-- conservan sus grants explícitos de la migración original.

REVOKE EXECUTE ON FUNCTION public.get_annual_annotation_trend(integer) FROM PUBLIC;

-- Verificación esperada tras aplicar:
--   SELECT has_function_privilege('anon', 'public.current_role()', 'EXECUTE');          -- true
--   SELECT has_function_privilege('authenticated', 'public.current_role()', 'EXECUTE'); -- true
--   SELECT has_function_privilege('service_role', 'public.current_role()', 'EXECUTE');  -- true
--   SELECT has_function_privilege('anon', 'public.get_annual_annotation_trend(integer)', 'EXECUTE'); -- false
--   SELECT has_function_privilege('authenticated', 'public.get_annual_annotation_trend(integer)', 'EXECUTE'); -- true
-- ===== SOURCE END: supabase/migrations/20260808120000_restore_current_role_execute.sql =====

-- ===== SOURCE START: supabase/migrations/20260812165845_add_checklist_progress_entries.sql =====
/** @license SPDX-License-Identifier: Apache-2.0 */

create table if not exists public.checklist_progress_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id()
    references public.tenants(id),
  causa_id text not null,
  checklist_item_id text not null,
  title text not null check (btrim(title) <> ''),
  description text not null check (btrim(description) <> ''),
  entry_type text not null check (
    entry_type = any (array['Entrevista', 'Evidencia', 'Notificación', 'Mediación', 'Resolución', 'Otro'])
  ),
  occurred_at timestamp with time zone not null default now(),
  document_name text,
  document_url text,
  created_by uuid references public.profiles(user_id),
  created_at timestamp with time zone not null default now(),
  invalidated_at timestamp with time zone,
  invalidated_by uuid references public.profiles(user_id),
  invalidation_reason text,
  constraint checklist_progress_entries_causa_fkey
    foreign key (causa_id) references public.causas(id) on delete cascade,
  constraint checklist_progress_entries_item_fkey
    foreign key (checklist_item_id, causa_id)
    references public.checklist_items(id, causa_id),
  constraint checklist_progress_entries_invalidation_check check (
    (invalidated_at is null and invalidated_by is null and invalidation_reason is null)
    or (invalidated_at is not null and invalidated_by is not null and btrim(coalesce(invalidation_reason, '')) <> '')
  )
);

create index if not exists idx_checklist_progress_tenant_causa_item_date
  on public.checklist_progress_entries (tenant_id, causa_id, checklist_item_id, occurred_at desc);

create index if not exists idx_checklist_progress_tenant_causa_created
  on public.checklist_progress_entries (tenant_id, causa_id, created_at desc);

alter table public.checklist_progress_entries enable row level security;

create policy checklist_progress_tenant_select
  on public.checklist_progress_entries for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

create policy checklist_progress_tenant_insert
  on public.checklist_progress_entries for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id());

create policy checklist_progress_tenant_update
  on public.checklist_progress_entries for update
  to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy checklist_progress_tenant_delete
  on public.checklist_progress_entries for delete
  to authenticated
  using (tenant_id = public.current_tenant_id());

revoke all on table public.checklist_progress_entries from anon;
grant select, insert, update, delete on table public.checklist_progress_entries to authenticated;
grant all on table public.checklist_progress_entries to service_role;
-- ===== SOURCE END: supabase/migrations/20260812165845_add_checklist_progress_entries.sql =====

-- ===== SOURCE START: supabase/migrations/20260812170006_restrict_checklist_progress_grants.sql =====
/** @license SPDX-License-Identifier: Apache-2.0 */

revoke references, trigger, truncate
  on table public.checklist_progress_entries
  from authenticated;
-- ===== SOURCE END: supabase/migrations/20260812170006_restrict_checklist_progress_grants.sql =====

-- ===== SOURCE START: supabase/migrations/20260812184559_harden_audit_findings.sql =====
-- Cierra hallazgos de auditoria sin retirar permisos necesarios para RLS.

-- current_role() solo se usaba como helper interno de politicas. Nunca debe
-- ser una funcion RPC anonima expuesta en el Data API.
revoke execute on function public.current_role() from anon;

-- Estas tablas legacy no participan en la aplicacion actual. Mantener RLS
-- activo con politicas deny explicitas evita una tabla protegida sin contrato
-- visible y conserva el acceso del service_role para tareas administrativas.
revoke all on table public.coexistence_cases from anon, authenticated;
revoke all on table public.membership_invitations from anon, authenticated;

drop policy if exists coexistence_cases_no_client_access on public.coexistence_cases;
create policy coexistence_cases_no_client_access
  on public.coexistence_cases
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists membership_invitations_no_client_access on public.membership_invitations;
create policy membership_invitations_no_client_access
  on public.membership_invitations
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Indices para las FKs y joins de avances repetibles.
create index if not exists idx_checklist_progress_entries_causa
  on public.checklist_progress_entries (causa_id);

create index if not exists idx_checklist_progress_entries_created_by
  on public.checklist_progress_entries (created_by);

create index if not exists idx_checklist_progress_entries_invalidated_by
  on public.checklist_progress_entries (invalidated_by);

create index if not exists idx_checklist_progress_entries_item_causa
  on public.checklist_progress_entries (checklist_item_id, causa_id);
-- ===== SOURCE END: supabase/migrations/20260812184559_harden_audit_findings.sql =====

-- ===== SOURCE START: supabase/migrations/20260813122733_allow_superadmin_causa_delete.sql =====
/** @license SPDX-License-Identifier: Apache-2.0 */

-- Superadmin may delete causes within the currently selected tenant only.
DROP POLICY IF EXISTS "causas_tenant_delete" ON public.causas;

CREATE POLICY "causas_tenant_delete"
  ON public.causas
  FOR DELETE
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_app_role() = ANY (ARRAY['admin', 'direccion', 'superadmin'])
  );
-- ===== SOURCE END: supabase/migrations/20260813122733_allow_superadmin_causa_delete.sql =====

-- ===== SOURCE START: supabase/migrations/20260815013328_grant_authenticated_teacher_rpcs.sql =====
-- Reproduce the live grant state for teacher RPCs.
-- Public/anon execution is intentionally closed; authenticated teachers and
-- service_role retain access through the existing function contracts.
REVOKE ALL ON FUNCTION public.teacher_get_instant_messages(text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.teacher_get_instant_messages(text, uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.teacher_get_public_absence_detail(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.teacher_get_public_absence_detail(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.teacher_get_public_absences(integer, integer, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.teacher_get_public_absences(integer, integer, text, uuid) TO authenticated, service_role;
-- ===== SOURCE END: supabase/migrations/20260815013328_grant_authenticated_teacher_rpcs.sql =====

-- ===== SOURCE START: supabase/migrations/20260815014418_drop_legacy_carta_events_backup.sql =====
-- The pre-swap copy is preserved in backups/ before this cleanup.
-- It is not part of the application's operational schema.
DROP TABLE IF EXISTS public.carta_events_pre_swap_backup;
-- ===== SOURCE END: supabase/migrations/20260815014418_drop_legacy_carta_events_backup.sql =====

-- ===== SOURCE START: supabase/migrations/20260815020108_fix_teacher_rpc_tenant_isolation.sql =====
-- Close cross-tenant reads from SECURITY DEFINER teacher RPCs.
-- RLS does not apply inside these functions, so every query must scope rows
-- explicitly to the authenticated tenant.

CREATE OR REPLACE FUNCTION public.teacher_get_instant_messages(
  p_level text DEFAULT NULL,
  p_course_id uuid DEFAULT NULL,
  p_student_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  title text,
  body text,
  level text,
  course_id uuid,
  student_id uuid,
  student_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select
    m.id,
    m.title,
    m.body,
    m.level,
    m.course_id,
    m.student_id,
    s.full_name as student_name,
    m.starts_at,
    m.ends_at,
    m.created_at
  from public.instant_messages m
  left join public.students s
    on s.id = m.student_id
   and s.tenant_id = public.current_tenant_id()
  where m.is_active = true
    and (
      (m.student_id is not null and exists (
        select 1 from public.students ms
        where ms.id = m.student_id
          and ms.tenant_id = public.current_tenant_id()
      ))
      or (m.course_id is not null and exists (
        select 1 from public.courses mc
        where mc.id = m.course_id
          and mc.tenant_id = public.current_tenant_id()
      ))
    )
    and m.starts_at <= now()
    and (m.ends_at is null or m.ends_at >= now())
    and (p_level is null or m.level is null or m.level = p_level)
    and (p_course_id is null or m.course_id is null or m.course_id = p_course_id)
    and (p_student_id is null or m.student_id is null or m.student_id = p_student_id)
  order by m.starts_at desc, m.created_at desc;
$$;

CREATE OR REPLACE FUNCTION public.teacher_get_public_absences(
  p_month integer,
  p_year integer,
  p_level text DEFAULT NULL,
  p_course_id uuid DEFAULT NULL
)
RETURNS TABLE(
  absence_id uuid,
  student_name text,
  course_id uuid,
  course_name text,
  course_level text,
  start_date date,
  end_date date,
  status text,
  observation text,
  affected_tests_count integer
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
declare
  v_month_start date;
  v_month_end date;
begin
  if p_month is null or p_month < 1 or p_month > 12 then
    raise exception 'p_month must be between 1 and 12';
  end if;
  if p_year is null or p_year < 2000 or p_year > 2100 then
    raise exception 'p_year must be between 2000 and 2100';
  end if;

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end := (v_month_start + interval '1 month - 1 day')::date;

  return query
  select
    a.id,
    s.full_name,
    c.id,
    c.name,
    c.level,
    a.start_date,
    a.end_date,
    a.status,
    a.observation,
    coalesce(ta.affected_tests_count, 0)::int
  from public.absences a
  join public.students s
    on s.id = a.student_id
   and s.tenant_id = public.current_tenant_id()
  join public.courses c
    on c.id = s.course_id
   and c.tenant_id = public.current_tenant_id()
  left join lateral (
    select count(*)::int as affected_tests_count
    from public.tests t
    where t.course_id = c.id
      and t.date between a.start_date and a.end_date
      and t.date between v_month_start and v_month_end
  ) ta on true
  where a.start_date <= v_month_end
    and a.end_date >= v_month_start
    and (p_level is null or c.level = p_level)
    and (p_course_id is null or c.id = p_course_id)
  order by a.start_date desc, s.full_name asc;
end;
$$;

CREATE OR REPLACE FUNCTION public.teacher_get_public_absence_detail(
  p_absence_id uuid
)
RETURNS TABLE(id uuid, date date, subject text, type text)
LANGUAGE sql SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select t.id, t.date, t.subject, t.type
  from public.absences a
  join public.students s
    on s.id = a.student_id
   and s.tenant_id = public.current_tenant_id()
  join public.tests t on t.course_id = s.course_id
  where a.id = p_absence_id
    and t.date between a.start_date and a.end_date
  order by t.date;
$$;

CREATE OR REPLACE FUNCTION public.teacher_get_public_absences_masked(
  p_month integer,
  p_year integer,
  p_level text DEFAULT NULL,
  p_course_id uuid DEFAULT NULL
)
RETURNS TABLE(
  absence_id text,
  student_name text,
  course_id uuid,
  course_name text,
  course_level text,
  start_date date,
  end_date date,
  status text,
  observation text,
  affected_tests_count integer
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
declare
  v_month_start date;
  v_month_end date;
begin
  if p_month is null or p_month < 1 or p_month > 12 then
    raise exception 'p_month must be between 1 and 12';
  end if;
  if p_year is null or p_year < 2000 or p_year > 2100 then
    raise exception 'p_year must be between 2000 and 2100';
  end if;

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end := (v_month_start + interval '1 month - 1 day')::date;

  return query
  select
    md5(a.id::text),
    (
      select string_agg(upper(left(name_part, 1)) || '.', ' ' order by part_order)
      from regexp_split_to_table(trim(s.full_name), E'\\s+') with ordinality as parts(name_part, part_order)
      where name_part <> ''
    ),
    c.id,
    c.name,
    c.level,
    a.start_date,
    a.end_date,
    a.status,
    null::text,
    coalesce(ta.affected_tests_count, 0)::int
  from public.absences a
  join public.students s
    on s.id = a.student_id
   and s.tenant_id = public.current_tenant_id()
  join public.courses c
    on c.id = s.course_id
   and c.tenant_id = public.current_tenant_id()
  left join lateral (
    select count(*)::int as affected_tests_count
    from public.tests t
    where t.course_id = c.id
      and t.date between a.start_date and a.end_date
      and t.date between v_month_start and v_month_end
  ) ta on true
  where a.start_date <= v_month_end
    and a.end_date >= v_month_start
    and (p_level is null or c.level = p_level)
    and (p_course_id is null or c.id = p_course_id)
  order by a.start_date desc, s.full_name asc;
end;
$$;

CREATE OR REPLACE FUNCTION public.teacher_get_public_courses(
  p_level text DEFAULT NULL
)
RETURNS TABLE(id uuid, name text, level text, "position" integer)
LANGUAGE sql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  select c.id, c.name, c.level, c.position
  from public.courses c
  where c.tenant_id = public.current_tenant_id()
    and (p_level is null or c.level = p_level)
  order by c.position, c.name;
$$;

CREATE OR REPLACE FUNCTION public.teacher_get_public_instant_messages(
  p_level text DEFAULT NULL,
  p_course_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  title text,
  body text,
  level text,
  course_id uuid,
  student_id uuid,
  student_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select
    m.id,
    m.title,
    m.body,
    m.level,
    m.course_id,
    null::uuid,
    null::text,
    m.starts_at,
    m.ends_at,
    m.created_at
  from public.instant_messages m
  where m.is_active = true
    and (
      (m.course_id is not null and exists (
        select 1 from public.courses mc
        where mc.id = m.course_id
          and mc.tenant_id = public.current_tenant_id()
      ))
      or (m.student_id is not null and exists (
        select 1 from public.students ms
        where ms.id = m.student_id
          and ms.tenant_id = public.current_tenant_id()
      ))
    )
    and m.starts_at <= now()
    and (m.ends_at is null or m.ends_at >= now())
    and m.student_id is null
    and (p_level is null or m.level is null or m.level = p_level)
    and (p_course_id is null or m.course_id is null or m.course_id = p_course_id)
  order by m.starts_at desc, m.created_at desc;
$$;

-- Keep the three intended teacher RPCs available only to signed-in callers.
REVOKE ALL ON FUNCTION public.teacher_get_instant_messages(text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_get_instant_messages(text, uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.teacher_get_public_absences(integer, integer, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_get_public_absences(integer, integer, text, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.teacher_get_public_absence_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_get_public_absence_detail(uuid) TO authenticated, service_role;

-- Do not expose the masked/public variants until a caller contract exists.
REVOKE ALL ON FUNCTION public.teacher_get_public_absences_masked(integer, integer, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.teacher_get_public_courses(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.teacher_get_public_instant_messages(text, uuid) FROM PUBLIC, anon, authenticated;
-- ===== SOURCE END: supabase/migrations/20260815020108_fix_teacher_rpc_tenant_isolation.sql =====

-- ===== SOURCE START: supabase/migrations/20260815025824_paginate_student_annotation_summary.sql =====
-- FE-04: paginated, tenant-scoped student annotation summary.
-- Keeps the existing aggregation contract while avoiding a full-tenant payload.
create or replace function public.get_student_annotation_summary_page(
  p_limit integer default 100,
  p_offset integer default 0
)
returns table(
  id uuid,
  full_name text,
  course_id uuid,
  teacher_id uuid,
  status text,
  annotations_count bigint,
  positive_annotations_count bigint,
  informative_annotations_count bigint,
  last_annotation_date timestamptz,
  disciplinary_status text,
  rut text,
  course_name text,
  ai_analysis jsonb,
  total_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with tenant_scope as (
    select
      public.current_tenant_id() as tenant_id,
      extract(year from timezone('America/Santiago', now()))::integer as school_year
  ), summary as (
    select
      s.id,
      s.full_name,
      s.course_id,
      null::uuid as teacher_id,
      'Activo'::text as status,
      coalesce(annotation_totals.negativas, 0)::bigint as annotations_count,
      coalesce(annotation_totals.positivas, 0)::bigint as positive_annotations_count,
      coalesce(annotation_totals.informativas, 0)::bigint as informative_annotations_count,
      annotation_totals.last_date as last_annotation_date,
      case
        when coalesce(annotation_totals.negativas, 0) >= 15 then 'Rojo'
        when coalesce(annotation_totals.negativas, 0) >= 10 then 'Naranja'
        when coalesce(annotation_totals.negativas, 0) >= 5 then 'Amarillo'
        else 'Verde'
      end as disciplinary_status,
      s.rut,
      c.name as course_name,
      latest.analysis_json as ai_analysis
    from public.students s
    cross join tenant_scope scope
    left join public.courses c
      on c.id = s.course_id
     and c.tenant_id = scope.tenant_id
    left join lateral (
      select
        count(*) filter (where ir.type = 'Negativa')::bigint as negativas,
        count(*) filter (where ir.type = 'Positiva')::bigint as positivas,
        count(*) filter (where ir.type = 'Información')::bigint as informativas,
        max(ir.date_time) as last_date
      from public.inspectorate_records ir
      where ir.student_id = s.id
        and ir.tenant_id = scope.tenant_id
        and extract(year from timezone('America/Santiago', ir.date_time))::integer = scope.school_year
    ) annotation_totals on true
    left join lateral (
      select jsonb_build_object(
        'negativas', da.negativas,
        'positivas', da.positivas,
        'informativas', da.informativas,
        'analyzed_at', da.analyzed_at
      ) as analysis_json
      from public.document_analyses da
      where da.student_id = s.id
        and da.tenant_id = scope.tenant_id
      order by da.analyzed_at desc
      limit 1
    ) latest on true
    where s.tenant_id = scope.tenant_id
    order by s.full_name
  )
  select summary.*, count(*) over()::bigint as total_count
  from summary
  order by summary.full_name
  limit greatest(1, least(coalesce(p_limit, 100), 200))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.get_student_annotation_summary_page(integer, integer) from public;
grant execute on function public.get_student_annotation_summary_page(integer, integer) to authenticated;

comment on function public.get_student_annotation_summary_page(integer, integer)
is 'Tenant-scoped paginated student annotation totals for the current school year.';
-- ===== SOURCE END: supabase/migrations/20260815025824_paginate_student_annotation_summary.sql =====

-- ===== SOURCE START: supabase/migrations/20260815030000_atomic_confirm_disciplinary_process.sql =====
-- Atomic confirmation of a disciplinary PDF.
-- The backend calls this function with service_role after validating the PDF,
-- tenant, student and idempotency outside the database.

CREATE OR REPLACE FUNCTION public.confirm_disciplinary_process_atomic(
  p_tenant_id uuid,
  p_student_id uuid,
  p_suggested_letter_type text,
  p_file_name text,
  p_storage_path text,
  p_file_size integer,
  p_mime_type text,
  p_file_hash text,
  p_bucket text,
  p_original_file_name text,
  p_stored_file_name text,
  p_analysis_version text,
  p_annotations jsonb,
  p_total_negativas integer,
  p_total_positivas integer,
  p_total_informativas integer,
  p_confirmed_by uuid DEFAULT NULL
)
RETURNS TABLE(
  process_id uuid,
  process_number text,
  inserted_negativas integer,
  inserted_positivas integer,
  inserted_informativas integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_process_id uuid;
  v_process_number text;
  v_student_name text;
  v_course_id uuid;
  v_course_name text;
  v_letter_type text;
  v_stage_name text;
  v_step_number integer;
BEGIN
  IF p_tenant_id IS NULL OR p_student_id IS NULL THEN
    RAISE EXCEPTION 'Tenant y estudiante son obligatorios';
  END IF;

  SELECT s.full_name, s.course_id, c.name
    INTO v_student_name, v_course_id, v_course_name
    FROM public.students s
    LEFT JOIN public.courses c ON c.id = s.course_id AND c.tenant_id = p_tenant_id
   WHERE s.id = p_student_id
     AND s.tenant_id = p_tenant_id;

  IF v_student_name IS NULL THEN
    RAISE EXCEPTION 'El estudiante no pertenece al establecimiento activo';
  END IF;

  SELECT public.generate_process_number(p_tenant_id) INTO v_process_number;
  IF v_process_number IS NULL OR v_process_number = '' THEN
    RAISE EXCEPTION 'No fue posible generar el número de proceso';
  END IF;

  INSERT INTO public.disciplinary_processes (
    student_id, process_number, status, tenant_id, suggested_letter_type,
    total_negativas, total_positivas, total_informativas, is_completed, created_by
  ) VALUES (
    p_student_id, v_process_number, 'draft', p_tenant_id, coalesce(p_suggested_letter_type, 'none'),
    coalesce(p_total_negativas, 0), coalesce(p_total_positivas, 0),
    coalesce(p_total_informativas, 0), false, p_confirmed_by
  ) RETURNING id INTO v_process_id;

  INSERT INTO public.disciplinary_process_files (
    process_id, file_name, storage_path, file_size, mime_type, file_hash,
    tenant_id, bucket, original_file_name, stored_file_name, processing_status,
    analysis_version, student_id, uploaded_by
  ) VALUES (
    v_process_id, p_file_name, p_storage_path, coalesce(p_file_size, 0),
    coalesce(p_mime_type, 'application/pdf'), p_file_hash, p_tenant_id,
    coalesce(p_bucket, 'disciplinary-processes'), p_original_file_name,
    p_stored_file_name, 'confirmed', p_analysis_version, p_student_id, p_confirmed_by
  );

  INSERT INTO public.disciplinary_annotations_detected (
    process_id, student_id, annotation_type, annotation_text, page_number,
    position_in_page, annotation_date, teacher_name, line_number, tenant_id,
    raw_text, normalized_text, category, classification_method, confidence,
    parser_version, confirmed_annotation_type
  )
  SELECT
    v_process_id,
    p_student_id,
    CASE a.type WHEN 'negative' THEN 'Negativa' WHEN 'positive' THEN 'Positiva' ELSE 'Información' END,
    a.raw_text,
    a.page_number,
    coalesce(a.sequence_number, row_number() OVER ()),
    a.detected_date,
    a.detected_teacher,
    coalesce(a.sequence_number, row_number() OVER ()),
    p_tenant_id,
    a.raw_text,
    coalesce(a.normalized_text, lower(a.raw_text)),
    a.type,
    'regex',
    coalesce(a.confidence, 0.8),
    p_analysis_version,
    a.type
  FROM jsonb_to_recordset(coalesce(p_annotations, '[]'::jsonb)) AS a(
    raw_text text,
    normalized_text text,
    type text,
    page_number integer,
    sequence_number integer,
    detected_date date,
    detected_teacher text,
    confidence numeric
  );

  INSERT INTO public.inspectorate_records (
    student_id, tenant_id, date_time, observation, severity, type,
    registered_by, created_by, pdf_file_path
  )
  SELECT
    p_student_id,
    p_tenant_id,
    coalesce(a.detected_date::timestamptz, now()),
    a.raw_text,
    CASE a.type WHEN 'negative' THEN 'Leve' WHEN 'positive' THEN 'Leve' ELSE 'Leve' END,
    CASE a.type WHEN 'negative' THEN 'Negativa' WHEN 'positive' THEN 'Positiva' ELSE 'Información' END,
    'PDF Convivencia Escolar',
    'Sistema PDF',
    p_storage_path
  FROM jsonb_to_recordset(coalesce(p_annotations, '[]'::jsonb)) AS a(
    raw_text text,
    type text,
    detected_date date
  )
  WHERE NOT EXISTS (
    SELECT 1
      FROM public.inspectorate_records ir
     WHERE ir.tenant_id = p_tenant_id
       AND ir.student_id = p_student_id
       AND ir.observation = a.raw_text
       AND ir.type = CASE a.type WHEN 'negative' THEN 'Negativa' WHEN 'positive' THEN 'Positiva' ELSE 'Información' END
  );

  v_letter_type := CASE p_suggested_letter_type
    WHEN 'amonestacion' THEN 'Amonestación Escrita'
    WHEN 'compromiso' THEN 'Carta de Compromiso Conductual'
    WHEN 'compromiso_conductual' THEN 'Carta de Compromiso Conductual'
    WHEN 'derivacion' THEN 'Ficha de Derivación'
    ELSE NULL
  END;

  IF v_letter_type IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cartas_disciplinarias
     WHERE tenant_id = p_tenant_id AND student_id = p_student_id
       AND observations ILIKE '%' || v_process_id::text || '%'
  ) THEN
    INSERT INTO public.cartas_disciplinarias (
      student_id, tenant_id, letter_type, emission_date, status, emitted_by,
      apoderado_name, annotations_count, student_name, course, regulation_basis,
      observations, created_by
    ) VALUES (
      p_student_id, p_tenant_id, v_letter_type, current_date, 'Vigente',
      'Convivencia Escolar', 'Por definir', coalesce(p_total_negativas, 0),
      v_student_name, coalesce(v_course_name, 'Sin curso'),
      'RICE 2026 - Registro de anotaciones y debido proceso',
      format('Proceso PDF %s (%s). Documento sugerido automáticamente desde PDF confirmado.', v_process_number, v_process_id),
      'Sistema PDF'
    );
  END IF;

  v_stage_name := CASE p_suggested_letter_type
    WHEN 'amonestacion' THEN 'amonestacion'
    WHEN 'compromiso' THEN 'compromiso'
    WHEN 'compromiso_conductual' THEN 'compromiso'
    WHEN 'derivacion' THEN 'derivacion'
    ELSE NULL
  END;
  v_step_number := CASE v_stage_name WHEN 'amonestacion' THEN 1 WHEN 'compromiso' THEN 2 WHEN 'derivacion' THEN 3 ELSE NULL END;

  IF v_stage_name IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.etapas_disciplinarias
     WHERE tenant_id = p_tenant_id AND student_id = p_student_id
       AND stage_name = v_stage_name AND comment ILIKE '%' || v_process_id::text || '%'
  ) THEN
    INSERT INTO public.etapas_disciplinarias (
      student_id, tenant_id, step_number, stage_name, responsible, comment, created_by
    ) VALUES (
      p_student_id, p_tenant_id, v_step_number, v_stage_name,
      'Convivencia Escolar',
      format('Proceso PDF %s (%s). Etapa sugerida automáticamente desde PDF confirmado.', v_process_number, v_process_id),
      'Sistema PDF'
    );
  END IF;

  INSERT INTO public.document_analyses (
    student_id, file_name, negativas, positivas, informativas, tenant_id,
    status, process_id, file_hash, parser_version, confirmed_at, confirmed_by
  ) VALUES (
    p_student_id, p_file_name, coalesce(p_total_negativas, 0),
    coalesce(p_total_positivas, 0), coalesce(p_total_informativas, 0),
    p_tenant_id, 'confirmed', v_process_id, p_file_hash, p_analysis_version,
    now(), p_confirmed_by
  );

  RETURN QUERY SELECT
    v_process_id,
    v_process_number,
    coalesce(p_total_negativas, 0),
    coalesce(p_total_positivas, 0),
    coalesce(p_total_informativas, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_disciplinary_process_atomic(
  uuid, uuid, text, text, text, integer, text, text, text, text, text, text,
  jsonb, integer, integer, integer, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_disciplinary_process_atomic(
  uuid, uuid, text, text, text, integer, text, text, text, text, text, text,
  jsonb, integer, integer, integer, uuid
) TO service_role;
-- ===== SOURCE END: supabase/migrations/20260815030000_atomic_confirm_disciplinary_process.sql =====

-- ===== SOURCE START: supabase/migrations/20260815164916_persist_causa_deadlines.sql =====
-- Plazos operativos persistidos para la fuente de verdad del dashboard.
alter table public.causas
  add column if not exists plazo_24h boolean not null default false,
  add column if not exists fecha_limite_24h timestamptz,
  add column if not exists fecha_inicio_investigacion date,
  add column if not exists plazo_investigacion_dias integer,
  add column if not exists fecha_limite_investigacion date,
  add column if not exists fecha_limite_cierre date;

alter table public.causas
  drop constraint if exists causas_plazo_investigacion_dias_check;

alter table public.causas
  add constraint causas_plazo_investigacion_dias_check
  check (plazo_investigacion_dias is null or plazo_investigacion_dias between 1 and 60);

update public.causas
set fecha_inicio_investigacion = coalesce(fecha_inicio_investigacion, nullif(fecha_apertura, '')::date),
    plazo_investigacion_dias = coalesce(
      plazo_investigacion_dias,
      case when compromete_aula_segura then 10 else 60 end
    ),
    fecha_limite_investigacion = coalesce(
      fecha_limite_investigacion,
      nullif(fecha_apertura, '')::date
        + (coalesce(plazo_investigacion_dias, case when compromete_aula_segura then 10 else 60 end) - 1)
    )
where fecha_apertura is not null
  and nullif(fecha_apertura, '') is not null;

create index if not exists causas_tenant_deadline_idx
  on public.causas (tenant_id, fecha_limite_investigacion)
  where fecha_limite_investigacion is not null;

create or replace function public.get_dashboard_deadline_kpis()
returns table (
  overdue_count bigint,
  due_today_count bigint,
  due_soon_count bigint,
  critical_count bigint,
  as_of timestamptz
)
language sql
stable
set search_path = public
as $$
  with active_cases as (
    select fecha_limite_investigacion
    from public.causas
    where tenant_id = public.current_tenant_id()
      and estado_actual not in ('Causa Cerrada', 'Resolución Ejecutoriada')
      and fecha_limite_investigacion is not null
  )
  select
    count(*) filter (where fecha_limite_investigacion < (now() at time zone 'America/Santiago')::date),
    count(*) filter (where fecha_limite_investigacion = (now() at time zone 'America/Santiago')::date),
    count(*) filter (where fecha_limite_investigacion between (now() at time zone 'America/Santiago')::date
      and ((now() at time zone 'America/Santiago')::date + 3)),
    count(*) filter (where fecha_limite_investigacion <= ((now() at time zone 'America/Santiago')::date + 2)),
    now()
  from active_cases;
$$;

revoke all on function public.get_dashboard_deadline_kpis() from public, anon;
grant execute on function public.get_dashboard_deadline_kpis() to authenticated;
-- ===== SOURCE END: supabase/migrations/20260815164916_persist_causa_deadlines.sql =====

-- ===== SOURCE START: supabase/migrations/20260815170000_harden_convivencia_rls_roles.sql =====
/** @license SPDX-License-Identifier: Apache-2.0 */

-- ============================================================================
-- Fase 1D — Restricción de rol en RLS (solo tablas CONVIVENCIA)
--
-- Cierra el hallazgo A3: policies FOR ALL sin restricción de rol permitían a
-- cualquier rol autenticado del tenant borrar/modificar procesos, reglas,
-- análisis y registros de expediente.
--
-- NO se tocan objetos compartidos (students, courses) ni de inasistencias.
-- Patrón de rol: current_app_role() (SECURITY DEFINER sobre profiles), igual
-- que causas_tenant_delete/insert/update.
--
-- Desviación documentada (runbook Fase 1D, paso 4): bitacora/checklist/
-- cartas/etapas restringen DELETE a roles administrativos, pero conservan
-- INSERT/UPDATE tenant-only. El gate del frontend (currentRole !== 'docente')
-- permite hoy editar a todos los roles válidos; restringir INSERT/UPDATE
-- rompería el flujo de edición de bitácora para teacher/staff/inspector.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. disciplinary_processes — UPDATE/DELETE solo admin/direccion/superadmin
-- ---------------------------------------------------------------------------
drop policy if exists "tenant_processes" on public.disciplinary_processes;

create policy "tenant_processes_select"
  on public.disciplinary_processes
  for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "tenant_processes_insert"
  on public.disciplinary_processes
  for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id());

create policy "tenant_processes_update"
  on public.disciplinary_processes
  for update
  to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin'::text, 'direccion'::text, 'superadmin'::text])
  );

create policy "tenant_processes_delete"
  on public.disciplinary_processes
  for delete
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin'::text, 'direccion'::text, 'superadmin'::text])
  );

-- ---------------------------------------------------------------------------
-- 2. disciplinary_rules — escritura solo admin/direccion/superadmin
-- ---------------------------------------------------------------------------
drop policy if exists "tenant_rules" on public.disciplinary_rules;

create policy "tenant_rules_select"
  on public.disciplinary_rules
  for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "tenant_rules_insert"
  on public.disciplinary_rules
  for insert
  to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin'::text, 'direccion'::text, 'superadmin'::text])
  );

create policy "tenant_rules_update"
  on public.disciplinary_rules
  for update
  to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin'::text, 'direccion'::text, 'superadmin'::text])
  );

create policy "tenant_rules_delete"
  on public.disciplinary_rules
  for delete
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin'::text, 'direccion'::text, 'superadmin'::text])
  );

-- ---------------------------------------------------------------------------
-- 3. document_analyses — DELETE solo admin/direccion/superadmin
-- ---------------------------------------------------------------------------
drop policy if exists "tenant_analyses" on public.document_analyses;

create policy "tenant_analyses_select"
  on public.document_analyses
  for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "tenant_analyses_insert"
  on public.document_analyses
  for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id());

create policy "tenant_analyses_update"
  on public.document_analyses
  for update
  to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "tenant_analyses_delete"
  on public.document_analyses
  for delete
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin'::text, 'direccion'::text, 'superadmin'::text])
  );

-- ---------------------------------------------------------------------------
-- 4. bitacora_entries, checklist_items, cartas_disciplinarias,
--    etapas_disciplinarias — DELETE solo admin/direccion/superadmin
-- ---------------------------------------------------------------------------
drop policy if exists "bitacora_tenant_delete" on public.bitacora_entries;
create policy "bitacora_tenant_delete"
  on public.bitacora_entries
  for delete
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin'::text, 'direccion'::text, 'superadmin'::text])
  );

drop policy if exists "checklist_tenant_delete" on public.checklist_items;
create policy "checklist_tenant_delete"
  on public.checklist_items
  for delete
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin'::text, 'direccion'::text, 'superadmin'::text])
  );

drop policy if exists "cartas_tenant_delete" on public.cartas_disciplinarias;
create policy "cartas_tenant_delete"
  on public.cartas_disciplinarias
  for delete
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin'::text, 'direccion'::text, 'superadmin'::text])
  );

drop policy if exists "etapas_tenant_delete" on public.etapas_disciplinarias;
create policy "etapas_tenant_delete"
  on public.etapas_disciplinarias
  for delete
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin'::text, 'direccion'::text, 'superadmin'::text])
  );

-- ---------------------------------------------------------------------------
-- 5. carta_events — append-only (insert/select tenant-only ya existente).
--    Documentado, no se modifica.
-- ---------------------------------------------------------------------------
-- ===== SOURCE END: supabase/migrations/20260815170000_harden_convivencia_rls_roles.sql =====

-- ===== SOURCE START: supabase/migrations/20260815170003_add_archived_annotation_stage_count.sql =====
drop function if exists public.get_annotation_stage_counts();

create function public.get_annotation_stage_counts()
returns table(
  stage text,
  total_count bigint,
  pending_count bigint,
  processed_count bigint,
  archived_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
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
  carta_events_by_student as (
    select
      c.student_id,
      max(case
        when ce.event_type in ('registered', 'printed', 'processed_manually') then
          case
            when c.letter_type in ('Ficha de Derivación', 'Derivación a Convivencia Escolar') then 3
            when c.letter_type = 'Carta de Compromiso Conductual' then 2
            when c.letter_type = 'Amonestación Escrita' then 1
            else 0
          end
        else 0
      end)::integer as processed_rank,
      max(case
        when ce.event_type = 'archived' then
          case
            when c.letter_type in ('Ficha de Derivación', 'Derivación a Convivencia Escolar') then 3
            when c.letter_type = 'Carta de Compromiso Conductual' then 2
            when c.letter_type = 'Amonestación Escrita' then 1
            else 0
          end
        else 0
      end)::integer as archived_rank
    from public.cartas_disciplinarias c
    join public.carta_events ce
      on ce.carta_id = c.id
     and ce.student_id = c.student_id
     and ce.tenant_id = c.tenant_id
    cross join tenant_scope scope
    where c.tenant_id = scope.tenant_id
      and c.status <> 'Anulada'
      and coalesce(c.school_year, extract(year from c.emission_date)::integer) = scope.school_year
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
        coalesce(events.processed_rank, 0),
        coalesce(events.archived_rank, 0)
      ) as effective_rank,
      coalesce(events.processed_rank, 0) as processed_rank,
      coalesce(events.archived_rank, 0) as archived_rank
    from negative_counts nc
    left join carta_events_by_student events on events.student_id = nc.student_id
    where nc.negatives > 0
      or coalesce(events.processed_rank, 0) > 0
      or coalesce(events.archived_rank, 0) > 0
  ),
  aggregated as (
    select
      effective_rank,
      count(*)::bigint as total_count,
      count(*) filter (
        where archived_rank = effective_rank and archived_rank > 0
      )::bigint as archived_count,
      count(*) filter (
        where archived_rank <> effective_rank
          and processed_rank = effective_rank
          and processed_rank > 0
      )::bigint as processed_count,
      count(*) filter (
        where archived_rank <> effective_rank
          and processed_rank <> effective_rank
      )::bigint as pending_count
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
    coalesce(aggregated.processed_count, 0)::bigint,
    coalesce(aggregated.archived_count, 0)::bigint
  from stage_catalog catalog
  left join aggregated on aggregated.effective_rank = catalog.stage_rank
  order by catalog.stage_rank;
$$;

revoke all on function public.get_annotation_stage_counts() from public, anon;
grant execute on function public.get_annotation_stage_counts() to authenticated;
-- ===== SOURCE END: supabase/migrations/20260815170003_add_archived_annotation_stage_count.sql =====

-- ===== SOURCE START: supabase/migrations/20260815172457_student_activity_history_index.sql =====
create or replace function public.get_student_activity_history(
  p_limit integer default 200,
  p_offset integer default 0
)
returns table (
  student_id uuid,
  full_name text,
  course_id uuid,
  course_name text,
  course_level text,
  rut text,
  cause_count bigint,
  active_cause_count bigint,
  annotation_count bigint,
  negative_annotation_count bigint,
  last_activity_at timestamptz,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with activity as (
    select
      s.id as student_id,
      s.full_name,
      s.course_id,
      coalesce(courses.name, 'Sin curso') as course_name,
      courses.level as course_level,
      coalesce(s.rut, '') as rut,
      count(distinct c.id)::bigint as cause_count,
      count(distinct c.id) filter (
        where c.estado_actual not in ('Causa Cerrada', 'Resolución Ejecutoriada')
      )::bigint as active_cause_count,
      count(distinct ir.id)::bigint as annotation_count,
      count(distinct ir.id) filter (where ir.type = 'Negativa')::bigint as negative_annotation_count,
      greatest(
        max(c.updated_at),
        max(c.created_at),
        max(ir.date_time)
      ) as last_activity_at
    from public.students s
    left join public.courses courses on courses.id = s.course_id
      and courses.tenant_id = public.current_tenant_id()
    left join public.causas c on c.student_id = s.id
      and c.tenant_id = public.current_tenant_id()
    left join public.inspectorate_records ir on ir.student_id = s.id
      and ir.tenant_id = public.current_tenant_id()
    where s.tenant_id = public.current_tenant_id()
      and (
        exists (
          select 1 from public.causas cause_exists
          where cause_exists.student_id = s.id
            and cause_exists.tenant_id = public.current_tenant_id()
        )
        or exists (
          select 1 from public.inspectorate_records annotation_exists
          where annotation_exists.student_id = s.id
            and annotation_exists.tenant_id = public.current_tenant_id()
        )
      )
    group by s.id, s.full_name, s.course_id, courses.name, courses.level, s.rut
  )
  select
    activity.*,
    count(*) over ()::bigint as total_count
  from activity
  order by activity.last_activity_at desc nulls last, activity.full_name asc
  limit least(greatest(coalesce(p_limit, 200), 1), 500)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.get_student_activity_history(integer, integer) from public, anon;
grant execute on function public.get_student_activity_history(integer, integer) to authenticated;
-- ===== SOURCE END: supabase/migrations/20260815172457_student_activity_history_index.sql =====

-- ===== SOURCE START: supabase/migrations/20260815173000_fix_generate_process_number_tenant.sql =====
/** @license SPDX-License-Identifier: Apache-2.0 */

-- ============================================================================
-- Fase 1E — generate_process_number valida current_tenant_id()
--
-- Hallazgo D1: la función era EXECUTE para authenticated y SECURITY DEFINER,
-- aceptando p_tenant_id arbitrario. Un usuario autenticado podía invocarla con
-- el tenant de otro establecimiento y enumerar/correr conteos ajenos.
--
-- Fix:
--   - Si hay usuario autenticado (auth.uid() no nulo): el tenant efectivo es
--     current_tenant_id() y p_tenant_id debe coincidir; si no, se rechaza.
--   - Si no hay usuario (llamada service_role desde
--     confirm_disciplinary_process_atomic, que ya validó el tenant): se usa
--     p_tenant_id tal como hoy.
--
-- Concurrencia: COUNT(*) + 1 puede colisionar bajo escrituras simultáneas
-- (ponytail: secuencia dedicada por tenant cuando haya volumen real).
-- ============================================================================

create or replace function public.generate_process_number(p_tenant_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant_id uuid;
  v_year text;
  v_count integer;
  v_number text;
begin
  if auth.uid() is not null then
    v_tenant_id := public.current_tenant_id();
    if v_tenant_id is null or v_tenant_id <> p_tenant_id then
      raise exception 'tenant mismatch' using errcode = '42501';
    end if;
  else
    v_tenant_id := p_tenant_id;
  end if;

  if v_tenant_id is null then
    raise exception 'tenant required' using errcode = '22023';
  end if;

  v_year := extract(year from now())::text;

  select count(*) + 1
    into v_count
  from public.disciplinary_processes
  where tenant_id = v_tenant_id
    and extract(year from created_at) = extract(year from now());

  v_number := lpad(v_count::text, 4, '0');

  return 'DP-' || v_year || '-' || v_number;
end;
$$;

revoke all on function public.generate_process_number(uuid) from public;
grant execute on function public.generate_process_number(uuid) to authenticated;
grant execute on function public.generate_process_number(uuid) to service_role;
-- ===== SOURCE END: supabase/migrations/20260815173000_fix_generate_process_number_tenant.sql =====

-- ===== SOURCE START: supabase/migrations/20260815174119_link_legacy_causas_to_students.sql =====
/** @license SPDX-License-Identifier: Apache-2.0 */

-- Vincula causas antiguas que fueron creadas antes de persistir student_id.
-- Solo actualiza coincidencias únicas dentro del mismo tenant, nombre y curso.
with candidates as (
  select
    causa.id as causa_id,
    (array_agg(student.id))[1] as student_id
  from public.causas as causa
  join public.students as student
    on student.tenant_id = causa.tenant_id
   and lower(trim(student.full_name)) = lower(trim(causa.estudiante_nombre))
  join public.courses as course
    on course.id = student.course_id
   and lower(trim(course.name)) = lower(trim(causa.estudiante_curso))
  where causa.student_id is null
  group by causa.id
  having count(*) = 1
)
update public.causas as causa
set student_id = candidates.student_id
from candidates
where causa.id = candidates.causa_id
  and causa.student_id is null;
-- ===== SOURCE END: supabase/migrations/20260815174119_link_legacy_causas_to_students.sql =====

-- ===== SOURCE START: supabase/migrations/20260815210633_restrict_courses_select_to_tenant.sql =====
/** @license SPDX-License-Identifier: Apache-2.0 */

-- Evita que la policy staff permita leer cursos de otros tenants.
drop policy if exists "p_courses_staff_select" on public.courses;

create policy "p_courses_staff_select"
on public.courses
for select
to authenticated
using (
  is_staff()
  and tenant_id = current_tenant_id()
);
-- ===== SOURCE END: supabase/migrations/20260815210633_restrict_courses_select_to_tenant.sql =====

-- ===== SOURCE START: supabase/migrations/20260815220726_revoke_anon_student_annotation_summary_page.sql =====
/**
 * Restrict the student annotation summary to authenticated users.
 * The RPC returns student names, RUTs, courses and AI analysis metadata.
 */
revoke execute on function public.get_student_annotation_summary_page(integer, integer) from anon;
grant execute on function public.get_student_annotation_summary_page(integer, integer) to authenticated;
-- ===== SOURCE END: supabase/migrations/20260815220726_revoke_anon_student_annotation_summary_page.sql =====

-- ===== SOURCE START: supabase/migrations/20260819123006_deduplicate_teacher_annotation_ranking.sql =====
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

-- The dashboard must count unique annotation facts, not repeated copies of
-- cumulative PDFs. This migration changes reporting only; source rows remain.
create or replace function public.get_teacher_annotation_ranking()
returns table (
  teacher_name text,
  negative_count bigint,
  positive_count bigint,
  informative_count bigint,
  total_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with scoped as (
    select
      d.id,
      d.teacher_name,
      d.detected_at,
      coalesce(nullif(btrim(d.confirmed_annotation_type), ''), d.annotation_type) as effective_type,
      lower(regexp_replace(btrim(coalesce(d.teacher_name, '')), '\s+', ' ', 'g')) as teacher_key,
      case
        when btrim(coalesce(d.normalized_text, d.annotation_text, d.raw_text, '')) = ''
          then d.id::text
        else lower(regexp_replace(
          btrim(coalesce(d.normalized_text, d.annotation_text, d.raw_text)),
          '\s+', ' ', 'g'
        ))
      end as annotation_key,
      d.student_id,
      d.annotation_date
    from public.disciplinary_annotations_detected d
    where d.tenant_id = public.current_tenant_id()
      and d.teacher_name is not null
      and btrim(d.teacher_name) <> ''
      and d.annotation_date is not null
      and extract(year from d.annotation_date)::integer =
        extract(year from timezone('America/Santiago', now()))::integer
  ), unique_annotations as (
    select distinct on (student_id, annotation_date, effective_type, teacher_key, annotation_key)
      teacher_name,
      teacher_key,
      effective_type
    from scoped
    order by student_id, annotation_date, effective_type, teacher_key, annotation_key,
      detected_at asc, id asc
  )
  select
    min(teacher_name)::text as teacher_name,
    count(*) filter (where effective_type = 'Negativa')::bigint as negative_count,
    count(*) filter (where effective_type = 'Positiva')::bigint as positive_count,
    count(*) filter (where effective_type = 'Información')::bigint as informative_count,
    count(*)::bigint as total_count
  from unique_annotations
  group by teacher_key
  having count(*) filter (where effective_type = 'Negativa') > 0
  order by negative_count desc, min(teacher_name) asc
  limit 5;
$$;

alter function public.get_teacher_annotation_ranking() owner to postgres;

comment on function public.get_teacher_annotation_ranking() is
  'Tenant-scoped top-five ranking of unique current-school-year annotations by teacher, using annotation_date and confirmed type when available.';

revoke all on function public.get_teacher_annotation_ranking() from public;
grant execute on function public.get_teacher_annotation_ranking() to authenticated;
grant execute on function public.get_teacher_annotation_ranking() to service_role;
-- ===== SOURCE END: supabase/migrations/20260819123006_deduplicate_teacher_annotation_ranking.sql =====

-- ===== SOURCE START: supabase/migrations/20260819123222_normalize_teacher_annotation_types.sql =====
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

-- Normalize the internal confirmed values before counting. Existing imports
-- use Spanish labels in annotation_type and English enum values in confirmed_annotation_type.
create or replace function public.get_teacher_annotation_ranking()
returns table (
  teacher_name text,
  negative_count bigint,
  positive_count bigint,
  informative_count bigint,
  total_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with scoped as (
    select
      d.id,
      d.teacher_name,
      d.detected_at,
      case lower(btrim(coalesce(nullif(d.confirmed_annotation_type, ''), d.annotation_type)))
        when 'negative' then 'Negativa'
        when 'negativa' then 'Negativa'
        when 'positive' then 'Positiva'
        when 'positiva' then 'Positiva'
        when 'information' then 'Información'
        when 'información' then 'Información'
        else coalesce(nullif(btrim(d.confirmed_annotation_type), ''), d.annotation_type)
      end as effective_type,
      lower(regexp_replace(btrim(coalesce(d.teacher_name, '')), '\s+', ' ', 'g')) as teacher_key,
      case
        when btrim(coalesce(d.normalized_text, d.annotation_text, d.raw_text, '')) = ''
          then d.id::text
        else lower(regexp_replace(
          btrim(coalesce(d.normalized_text, d.annotation_text, d.raw_text)),
          '\s+', ' ', 'g'
        ))
      end as annotation_key,
      d.student_id,
      d.annotation_date
    from public.disciplinary_annotations_detected d
    where d.tenant_id = public.current_tenant_id()
      and d.teacher_name is not null
      and btrim(d.teacher_name) <> ''
      and d.annotation_date is not null
      and extract(year from d.annotation_date)::integer =
        extract(year from timezone('America/Santiago', now()))::integer
  ), unique_annotations as (
    select distinct on (student_id, annotation_date, effective_type, teacher_key, annotation_key)
      teacher_name,
      teacher_key,
      effective_type
    from scoped
    order by student_id, annotation_date, effective_type, teacher_key, annotation_key,
      detected_at asc, id asc
  )
  select
    min(teacher_name)::text as teacher_name,
    count(*) filter (where effective_type = 'Negativa')::bigint as negative_count,
    count(*) filter (where effective_type = 'Positiva')::bigint as positive_count,
    count(*) filter (where effective_type = 'Información')::bigint as informative_count,
    count(*)::bigint as total_count
  from unique_annotations
  group by teacher_key
  having count(*) filter (where effective_type = 'Negativa') > 0
  order by negative_count desc, min(teacher_name) asc
  limit 5;
$$;

alter function public.get_teacher_annotation_ranking() owner to postgres;

comment on function public.get_teacher_annotation_ranking() is
  'Tenant-scoped top-five ranking of unique current-school-year annotations by teacher, using annotation_date and normalized confirmed type.';

revoke all on function public.get_teacher_annotation_ranking() from public;
grant execute on function public.get_teacher_annotation_ranking() to authenticated;
grant execute on function public.get_teacher_annotation_ranking() to service_role;
-- ===== SOURCE END: supabase/migrations/20260819123222_normalize_teacher_annotation_types.sql =====

-- ===== SOURCE START: supabase/migrations/20260819215613_add_convivencia_interview_event.sql =====
alter table public.carta_events
  drop constraint if exists carta_events_event_type_check;

alter table public.carta_events
  add constraint carta_events_event_type_check
  check (
    event_type = any (
      array[
        'suggested'::text,
        'created'::text,
        'registered'::text,
        'printed'::text,
        'downloaded_pdf'::text,
        'downloaded_word'::text,
        'processed_manually'::text,
        'archived'::text,
        'convivencia_interviewed'::text,
        'annulled'::text
      ]
    )
  );

create unique index if not exists idx_carta_events_convivencia_interview_unique
  on public.carta_events (carta_id)
  where event_type = 'convivencia_interviewed';
-- ===== SOURCE END: supabase/migrations/20260819215613_add_convivencia_interview_event.sql =====

-- ===== SOURCE START: supabase/migrations/20260821164040_allow_markdown_convivencia_storage.sql =====
-- Permite respaldos Markdown en los documentos privados de convivencia.
-- Conserva el límite de 10 MB y las políticas existentes del bucket.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'text/markdown'
]::text[]
WHERE id = 'documentos_convivencia';
-- ===== SOURCE END: supabase/migrations/20260821164040_allow_markdown_convivencia_storage.sql =====

-- ===== SOURCE START: supabase/migrations/20260823005549_restrict_public_dashboard_kpis_to_authenticated.sql =====
-- Restrict the dashboard KPI RPC to signed-in users.
-- Keeps service_role/postgres access while removing anonymous execution.
REVOKE EXECUTE ON FUNCTION public.get_public_dashboard_kpis() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_public_dashboard_kpis() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_public_dashboard_kpis() TO authenticated;
-- ===== SOURCE END: supabase/migrations/20260823005549_restrict_public_dashboard_kpis_to_authenticated.sql =====

-- ===== SOURCE START: supabase/migrations/20260823005734_consolidate_shared_courses_students_rls.sql =====
-- Remove redundant staff policies on shared course/student tables.
-- The tenant policies already grant the required same-tenant access.
-- Removing these prevents staff roles from bypassing tenant isolation.
DROP POLICY IF EXISTS p_courses_staff_select ON public.courses;
DROP POLICY IF EXISTS p_courses_staff_insert ON public.courses;
DROP POLICY IF EXISTS p_courses_staff_update ON public.courses;

DROP POLICY IF EXISTS p_students_staff_select ON public.students;
DROP POLICY IF EXISTS p_students_staff_insert ON public.students;
DROP POLICY IF EXISTS p_students_staff_update ON public.students;
-- ===== SOURCE END: supabase/migrations/20260823005734_consolidate_shared_courses_students_rls.sql =====

-- ===== SOURCE START: supabase/migrations/20260823005758_merge_courses_students_delete_policies.sql =====
-- Merge duplicate DELETE policies while preserving effective permissions.
DROP POLICY IF EXISTS courses_tenant_delete ON public.courses;
DROP POLICY IF EXISTS p_courses_superuser_delete ON public.courses;
CREATE POLICY courses_delete_authorized
ON public.courses
FOR DELETE
TO authenticated
USING (
  is_superuser()
  OR (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])
  )
);

DROP POLICY IF EXISTS students_tenant_delete ON public.students;
DROP POLICY IF EXISTS p_students_superuser_delete ON public.students;
CREATE POLICY students_delete_authorized
ON public.students
FOR DELETE
TO authenticated
USING (
  is_superuser()
  OR (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])
  )
);
-- ===== SOURCE END: supabase/migrations/20260823005758_merge_courses_students_delete_policies.sql =====

-- ===== SOURCE START: supabase/migrations/20260823005928_consolidate_inspectorate_records_rls.sql =====
DROP POLICY IF EXISTS p_inspectorate_staff_select ON public.inspectorate_records;
DROP POLICY IF EXISTS p_inspectorate_staff_insert ON public.inspectorate_records;
DROP POLICY IF EXISTS p_inspectorate_staff_update ON public.inspectorate_records;

DROP POLICY IF EXISTS inspectorate_tenant_delete ON public.inspectorate_records;
DROP POLICY IF EXISTS p_inspectorate_superuser_delete ON public.inspectorate_records;

CREATE POLICY inspectorate_tenant_delete
ON public.inspectorate_records
FOR DELETE
TO authenticated
USING (
  public.is_superuser()
  OR tenant_id = public.current_tenant_id()
);
-- ===== SOURCE END: supabase/migrations/20260823005928_consolidate_inspectorate_records_rls.sql =====

-- ===== SOURCE START: supabase/migrations/20260823010045_consolidate_profiles_rls.sql =====
DROP POLICY IF EXISTS p_profiles_self_select ON public.profiles;
DROP POLICY IF EXISTS p_profiles_superuser_select ON public.profiles;
DROP POLICY IF EXISTS p_profiles_superuser_insert ON public.profiles;
DROP POLICY IF EXISTS p_profiles_superuser_update ON public.profiles;
DROP POLICY IF EXISTS p_profiles_superuser_delete ON public.profiles;
DROP POLICY IF EXISTS profiles_tenant_select ON public.profiles;
DROP POLICY IF EXISTS profiles_tenant_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_tenant_update ON public.profiles;
DROP POLICY IF EXISTS profiles_tenant_delete ON public.profiles;

CREATE POLICY profiles_select_consolidated
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR is_superuser()
  OR current_app_role() = 'superadmin'
  OR (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])
  )
);

CREATE POLICY profiles_insert_consolidated
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  is_superuser()
  OR user_id = auth.uid()
  OR (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])
  )
);

CREATE POLICY profiles_update_consolidated
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  is_superuser()
  OR user_id = auth.uid()
  OR (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])
  )
)
WITH CHECK (
  is_superuser()
  OR user_id = auth.uid()
  OR (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])
  )
);

CREATE POLICY profiles_delete_consolidated
ON public.profiles
FOR DELETE
TO authenticated
USING (
  is_superuser()
  OR (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])
  )
);
-- ===== SOURCE END: supabase/migrations/20260823010045_consolidate_profiles_rls.sql =====

-- ===== SOURCE START: supabase/migrations/20260823010210_split_institution_write_policies.sql =====
drop policy if exists institution_documents_write on public.institution_documents;
create policy institution_documents_insert on public.institution_documents for insert to authenticated with check ((current_app_role() = 'superadmin'::text) OR ((tenant_id = current_tenant_id()) AND (current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text]))));
create policy institution_documents_update on public.institution_documents for update to authenticated using ((current_app_role() = 'superadmin'::text) OR ((tenant_id = current_tenant_id()) AND (current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])))) with check ((current_app_role() = 'superadmin'::text) OR ((tenant_id = current_tenant_id()) AND (current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text]))));
create policy institution_documents_delete on public.institution_documents for delete to authenticated using ((current_app_role() = 'superadmin'::text) OR ((tenant_id = current_tenant_id()) AND (current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text]))));

drop policy if exists institution_rules_write on public.institution_rule_versions;
create policy institution_rules_insert on public.institution_rule_versions for insert to authenticated with check ((current_app_role() = 'superadmin'::text) OR ((tenant_id = current_tenant_id()) AND (current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text]))));
create policy institution_rules_update on public.institution_rule_versions for update to authenticated using ((current_app_role() = 'superadmin'::text) OR ((tenant_id = current_tenant_id()) AND (current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])))) with check ((current_app_role() = 'superadmin'::text) OR ((tenant_id = current_tenant_id()) AND (current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text]))));
create policy institution_rules_delete on public.institution_rule_versions for delete to authenticated using ((current_app_role() = 'superadmin'::text) OR ((tenant_id = current_tenant_id()) AND (current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text]))));

drop policy if exists institution_settings_write on public.institution_settings;
create policy institution_settings_insert on public.institution_settings for insert to authenticated with check ((current_app_role() = 'superadmin'::text) OR ((tenant_id = current_tenant_id()) AND (current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text]))));
create policy institution_settings_update on public.institution_settings for update to authenticated using ((current_app_role() = 'superadmin'::text) OR ((tenant_id = current_tenant_id()) AND (current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])))) with check ((current_app_role() = 'superadmin'::text) OR ((tenant_id = current_tenant_id()) AND (current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text]))));
create policy institution_settings_delete on public.institution_settings for delete to authenticated using ((current_app_role() = 'superadmin'::text) OR ((tenant_id = current_tenant_id()) AND (current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text]))));
-- ===== SOURCE END: supabase/migrations/20260823010210_split_institution_write_policies.sql =====

-- ===== SOURCE START: supabase/migrations/20260823010224_optimize_profiles_rls_auth_initplan.sql =====
ALTER POLICY profiles_select_consolidated ON public.profiles
USING (
  user_id = (SELECT auth.uid())
  OR is_superuser()
  OR current_app_role() = 'superadmin'
  OR (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])
  )
);

ALTER POLICY profiles_insert_consolidated ON public.profiles
WITH CHECK (
  is_superuser()
  OR user_id = (SELECT auth.uid())
  OR (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])
  )
);

ALTER POLICY profiles_update_consolidated ON public.profiles
USING (
  is_superuser()
  OR user_id = (SELECT auth.uid())
  OR (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])
  )
)
WITH CHECK (
  is_superuser()
  OR user_id = (SELECT auth.uid())
  OR (
    tenant_id = current_tenant_id()
    AND current_app_role() = ANY (ARRAY['admin'::text, 'direccion'::text])
  )
);
-- ===== SOURCE END: supabase/migrations/20260823010224_optimize_profiles_rls_auth_initplan.sql =====

-- ===== SOURCE START: supabase/migrations/20260823010608_restrict_unused_security_definer_rpcs.sql =====
REVOKE EXECUTE ON FUNCTION public.generate_process_number(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_dashboard_kpis() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_app_access(text, text[]) FROM authenticated;
-- ===== SOURCE END: supabase/migrations/20260823010608_restrict_unused_security_definer_rpcs.sql =====

-- ===== SOURCE START: supabase/migrations/20260824193445_allow_avances_convivencia_storage.sql =====
/** @license SPDX-License-Identifier: Apache-2.0 */

-- Checklist progress documents use <causa_id>/avances/<file>.
-- Keep the bucket private and preserve the existing tenant/membership checks.

drop policy if exists "documentos_convivencia_insert_member" on storage.objects;
drop policy if exists "documentos_convivencia_select_member" on storage.objects;
drop policy if exists "documentos_convivencia_delete_member" on storage.objects;

create policy "documentos_convivencia_insert_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documentos_convivencia'
  and (storage.foldername(name))[2] in ('documentos', 'avances')
  and exists (
    select 1
    from public.causas c
    join public.app_memberships m on m.tenant_id = c.tenant_id
    where c.id = (storage.foldername(name))[1]
      and m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role in (
        'superadmin',
        'admin',
        'direccion',
        'convivencia',
        'inspectoria',
        'profesor_jefe',
        'teacher',
        'inspector',
        'user',
        'staff'
      )
      and m.is_active
  )
);

create policy "documentos_convivencia_select_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documentos_convivencia'
  and (storage.foldername(name))[2] in ('documentos', 'avances')
  and exists (
    select 1
    from public.causas c
    join public.app_memberships m on m.tenant_id = c.tenant_id
    where c.id = (storage.foldername(name))[1]
      and m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role in (
        'superadmin',
        'admin',
        'direccion',
        'convivencia',
        'inspectoria',
        'profesor_jefe',
        'teacher',
        'inspector',
        'user',
        'staff'
      )
      and m.is_active
  )
);

create policy "documentos_convivencia_delete_member"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'documentos_convivencia'
  and (storage.foldername(name))[2] in ('documentos', 'avances')
  and exists (
    select 1
    from public.causas c
    join public.app_memberships m on m.tenant_id = c.tenant_id
    where c.id = (storage.foldername(name))[1]
      and m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role in (
        'superadmin',
        'admin',
        'direccion',
        'convivencia',
        'inspectoria',
        'profesor_jefe',
        'teacher',
        'inspector',
        'user',
        'staff'
      )
      and m.is_active
  )
);
-- ===== SOURCE END: supabase/migrations/20260824193445_allow_avances_convivencia_storage.sql =====

-- ===== SOURCE START: supabase/migrations/20260827142437_add_incidentes_and_shared_documents.sql =====
-- Incidentes grupales: un hecho común puede tener varias causas individuales.
-- Los expedientes históricos quedan sin incidente_id y siguen funcionando.

create table if not exists public.incidentes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id()
    references public.tenants(id),
  fecha_hora timestamptz not null default now(),
  lugar text not null default '',
  tipo text not null default 'Consumo de alcohol',
  descripcion text not null default '',
  responsable text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.incidentes enable row level security;

grant select, insert, update, delete on public.incidentes to authenticated;

drop policy if exists incidentes_tenant_select on public.incidentes;
create policy incidentes_tenant_select on public.incidentes
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists incidentes_tenant_insert on public.incidentes;
create policy incidentes_tenant_insert on public.incidentes
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array[
      'admin', 'direccion', 'convivencia', 'inspectoria',
      'profesor_jefe', 'teacher', 'staff'
    ])
  );

drop policy if exists incidentes_tenant_update on public.incidentes;
create policy incidentes_tenant_update on public.incidentes
  for update to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array[
      'admin', 'direccion', 'convivencia', 'inspectoria',
      'profesor_jefe', 'teacher', 'staff'
    ])
  );

drop policy if exists incidentes_tenant_delete on public.incidentes;
create policy incidentes_tenant_delete on public.incidentes
  for delete to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin', 'direccion'])
  );

alter table public.causas
  add column if not exists incidente_id uuid references public.incidentes(id) on delete set null;

create index if not exists idx_causas_tenant_incidente
  on public.causas (tenant_id, incidente_id);

create or replace function public.ensure_causa_incidente_same_tenant()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.incidente_id is not null and not exists (
    select 1
    from public.incidentes i
    where i.id = new.incidente_id
      and i.tenant_id = new.tenant_id
  ) then
    raise exception 'The incident does not belong to the causa tenant';
  end if;
  return new;
end;
$$;

drop trigger if exists causas_incidente_same_tenant on public.causas;
create trigger causas_incidente_same_tenant
  before insert or update of incidente_id, tenant_id on public.causas
  for each row execute function public.ensure_causa_incidente_same_tenant();

revoke execute on function public.ensure_causa_incidente_same_tenant() from public;

-- Storage keeps the existing private bucket and role model. A document can be
-- rooted at a causa or at an incident that already has at least one causa in
-- the current tenant.
drop policy if exists "documentos_convivencia_insert_member" on storage.objects;
drop policy if exists "documentos_convivencia_select_member" on storage.objects;
drop policy if exists "documentos_convivencia_delete_member" on storage.objects;

create policy "documentos_convivencia_insert_member"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'documentos_convivencia'
  and (storage.foldername(name))[2] in ('documentos', 'avances')
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role in ('superadmin', 'admin', 'direccion', 'convivencia', 'inspectoria',
        'profesor_jefe', 'teacher', 'inspector', 'user', 'staff')
      and m.is_active
      and m.tenant_id = public.current_tenant_id()
      and (
        exists (
          select 1 from public.causas c
          where c.id = (storage.foldername(name))[1]
            and c.tenant_id = m.tenant_id
        )
        or exists (
          select 1 from public.incidentes i
          join public.causas c on c.incidente_id = i.id
          where i.id::text = (storage.foldername(name))[1]
            and i.tenant_id = m.tenant_id
            and c.tenant_id = m.tenant_id
        )
      )
  )
);

create policy "documentos_convivencia_select_member"
on storage.objects
for select to authenticated
using (
  bucket_id = 'documentos_convivencia'
  and (storage.foldername(name))[2] in ('documentos', 'avances')
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role in ('superadmin', 'admin', 'direccion', 'convivencia', 'inspectoria',
        'profesor_jefe', 'teacher', 'inspector', 'user', 'staff')
      and m.is_active
      and m.tenant_id = public.current_tenant_id()
      and (
        exists (
          select 1 from public.causas c
          where c.id = (storage.foldername(name))[1]
            and c.tenant_id = m.tenant_id
        )
        or exists (
          select 1 from public.incidentes i
          join public.causas c on c.incidente_id = i.id
          where i.id::text = (storage.foldername(name))[1]
            and i.tenant_id = m.tenant_id
            and c.tenant_id = m.tenant_id
        )
      )
  )
);

create policy "documentos_convivencia_delete_member"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'documentos_convivencia'
  and (storage.foldername(name))[2] in ('documentos', 'avances')
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.application_code = 'convivencia'
      and m.role in ('superadmin', 'admin', 'direccion', 'convivencia', 'inspectoria',
        'profesor_jefe', 'teacher', 'inspector', 'user', 'staff')
      and m.is_active
      and m.tenant_id = public.current_tenant_id()
      and (
        exists (
          select 1 from public.causas c
          where c.id = (storage.foldername(name))[1]
            and c.tenant_id = m.tenant_id
        )
        or exists (
          select 1 from public.incidentes i
          join public.causas c on c.incidente_id = i.id
          where i.id::text = (storage.foldername(name))[1]
            and i.tenant_id = m.tenant_id
            and c.tenant_id = m.tenant_id
        )
      )
  )
);
-- ===== SOURCE END: supabase/migrations/20260827142437_add_incidentes_and_shared_documents.sql =====

-- ===== SOURCE START: supabase/migrations/20260827184509_share_incident_progress_and_milestones.sql =====
-- La visibilidad grupal es opt-in. Los registros históricos permanecen privados.
alter table public.bitacora_entries
  add column if not exists compartido_grupal boolean not null default false;

alter table public.checklist_progress_entries
  add column if not exists incidente_id uuid references public.incidentes(id) on delete set null;

create index if not exists idx_checklist_progress_incidente_date
  on public.checklist_progress_entries (tenant_id, incidente_id, occurred_at desc)
  where incidente_id is not null;

create or replace function public.ensure_checklist_progress_incidente_same_tenant()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.incidente_id is not null and not exists (
    select 1
    from public.causas c
    where c.id = new.causa_id
      and c.incidente_id = new.incidente_id
      and c.tenant_id = new.tenant_id
  ) then
    raise exception 'The progress incident does not belong to the causa';
  end if;
  return new;
end;
$$;

drop trigger if exists checklist_progress_incidente_same_tenant
  on public.checklist_progress_entries;
create trigger checklist_progress_incidente_same_tenant
  before insert or update of causa_id, incidente_id, tenant_id
  on public.checklist_progress_entries
  for each row execute function public.ensure_checklist_progress_incidente_same_tenant();

create or replace function public.ensure_bitacora_group_sharing_allowed()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.compartido_grupal and not exists (
    select 1
    from public.causas c
    where c.id = new.causa_id
      and c.incidente_id is not null
      and c.tenant_id = new.tenant_id
  ) then
    raise exception 'The bitacora entry has no group incident';
  end if;
  return new;
end;
$$;

drop trigger if exists bitacora_group_sharing_allowed on public.bitacora_entries;
create trigger bitacora_group_sharing_allowed
  before insert or update of causa_id, compartido_grupal, tenant_id
  on public.bitacora_entries
  for each row execute function public.ensure_bitacora_group_sharing_allowed();

revoke all on function public.ensure_checklist_progress_incidente_same_tenant() from public, anon;
grant execute on function public.ensure_checklist_progress_incidente_same_tenant() to authenticated, service_role;
revoke all on function public.ensure_bitacora_group_sharing_allowed() from public, anon;
grant execute on function public.ensure_bitacora_group_sharing_allowed() to authenticated, service_role;

create or replace function public.save_bitacora_snapshot(
  p_causa_id text,
  p_entries jsonb,
  p_removed_entry_ids jsonb default '[]'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_expected_count integer;
  v_written_count integer;
begin
  if auth.uid() is null or v_tenant_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_causa_id is null or btrim(p_causa_id) = '' then
    raise exception 'p_causa_id is required' using errcode = '22023';
  end if;
  if p_entries is null or jsonb_typeof(p_entries) <> 'array' then
    raise exception 'p_entries must be a JSON array' using errcode = '22023';
  end if;
  if p_removed_entry_ids is null or jsonb_typeof(p_removed_entry_ids) <> 'array' then
    raise exception 'p_removed_entry_ids must be a JSON array' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.causas c
    where c.id = p_causa_id and c.tenant_id = v_tenant_id
  ) then
    raise exception 'causa not found or not visible' using errcode = '42501';
  end if;

  with payload as (
    select * from jsonb_to_recordset(p_entries) as entry(
      id text, fecha text, tipo text, titulo text, descripcion text,
      participantes jsonb, documento_adjunto text, compartido_grupal boolean
    )
  )
  select count(*)::integer into v_expected_count from payload;

  with payload as (
    select * from jsonb_to_recordset(p_entries) as entry(
      id text, fecha text, tipo text, titulo text, descripcion text,
      participantes jsonb, documento_adjunto text, compartido_grupal boolean
    )
  )
  select count(*)::integer into v_written_count
  from payload
  where id is null or btrim(id) = '' or fecha is null or btrim(fecha) = ''
    or tipo is null or btrim(tipo) = '' or titulo is null or btrim(titulo) = ''
    or (participantes is not null and jsonb_typeof(participantes) <> 'array');
  if v_written_count > 0 then
    raise exception 'invalid bitacora snapshot payload' using errcode = '22023';
  end if;

  with payload as (
    select * from jsonb_to_recordset(p_entries) as entry(
      id text, fecha text, tipo text, titulo text, descripcion text,
      participantes jsonb, documento_adjunto text, compartido_grupal boolean
    )
  )
  select (count(*) - count(distinct id))::integer into v_written_count from payload;
  if v_written_count > 0 then
    raise exception 'duplicate bitacora entry ids in snapshot' using errcode = '23505';
  end if;

  with payload as (
    select * from jsonb_to_recordset(p_entries) as entry(
      id text, fecha text, tipo text, titulo text, descripcion text,
      participantes jsonb, documento_adjunto text, compartido_grupal boolean
    )
  ), written as (
    insert into public.bitacora_entries (
      id, causa_id, tenant_id, fecha, tipo, titulo, descripcion,
      participantes, documento_adjunto, compartido_grupal
    )
    select id, p_causa_id, v_tenant_id, fecha, tipo, titulo,
      coalesce(descripcion, ''), coalesce(participantes, '[]'::jsonb),
      nullif(documento_adjunto, ''), coalesce(compartido_grupal, false)
    from payload
    on conflict (id) do update set
      fecha = excluded.fecha,
      tipo = excluded.tipo,
      titulo = excluded.titulo,
      descripcion = excluded.descripcion,
      participantes = excluded.participantes,
      documento_adjunto = excluded.documento_adjunto,
      compartido_grupal = excluded.compartido_grupal
    where public.bitacora_entries.tenant_id = v_tenant_id
      and public.bitacora_entries.causa_id = p_causa_id
    returning 1
  )
  select count(*)::integer into v_written_count from written;
  if v_written_count <> v_expected_count then
    raise exception 'bitacora snapshot write conflict' using errcode = '40001';
  end if;

  delete from public.bitacora_entries entry
  where entry.tenant_id = v_tenant_id and entry.causa_id = p_causa_id
    and entry.id in (
      select removed_id from jsonb_array_elements_text(p_removed_entry_ids) as removed(removed_id)
    );
end;
$$;

revoke all on function public.save_bitacora_snapshot(text, jsonb, jsonb) from public, anon;
grant execute on function public.save_bitacora_snapshot(text, jsonb, jsonb) to authenticated;
grant execute on function public.save_bitacora_snapshot(text, jsonb, jsonb) to service_role;
-- ===== SOURCE END: supabase/migrations/20260827184509_share_incident_progress_and_milestones.sql =====

-- ===== SOURCE START: supabase/migrations/20260903194601_set_high_severity_investigation_deadlines.sql =====
-- Faltas Muy Graves y Gravísimas: informe de cierre de indagación en 10 días hábiles.
with high_severity as (
  select
    id,
    coalesce(fecha_inicio_investigacion, nullif(fecha_apertura, '')::date) as fecha_inicio
  from public.causas
  where tipo_infraccion in ('Muy Grave', 'Gravísima')
    and fecha_apertura is not null
    and nullif(fecha_apertura, '') is not null
),
deadlines as (
  select id, fecha_inicio, fecha_limite
  from (
    select
      high_severity.id,
      high_severity.fecha_inicio,
      dates.fecha::date as fecha_limite,
      row_number() over (partition by high_severity.id order by dates.fecha) as business_day
    from high_severity
    cross join lateral generate_series(
      high_severity.fecha_inicio,
      high_severity.fecha_inicio + interval '30 days',
      interval '1 day'
    ) as dates(fecha)
    where extract(isodow from dates.fecha) between 1 and 5
  ) counted
  where business_day = 10
)
update public.causas
set plazo_investigacion_dias = 10,
    fecha_inicio_investigacion = deadlines.fecha_inicio,
    fecha_limite_investigacion = deadlines.fecha_limite
from deadlines
where causas.id = deadlines.id;
-- ===== SOURCE END: supabase/migrations/20260903194601_set_high_severity_investigation_deadlines.sql =====

-- ===== SOURCE START: supabase/migrations/20260904131921_count_deadlines_from_next_business_day.sql =====
-- El primer día hábil se cuenta desde el día siguiente al inicio registrado.
with sources as (
  select
    id,
    coalesce(fecha_inicio_investigacion, nullif(fecha_apertura, '')::date) as fecha_inicio,
    coalesce(
      plazo_investigacion_dias,
      case when compromete_aula_segura then 10 else 60 end
    ) as plazo_dias
  from public.causas
  where fecha_apertura is not null
    and nullif(fecha_apertura, '') is not null
), deadlines as (
  select counted.id, counted.fecha_inicio, counted.fecha_limite
  from (
    select
      sources.id,
      sources.fecha_inicio,
      dates.fecha::date as fecha_limite,
      row_number() over (partition by sources.id order by dates.fecha) as dia_habil
    from sources
    cross join lateral generate_series(
      sources.fecha_inicio + interval '1 day',
      sources.fecha_inicio + interval '120 days',
      interval '1 day'
    ) as dates(fecha)
    where extract(isodow from dates.fecha) between 1 and 5
  ) counted
  join sources using (id)
  where counted.dia_habil = sources.plazo_dias
)
update public.causas
set fecha_limite_investigacion = deadlines.fecha_limite
from deadlines
where causas.id = deadlines.id;
-- ===== SOURCE END: supabase/migrations/20260904131921_count_deadlines_from_next_business_day.sql =====

-- ===== SOURCE START: supabase/migrations/20260906120000_add_apoderado_email_causas.sql =====
-- Email del apoderado para notificaciones por correo (módulo Composio).
alter table public.causas
  add column if not exists apoderado_email text null;

alter table public.causas
  drop constraint if exists causas_apoderado_email_format;

alter table public.causas
  add constraint causas_apoderado_email_format
  check (
    apoderado_email is null
    or apoderado_email ~* '^[^@\s]{1,64}@[^@\s]{1,253}\.[^@\s]{2,}$'
  );
-- ===== SOURCE END: supabase/migrations/20260906120000_add_apoderado_email_causas.sql =====

-- ===== SOURCE START: supabase/migrations/20260915140000_add_hechos_matriz.sql =====
-- Matriz Hecho–Evidencia–RICE (MVP prioridad 3)
-- hechos por causa, evidencias por storage path, join N:M para caso colectivo

create table if not exists public.hechos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants(id),
  causa_id text not null references public.causas(id) on delete cascade,
  incidente_id uuid references public.incidentes(id) on delete set null,
  titulo text not null check (char_length(titulo) between 4 and 200),
  descripcion text not null default '',
  estado text not null default 'denunciado' check (estado in ('denunciado','acreditado','parcial','no_acreditado')),
  participacion_acreditada boolean not null default false,
  rice_articulo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hecho_evidencias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants(id),
  hecho_id uuid not null references public.hechos(id) on delete cascade,
  causa_id text not null references public.causas(id) on delete cascade,
  evidencia_path text not null,
  evidencia_nombre text not null default '',
  created_at timestamptz not null default now(),
  unique (hecho_id, evidencia_path)
);

alter table public.hechos enable row level security;
alter table public.hecho_evidencias enable row level security;

grant select, insert, update, delete on public.hechos to authenticated;
grant select, insert, delete on public.hecho_evidencias to authenticated;

-- RLS: tenant isolation
drop policy if exists hechos_tenant_select on public.hechos;
create policy hechos_tenant_select on public.hechos
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists hechos_tenant_insert on public.hechos;
create policy hechos_tenant_insert on public.hechos
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria','profesor_jefe','teacher','staff'])
  );

drop policy if exists hechos_tenant_update on public.hechos;
create policy hechos_tenant_update on public.hechos
  for update to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria','profesor_jefe','teacher','staff'])
  );

drop policy if exists hechos_tenant_delete on public.hechos;
create policy hechos_tenant_delete on public.hechos
  for delete to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria'])
  );

drop policy if exists hecho_evidencias_tenant_select on public.hecho_evidencias;
create policy hecho_evidencias_tenant_select on public.hecho_evidencias
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists hecho_evidencias_tenant_insert on public.hecho_evidencias;
create policy hecho_evidencias_tenant_insert on public.hecho_evidencias
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria','profesor_jefe','teacher','staff'])
  );

drop policy if exists hecho_evidencias_tenant_delete on public.hecho_evidencias;
create policy hecho_evidencias_tenant_delete on public.hecho_evidencias
  for delete to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria'])
  );

-- Tenant consistency triggers
create or replace function public.ensure_hecho_same_tenant()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if not exists (select 1 from public.causas c where c.id = new.causa_id and c.tenant_id = new.tenant_id) then
    raise exception 'causa does not belong to hecho tenant';
  end if;
  if new.incidente_id is not null and not exists (select 1 from public.incidentes i where i.id = new.incidente_id and i.tenant_id = new.tenant_id) then
    raise exception 'incidente does not belong to hecho tenant';
  end if;
  return new;
end;
$$;

drop trigger if exists hechos_same_tenant on public.hechos;
create trigger hechos_same_tenant before insert or update of causa_id, incidente_id, tenant_id on public.hechos
  for each row execute function public.ensure_hecho_same_tenant();

create or replace function public.ensure_hecho_evidencia_same_tenant()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if not exists (select 1 from public.hechos h where h.id = new.hecho_id and h.tenant_id = new.tenant_id) then
    raise exception 'hecho does not belong to evidencia tenant';
  end if;
  return new;
end;
$$;

drop trigger if exists hecho_evidencias_same_tenant on public.hecho_evidencias;
create trigger hecho_evidencias_same_tenant before insert or update of hecho_id, tenant_id on public.hecho_evidencias
  for each row execute function public.ensure_hecho_evidencia_same_tenant();

-- updated_at
create or replace function public.touch_hechos_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists hechos_touch_updated on public.hechos;
create trigger hechos_touch_updated before update on public.hechos
  for each row execute function public.touch_hechos_updated_at();

-- indexes
create index if not exists idx_hechos_tenant_causa on public.hechos (tenant_id, causa_id);
create index if not exists idx_hechos_tenant_incidente on public.hechos (tenant_id, incidente_id);
create index if not exists idx_hecho_evidencias_hecho on public.hecho_evidencias (hecho_id);
create index if not exists idx_hecho_evidencias_tenant_causa on public.hecho_evidencias (tenant_id, causa_id);

revoke execute on function public.ensure_hecho_same_tenant() from public;
revoke execute on function public.ensure_hecho_evidencia_same_tenant() from public;
-- ===== SOURCE END: supabase/migrations/20260915140000_add_hechos_matriz.sql =====

-- ===== SOURCE START: supabase/migrations/20260915150000_add_proporcionalidad_fields.sql =====
-- Motor de proporcionalidad: agravantes/atenuantes por hecho
alter table public.hechos add column if not exists agravantes text[] not null default '{}';
alter table public.hechos add column if not exists atenuantes text[] not null default '{}';
-- ===== SOURCE END: supabase/migrations/20260915150000_add_proporcionalidad_fields.sql =====

-- ===== SOURCE START: supabase/migrations/20260915160000_add_seguimiento_post_cierre.sql =====
-- Seguimiento post-cierre: programa de intervención, medidas formativas, responsable, cumplimiento y evaluación
create table if not exists public.seguimiento_planes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants(id),
  causa_id text not null references public.causas(id) on delete cascade,
  incidente_id uuid references public.incidentes(id) on delete set null,
  titulo text not null check (char_length(titulo) between 4 and 200),
  descripcion text not null default '',
  responsable text not null default '',
  fecha_inicio date not null default current_date,
  fecha_fin date,
  estado text not null default 'pendiente' check (estado in ('pendiente','en_curso','cumplido','incumplido','evaluado')),
  cumplimiento text not null default '' check (char_length(cumplimiento) <= 1000),
  evaluacion text not null default '' check (char_length(evaluacion) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.seguimiento_planes enable row level security;
grant select, insert, update, delete on public.seguimiento_planes to authenticated;

drop policy if exists seguimiento_planes_select on public.seguimiento_planes;
create policy seguimiento_planes_select on public.seguimiento_planes
  for select to authenticated using (tenant_id = public.current_tenant_id());

drop policy if exists seguimiento_planes_insert on public.seguimiento_planes;
create policy seguimiento_planes_insert on public.seguimiento_planes
  for insert to authenticated with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria','profesor_jefe','teacher','staff'])
  );

drop policy if exists seguimiento_planes_update on public.seguimiento_planes;
create policy seguimiento_planes_update on public.seguimiento_planes
  for update to authenticated using (tenant_id = public.current_tenant_id())
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria','profesor_jefe','teacher','staff'])
  );

drop policy if exists seguimiento_planes_delete on public.seguimiento_planes;
create policy seguimiento_planes_delete on public.seguimiento_planes
  for delete to authenticated using (
    tenant_id = public.current_tenant_id() and public.current_app_role() = any (array['admin','direccion','convivencia'])
  );

create or replace function public.ensure_seguimiento_same_tenant()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if not exists (select 1 from public.causas c where c.id=new.causa_id and c.tenant_id=new.tenant_id) then
    raise exception 'causa does not belong to seguimiento tenant';
  end if;
  return new;
end; $$;

drop trigger if exists seguimiento_same_tenant on public.seguimiento_planes;
create trigger seguimiento_same_tenant before insert or update of causa_id, tenant_id on public.seguimiento_planes
  for each row execute function public.ensure_seguimiento_same_tenant();

create or replace function public.touch_seguimiento_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end; $$;
drop trigger if exists seguimiento_touch_updated on public.seguimiento_planes;
create trigger seguimiento_touch_updated before update on public.seguimiento_planes
  for each row execute function public.touch_seguimiento_updated_at();

create index if not exists idx_seguimiento_tenant_causa on public.seguimiento_planes (tenant_id, causa_id);
create index if not exists idx_seguimiento_tenant_incidente on public.seguimiento_planes (tenant_id, incidente_id);

revoke execute on function public.ensure_seguimiento_same_tenant() from public;
-- ===== SOURCE END: supabase/migrations/20260915160000_add_seguimiento_post_cierre.sql =====

-- ===== SOURCE START: supabase/migrations/20260915170000_add_plan_gestion.sql =====
-- Plan de Gestión de Convivencia: objetivos, acciones preventivas, responsables, fechas, indicadores y evidencias
create table if not exists public.plan_gestion (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants(id),
  ano int not null check (ano between 2024 and 2035),
  objetivo text not null check (char_length(objetivo) between 4 and 300),
  accion text not null check (char_length(accion) between 4 and 500),
  responsable text not null default '' check (char_length(responsable) <= 200),
  fecha_inicio date not null default current_date,
  fecha_fin date,
  indicador text not null default '' check (char_length(indicador) <= 300),
  evidencia_nombre text,
  evidencia_path text,
  estado text not null default 'pendiente' check (estado in ('pendiente','en_curso','cumplido','evaluado','atrasado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plan_gestion enable row level security;
grant select, insert, update, delete on public.plan_gestion to authenticated;

drop policy if exists plan_gestion_select on public.plan_gestion;
create policy plan_gestion_select on public.plan_gestion
  for select to authenticated using (tenant_id = public.current_tenant_id());

drop policy if exists plan_gestion_insert on public.plan_gestion;
create policy plan_gestion_insert on public.plan_gestion
  for insert to authenticated with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria'])
  );

drop policy if exists plan_gestion_update on public.plan_gestion;
create policy plan_gestion_update on public.plan_gestion
  for update to authenticated using (tenant_id = public.current_tenant_id())
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria'])
  );

drop policy if exists plan_gestion_delete on public.plan_gestion;
create policy plan_gestion_delete on public.plan_gestion
  for delete to authenticated using (
    tenant_id = public.current_tenant_id() and public.current_app_role() = any (array['admin','direccion'])
  );

create or replace function public.touch_plan_gestion_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end; $$;
drop trigger if exists plan_gestion_touch_updated on public.plan_gestion;
create trigger plan_gestion_touch_updated before update on public.plan_gestion
  for each row execute function public.touch_plan_gestion_updated_at();

create index if not exists idx_plan_gestion_tenant_ano on public.plan_gestion (tenant_id, ano);
create index if not exists idx_plan_gestion_tenant_estado on public.plan_gestion (tenant_id, estado);
-- ===== SOURCE END: supabase/migrations/20260915170000_add_plan_gestion.sql =====

-- ===== SOURCE START: supabase/migrations/20260917000000_add_decision_hechos.sql =====
-- Matriz de Decisión Fundada: medida seleccionada + análisis + decisión por hecho
-- Solo columnas nulables/vacías; no toca RLS (las políticas existentes cubren UPDATE)
alter table public.hechos add column if not exists medida_seleccionada text;
alter table public.hechos add column if not exists analisis_proporcionalidad text not null default '';
alter table public.hechos add column if not exists decision_fundada text not null default '';
-- ===== SOURCE END: supabase/migrations/20260917000000_add_decision_hechos.sql =====

-- ===== SOURCE START: supabase/migrations/20260923100000_add_procedural_model_version.sql =====
-- Versiona el modelo procedimental sin reinterpretar expedientes históricos.
alter table public.causas
  add column if not exists procedural_model_version smallint;

update public.causas
set procedural_model_version = 1
where procedural_model_version is null;

alter table public.causas
  alter column procedural_model_version set default 1,
  alter column procedural_model_version set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'causas_procedural_model_version_check'
      and conrelid = 'public.causas'::regclass
  ) then
    alter table public.causas
      add constraint causas_procedural_model_version_check
      check (procedural_model_version in (1, 2));
  end if;
end
$$;
-- ===== SOURCE END: supabase/migrations/20260923100000_add_procedural_model_version.sql =====

-- ===== SOURCE START: supabase/migrations/20260923110000_enrich_checklist_items.sql =====
-- Enriquece hitos sin obligar a completar información histórica.
alter table public.checklist_items
  add column if not exists obligatorio boolean,
  add column if not exists aplicabilidad text,
  add column if not exists estado text,
  add column if not exists fundamento_no_aplica text,
  add column if not exists fecha_inicio date,
  add column if not exists fecha_limite date,
  add column if not exists resultado text,
  add column if not exists bloqueante_para_avanzar boolean,
  add column if not exists bloqueante_para_cerrar boolean;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'checklist_items_aplicabilidad_check'
      and conrelid = 'public.checklist_items'::regclass
  ) then
    alter table public.checklist_items
      add constraint checklist_items_aplicabilidad_check
      check (aplicabilidad is null or aplicabilidad in ('pendiente', 'aplica', 'no_aplica'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'checklist_items_estado_check'
      and conrelid = 'public.checklist_items'::regclass
  ) then
    alter table public.checklist_items
      add constraint checklist_items_estado_check
      check (estado is null or estado in ('no_iniciado', 'en_desarrollo', 'cumplido', 'vencido', 'no_aplica', 'invalidado'));
  end if;
end
$$;

create or replace function public.save_checklist_snapshot(
  p_causa_id text,
  p_items jsonb,
  p_removed_item_ids jsonb default '[]'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_expected_count integer;
  v_written_count integer;
begin
  if auth.uid() is null or v_tenant_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_causa_id is null or btrim(p_causa_id) = '' then
    raise exception 'p_causa_id is required' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items must be a JSON array' using errcode = '22023';
  end if;
  if p_removed_item_ids is null or jsonb_typeof(p_removed_item_ids) <> 'array' then
    raise exception 'p_removed_item_ids must be a JSON array' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.causas c
    where c.id = p_causa_id and c.tenant_id = v_tenant_id
  ) then
    raise exception 'causa not found or not visible' using errcode = '42501';
  end if;

  with payload as (
    select * from jsonb_to_recordset(p_items) as item(
      id text, label text, descripcion text, completado boolean,
      fecha_completado text, obligatorio boolean, aplicabilidad text,
      estado text, fundamento_no_aplica text, fecha_inicio text,
      fecha_limite text, resultado text, bloqueante_para_avanzar boolean,
      bloqueante_para_cerrar boolean, requerido_por text, registrado_por text,
      observaciones text, documento_nombre text, documento_url text
    )
  )
  select count(*)::integer into v_expected_count from payload;

  with payload as (
    select * from jsonb_to_recordset(p_items) as item(
      id text, label text, descripcion text, completado boolean,
      fecha_completado text, obligatorio boolean, aplicabilidad text,
      estado text, fundamento_no_aplica text, fecha_inicio text,
      fecha_limite text, resultado text, bloqueante_para_avanzar boolean,
      bloqueante_para_cerrar boolean, requerido_por text, registrado_por text,
      observaciones text, documento_nombre text, documento_url text
    )
  )
  select count(*)::integer into v_written_count
  from payload
  where id is null or btrim(id) = '' or label is null or btrim(label) = ''
    or requerido_por is null or btrim(requerido_por) = '';
  if v_written_count > 0 then
    raise exception 'invalid checklist snapshot payload' using errcode = '22023';
  end if;

  with payload as (
    select * from jsonb_to_recordset(p_items) as item(
      id text, label text, descripcion text, completado boolean,
      fecha_completado text, obligatorio boolean, aplicabilidad text,
      estado text, fundamento_no_aplica text, fecha_inicio text,
      fecha_limite text, resultado text, bloqueante_para_avanzar boolean,
      bloqueante_para_cerrar boolean, requerido_por text, registrado_por text,
      observaciones text, documento_nombre text, documento_url text
    )
  )
  select (count(*) - count(distinct id))::integer into v_written_count from payload;
  if v_written_count > 0 then
    raise exception 'duplicate checklist item ids in snapshot' using errcode = '23505';
  end if;

  with payload as (
    select * from jsonb_to_recordset(p_items) as item(
      id text, label text, descripcion text, completado boolean,
      fecha_completado text, obligatorio boolean, aplicabilidad text,
      estado text, fundamento_no_aplica text, fecha_inicio text,
      fecha_limite text, resultado text, bloqueante_para_avanzar boolean,
      bloqueante_para_cerrar boolean, requerido_por text, registrado_por text,
      observaciones text, documento_nombre text, documento_url text
    )
  ), written as (
    insert into public.checklist_items (
      id, causa_id, tenant_id, label, descripcion, completado, fecha_completado,
      obligatorio, aplicabilidad, estado, fundamento_no_aplica, fecha_inicio,
      fecha_limite, resultado, bloqueante_para_avanzar, bloqueante_para_cerrar,
      requerido_por, registrado_por, observaciones, documento_nombre, documento_url
    )
    select
      id, p_causa_id, v_tenant_id, label, coalesce(descripcion, ''),
      coalesce(completado, false), nullif(fecha_completado, ''), obligatorio,
      nullif(aplicabilidad, ''), nullif(estado, ''), nullif(fundamento_no_aplica, ''),
      nullif(fecha_inicio, '')::date, nullif(fecha_limite, '')::date,
      nullif(resultado, ''), bloqueante_para_avanzar, bloqueante_para_cerrar,
      requerido_por, nullif(registrado_por, ''), nullif(observaciones, ''),
      nullif(documento_nombre, ''), nullif(documento_url, '')
    from payload
    on conflict (id, causa_id) do update set
      label = excluded.label,
      descripcion = excluded.descripcion,
      completado = excluded.completado,
      fecha_completado = excluded.fecha_completado,
      obligatorio = excluded.obligatorio,
      aplicabilidad = excluded.aplicabilidad,
      estado = excluded.estado,
      fundamento_no_aplica = excluded.fundamento_no_aplica,
      fecha_inicio = excluded.fecha_inicio,
      fecha_limite = excluded.fecha_limite,
      resultado = excluded.resultado,
      bloqueante_para_avanzar = excluded.bloqueante_para_avanzar,
      bloqueante_para_cerrar = excluded.bloqueante_para_cerrar,
      requerido_por = excluded.requerido_por,
      registrado_por = excluded.registrado_por,
      observaciones = excluded.observaciones,
      documento_nombre = excluded.documento_nombre,
      documento_url = excluded.documento_url
    where public.checklist_items.tenant_id = v_tenant_id
      and public.checklist_items.causa_id = p_causa_id
    returning 1
  )
  select count(*)::integer into v_written_count from written;
  if v_written_count <> v_expected_count then
    raise exception 'checklist snapshot write conflict' using errcode = '40001';
  end if;

  delete from public.checklist_items item
  where item.tenant_id = v_tenant_id and item.causa_id = p_causa_id
    and item.id in (
      select removed_id from jsonb_array_elements_text(p_removed_item_ids) as removed(removed_id)
    );
end;
$$;
-- ===== SOURCE END: supabase/migrations/20260923110000_enrich_checklist_items.sql =====

-- ===== SOURCE START: supabase/migrations/20260923120000_add_expediente_events_documents.sql =====
-- Fases 5 y 6: historial inmutable e índice documental del expediente.
-- Los archivos físicos siguen viviendo en Storage; esta tabla solo registra su índice.

create table if not exists public.expediente_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants(id),
  causa_id text not null references public.causas(id) on delete cascade,
  incidente_id uuid references public.incidentes(id) on delete set null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id),
  event_type text not null,
  title text not null check (char_length(title) between 1 and 240),
  description text not null default '',
  milestone_id text,
  hecho_id uuid references public.hechos(id) on delete set null,
  source_table text,
  source_id text,
  participants jsonb not null default '[]'::jsonb,
  status text not null default 'vigente'
    check (status in ('vigente', 'rectificado', 'invalidado')),
  previous_event_id uuid references public.expediente_events(id) on delete set null,
  correction_reason text,
  metadata jsonb not null default '{}'::jsonb,
  constraint expediente_events_participants_array check (jsonb_typeof(participants) = 'array')
);

create table if not exists public.expediente_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants(id),
  causa_id text not null references public.causas(id) on delete cascade,
  incidente_id uuid references public.incidentes(id) on delete set null,
  original_name text not null check (char_length(original_name) between 1 and 255),
  display_name text not null check (char_length(display_name) between 1 and 255),
  mime_type text not null default 'application/octet-stream',
  byte_size bigint not null default 0 check (byte_size >= 0),
  storage_path text not null,
  milestone_id text,
  event_id uuid references public.expediente_events(id) on delete set null,
  hecho_id uuid references public.hechos(id) on delete set null,
  document_date timestamptz,
  incorporated_at timestamptz not null default now(),
  incorporated_by uuid references auth.users(id),
  origin text not null default 'interno'
    check (origin in ('interno', 'externo', 'importado')),
  scope text not null default 'individual'
    check (scope in ('individual', 'grupal')),
  version integer not null default 1 check (version > 0),
  status text not null default 'vigente'
    check (status in ('vigente', 'invalidado', 'reemplazado')),
  invalidated_at timestamptz,
  invalidated_by uuid references auth.users(id),
  invalidation_reason text,
  sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  constraint expediente_documents_reference_check check (
    milestone_id is not null or event_id is not null or hecho_id is not null
  )
);

create index if not exists idx_expediente_events_tenant_causa_occurred
  on public.expediente_events (tenant_id, causa_id, occurred_at);
create index if not exists idx_expediente_events_tenant_milestone
  on public.expediente_events (tenant_id, milestone_id, occurred_at);
create index if not exists idx_expediente_events_tenant_type
  on public.expediente_events (tenant_id, event_type, occurred_at);
create index if not exists idx_expediente_documents_tenant_causa
  on public.expediente_documents (tenant_id, causa_id, incorporated_at);
create index if not exists idx_expediente_documents_tenant_event
  on public.expediente_documents (tenant_id, event_id);
create index if not exists idx_expediente_documents_tenant_hecho
  on public.expediente_documents (tenant_id, hecho_id);

alter table public.expediente_events enable row level security;
alter table public.expediente_documents enable row level security;

grant select, insert on public.expediente_events to authenticated;
grant select, insert, update on public.expediente_documents to authenticated;

drop policy if exists expediente_events_tenant_select on public.expediente_events;
create policy expediente_events_tenant_select on public.expediente_events
  for select to authenticated using (tenant_id = public.current_tenant_id());

drop policy if exists expediente_events_tenant_insert on public.expediente_events;
create policy expediente_events_tenant_insert on public.expediente_events
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria','profesor_jefe','teacher','staff'])
  );

drop policy if exists expediente_documents_tenant_select on public.expediente_documents;
create policy expediente_documents_tenant_select on public.expediente_documents
  for select to authenticated using (tenant_id = public.current_tenant_id());

drop policy if exists expediente_documents_tenant_insert on public.expediente_documents;
create policy expediente_documents_tenant_insert on public.expediente_documents
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria','profesor_jefe','teacher','staff'])
  );

drop policy if exists expediente_documents_tenant_update on public.expediente_documents;
create policy expediente_documents_tenant_update on public.expediente_documents
  for update to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create or replace function public.ensure_expediente_event_tenant()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.causas c where c.id = new.causa_id and c.tenant_id = new.tenant_id) then
    raise exception 'causa does not belong to event tenant';
  end if;
  if new.incidente_id is not null and not exists (
    select 1 from public.incidentes i where i.id = new.incidente_id and i.tenant_id = new.tenant_id
  ) then
    raise exception 'incidente does not belong to event tenant';
  end if;
  if new.hecho_id is not null and not exists (
    select 1 from public.hechos h where h.id = new.hecho_id and h.tenant_id = new.tenant_id and h.causa_id = new.causa_id
  ) then
    raise exception 'hecho does not belong to event tenant';
  end if;
  return new;
end;
$$;

drop trigger if exists expediente_events_same_tenant on public.expediente_events;
create trigger expediente_events_same_tenant
  before insert on public.expediente_events
  for each row execute function public.ensure_expediente_event_tenant();

create or replace function public.ensure_expediente_document_tenant()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.causas c where c.id = new.causa_id and c.tenant_id = new.tenant_id) then
    raise exception 'causa does not belong to document tenant';
  end if;
  if new.incidente_id is not null and not exists (
    select 1 from public.incidentes i where i.id = new.incidente_id and i.tenant_id = new.tenant_id
  ) then
    raise exception 'incidente does not belong to document tenant';
  end if;
  if new.event_id is not null and not exists (
    select 1 from public.expediente_events e where e.id = new.event_id and e.tenant_id = new.tenant_id and e.causa_id = new.causa_id
  ) then
    raise exception 'event does not belong to document tenant';
  end if;
  if new.hecho_id is not null and not exists (
    select 1 from public.hechos h where h.id = new.hecho_id and h.tenant_id = new.tenant_id and h.causa_id = new.causa_id
  ) then
    raise exception 'hecho does not belong to document tenant';
  end if;
  return new;
end;
$$;

drop trigger if exists expediente_documents_same_tenant on public.expediente_documents;
create trigger expediente_documents_same_tenant
  before insert or update on public.expediente_documents
  for each row execute function public.ensure_expediente_document_tenant();

revoke execute on function public.ensure_expediente_event_tenant() from public;
revoke execute on function public.ensure_expediente_document_tenant() from public;
-- ===== SOURCE END: supabase/migrations/20260923120000_add_expediente_events_documents.sql =====

-- ===== SOURCE START: supabase/migrations/20260923130000_add_reconsideraciones.sql =====
-- Registro persistente de reconsideraciones y apelaciones del expediente.
-- No se permite borrado desde cliente: la trazabilidad se conserva.

create table if not exists public.reconsideraciones (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants(id),
  causa_id text not null references public.causas(id) on delete cascade,
  incidente_id uuid references public.incidentes(id) on delete set null,
  tipo text not null check (tipo in ('reconsideracion', 'apelacion')),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'acogida', 'rechazada', 'desistida', 'vencida')),
  solicitada_at timestamptz not null default now(),
  resuelta_at timestamptz,
  solicitada_por text,
  solicitud text not null default '',
  resolucion text not null default '',
  documento_nombre text,
  documento_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reconsideraciones_tenant_causa
  on public.reconsideraciones (tenant_id, causa_id, solicitada_at);
create index if not exists idx_reconsideraciones_tenant_incidente
  on public.reconsideraciones (tenant_id, incidente_id, solicitada_at);

alter table public.reconsideraciones enable row level security;
grant select, insert, update on public.reconsideraciones to authenticated;

drop policy if exists reconsideraciones_tenant_select on public.reconsideraciones;
create policy reconsideraciones_tenant_select on public.reconsideraciones
  for select to authenticated using (tenant_id = public.current_tenant_id());

drop policy if exists reconsideraciones_tenant_insert on public.reconsideraciones;
create policy reconsideraciones_tenant_insert on public.reconsideraciones
  for insert to authenticated with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria','profesor_jefe','teacher','staff'])
  );

drop policy if exists reconsideraciones_tenant_update on public.reconsideraciones;
create policy reconsideraciones_tenant_update on public.reconsideraciones
  for update to authenticated using (tenant_id = public.current_tenant_id())
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array['admin','direccion','convivencia','inspectoria','profesor_jefe','teacher','staff'])
  );

create or replace function public.ensure_reconsideracion_same_tenant()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if not exists (
    select 1 from public.causas c
    where c.id = new.causa_id and c.tenant_id = new.tenant_id
  ) then
    raise exception 'causa does not belong to reconsideracion tenant';
  end if;
  if new.incidente_id is not null and not exists (
    select 1 from public.incidentes i
    where i.id = new.incidente_id and i.tenant_id = new.tenant_id
  ) then
    raise exception 'incidente does not belong to reconsideracion tenant';
  end if;
  return new;
end;
$$;

drop trigger if exists reconsideraciones_same_tenant on public.reconsideraciones;
create trigger reconsideraciones_same_tenant
  before insert or update on public.reconsideraciones
  for each row execute function public.ensure_reconsideracion_same_tenant();

create or replace function public.touch_reconsideracion_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reconsideraciones_touch_updated on public.reconsideraciones;
create trigger reconsideraciones_touch_updated
  before update on public.reconsideraciones
  for each row execute function public.touch_reconsideracion_updated_at();

revoke execute on function public.ensure_reconsideracion_same_tenant() from public;
-- ===== SOURCE END: supabase/migrations/20260923130000_add_reconsideraciones.sql =====

-- ===== SOURCE START: supabase/migrations/20260924100000_enforce_causa_state_transitions.sql =====
-- Impide saltos de fase en expedientes procedimentales versión 2.
-- Los expedientes versión 1 conservan su comportamiento histórico.

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'causas'
  ) then
    raise exception 'Precondition failed: public.causas must exist';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'causas'
      and column_name = 'procedural_model_version'
  ) then
    raise exception 'Precondition failed: causas.procedural_model_version must exist';
  end if;
end
$$;

create or replace function public.enforce_causa_state_transition()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  previous_phase smallint;
  next_phase smallint;
begin
  if old.procedural_model_version <> 2
     or new.procedural_model_version <> 2
     or old.estado_actual = new.estado_actual then
    return new;
  end if;

  previous_phase := case old.estado_actual
    when 'Recepción de Denuncia' then 1
    when 'Revisión Inicial de Antecedentes' then 1
    when 'Notificación de Inicio de Indagación' then 1
    when 'En Proceso de Indagación' then 2
    when 'Recopilación de Evidencias en Curso' then 2
    when 'Derivado a Mediación' then 2
    when 'Mediación en Desarrollo' then 2
    when 'Mediación Cerrada con Acuerdo' then 2
    when 'Mediación Fracasada – Retorno a Indagación' then 2
    when 'Informe Cierre de Indagación en Elaboración' then 3
    when 'Informe Cierre de Indagación Emitido' then 3
    when 'Entrevista Disciplinaria Pendiente' then 3
    when 'Entrevista Disciplinaria Realizada' then 3
    when 'Informe Concluyente en Elaboración' then 3
    when 'Informe Concluyente Emitido' then 3
    when 'En Plazo de Apelación' then 4
    when 'Apelación Recepcionada' then 4
    when 'Apelación en Revisión por Rectoría' then 4
    when 'Apelación Resuelta' then 4
    when 'Resolución Ejecutoriada' then 4
    when 'Medida en Ejecución' then 5
    when 'En Proceso de Seguimiento' then 5
    when 'Seguimiento Finalizado' then 5
    when 'Causa Cerrada' then 5
    else null
  end;

  next_phase := case new.estado_actual
    when 'Recepción de Denuncia' then 1
    when 'Revisión Inicial de Antecedentes' then 1
    when 'Notificación de Inicio de Indagación' then 1
    when 'En Proceso de Indagación' then 2
    when 'Recopilación de Evidencias en Curso' then 2
    when 'Derivado a Mediación' then 2
    when 'Mediación en Desarrollo' then 2
    when 'Mediación Cerrada con Acuerdo' then 2
    when 'Mediación Fracasada – Retorno a Indagación' then 2
    when 'Informe Cierre de Indagación en Elaboración' then 3
    when 'Informe Cierre de Indagación Emitido' then 3
    when 'Entrevista Disciplinaria Pendiente' then 3
    when 'Entrevista Disciplinaria Realizada' then 3
    when 'Informe Concluyente en Elaboración' then 3
    when 'Informe Concluyente Emitido' then 3
    when 'En Plazo de Apelación' then 4
    when 'Apelación Recepcionada' then 4
    when 'Apelación en Revisión por Rectoría' then 4
    when 'Apelación Resuelta' then 4
    when 'Resolución Ejecutoriada' then 4
    when 'Medida en Ejecución' then 5
    when 'En Proceso de Seguimiento' then 5
    when 'Seguimiento Finalizado' then 5
    when 'Causa Cerrada' then 5
    else null
  end;

  if previous_phase is null or next_phase is null then
    raise exception 'Estado de causa no reconocido para transición versión 2';
  end if;
  if next_phase > previous_phase + 1 then
    raise exception
      'Transición de causa inválida: no se puede saltar de fase % a %',
      previous_phase, next_phase;
  end if;
  return new;
end;
$$;

drop trigger if exists causas_enforce_state_transition on public.causas;
create trigger causas_enforce_state_transition
before update of estado_actual on public.causas
for each row
execute function public.enforce_causa_state_transition();

revoke all on function public.enforce_causa_state_transition() from public;
grant execute on function public.enforce_causa_state_transition() to authenticated, service_role;
-- ===== SOURCE END: supabase/migrations/20260924100000_enforce_causa_state_transitions.sql =====

-- ===== SOURCE START: supabase/migrations/20261009122000_align_causa_update_roles.sql =====
/** @license SPDX-License-Identifier: Apache-2.0 */

-- Alinea los roles de colegio reconocidos por la aplicación con la política
-- de actualización de causas, manteniendo el aislamiento por tenant.
DROP POLICY IF EXISTS "causas_tenant_update" ON public.causas;

CREATE POLICY "causas_tenant_update"
  ON public.causas
  FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id()
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.current_app_role() = ANY (
      ARRAY[
        'admin',
        'direccion',
        'convivencia',
        'inspectoria',
        'inspector',
        'profesor_jefe',
        'teacher',
        'user',
        'staff'
      ]
    )
  );
-- ===== SOURCE END: supabase/migrations/20261009122000_align_causa_update_roles.sql =====

-- ===== SOURCE START: supabase/migrations/20261009124000_allow_text_convivencia_storage.sql =====
-- Permite almacenar evidencia de texto pegado en los documentos privados de convivencia.
-- Conserva los formatos existentes y el límite configurado del bucket.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/markdown',
  'text/plain'
]::text[]
WHERE id = 'documentos_convivencia';
-- ===== SOURCE END: supabase/migrations/20261009124000_allow_text_convivencia_storage.sql =====

-- ===== SOURCE START: supabase/migrations/20261010120000_add_teachers_roster.sql =====
/** @license SPDX-License-Identifier: Apache-2.0 */

CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, full_name)
);

CREATE INDEX IF NOT EXISTS teachers_tenant_idx
  ON public.teachers (tenant_id);

DROP TRIGGER IF EXISTS teachers_updated_at ON public.teachers;
CREATE TRIGGER teachers_updated_at
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teachers_select ON public.teachers;
CREATE POLICY teachers_select ON public.teachers
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.current_app_role() = 'superadmin');

DROP POLICY IF EXISTS teachers_write ON public.teachers;
CREATE POLICY teachers_write ON public.teachers
  FOR ALL TO authenticated
  USING (
    public.current_app_role() = 'superadmin'
    OR (tenant_id = public.current_tenant_id() AND public.current_app_role() IN ('admin', 'direccion'))
  )
  WITH CHECK (
    public.current_app_role() = 'superadmin'
    OR (tenant_id = public.current_tenant_id() AND public.current_app_role() IN ('admin', 'direccion'))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;
-- ===== SOURCE END: supabase/migrations/20261010120000_add_teachers_roster.sql =====

-- ===== SOURCE START: supabase/migrations/20261014090000_harden_pdf_duplicate_registration.sql =====
-- Prevent exact PDF re-registration under concurrent requests.
CREATE UNIQUE INDEX IF NOT EXISTS idx_disciplinary_files_tenant_hash
  ON public.disciplinary_process_files (tenant_id, file_hash)
  WHERE file_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.bulk_pdf_import_claims (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  file_hash text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (tenant_id, course_id, file_hash)
);

ALTER TABLE public.bulk_pdf_import_claims ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.claim_bulk_pdf_import(
  p_tenant_id uuid,
  p_course_id uuid,
  p_file_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_claimed_at timestamptz;
  v_completed_at timestamptz;
  v_inserted boolean;
BEGIN
  INSERT INTO public.bulk_pdf_import_claims (tenant_id, course_id, file_hash)
  VALUES (p_tenant_id, p_course_id, p_file_hash)
  ON CONFLICT (tenant_id, course_id, file_hash) DO NOTHING
  RETURNING true INTO v_inserted;

  IF v_inserted THEN
    RETURN true;
  END IF;

  SELECT claimed_at, completed_at
    INTO v_claimed_at, v_completed_at
    FROM public.bulk_pdf_import_claims
   WHERE tenant_id = p_tenant_id
     AND course_id = p_course_id
     AND file_hash = p_file_hash
   FOR UPDATE;

  IF v_completed_at IS NOT NULL THEN
    RETURN false;
  END IF;

  IF v_claimed_at > now() - interval '60 minutes' THEN
    RETURN false;
  END IF;

  UPDATE public.bulk_pdf_import_claims
     SET claimed_at = now()
   WHERE tenant_id = p_tenant_id AND course_id = p_course_id AND file_hash = p_file_hash;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_bulk_pdf_import(
  p_tenant_id uuid,
  p_course_id uuid,
  p_file_hash text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  UPDATE public.bulk_pdf_import_claims
     SET completed_at = now()
   WHERE tenant_id = p_tenant_id
     AND course_id = p_course_id
     AND file_hash = p_file_hash;
$function$;

CREATE OR REPLACE FUNCTION public.release_bulk_pdf_import(
  p_tenant_id uuid,
  p_course_id uuid,
  p_file_hash text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  DELETE FROM public.bulk_pdf_import_claims
   WHERE tenant_id = p_tenant_id
     AND course_id = p_course_id
     AND file_hash = p_file_hash
     AND completed_at IS NULL;
$function$;

REVOKE ALL ON FUNCTION public.claim_bulk_pdf_import(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_bulk_pdf_import(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_bulk_pdf_import(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_bulk_pdf_import(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_bulk_pdf_import(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_bulk_pdf_import(uuid, uuid, text) TO service_role;
-- ===== SOURCE END: supabase/migrations/20261014090000_harden_pdf_duplicate_registration.sql =====

-- ===== SOURCE START: supabase/migrations/20261016100000_harden_profile_privileges.sql =====
-- #1: un miembro podía ascenderse solo. La política profiles_update_consolidated
-- permite `user_id = auth.uid()` y current_app_role() lee justamente
-- profiles.role, así que un UPDATE propio con role='admin' se autorizaba a sí
-- mismo (y arrastraba app_memberships vía sync_convivencia_membership_from_profile).
--
-- Se protegen rol, colegio y vigencia con un trigger previo. Las rutas de
-- administración usan service_role (sin usuario en el JWT) y ya verifican el
-- rol, por lo que quedan exentas; handle_new_user sólo inserta user_id+email.

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) then
    raise exception 'Precondition failed: public.profiles must exist';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
  ) then
    raise exception 'Precondition failed: profiles.role must exist';
  end if;
end
$$;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_is_admin boolean;
begin
  -- Sin usuario autenticado el cambio viene de service_role o de un proceso
  -- interno (handle_new_user, rutas /api/admin y /api/platform).
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Alta inicial del perfil: sin rol ni colegio no hay privilegio que otorgar.
    if new.role is null and new.tenant_id is null then
      return new;
    end if;
  elsif new.role is not distinct from old.role
        and new.tenant_id is not distinct from old.tenant_id
        and new.is_active is not distinct from old.is_active then
    return new;
  end if;

  v_actor_is_admin :=
    public.current_app_role() = any (array['admin', 'direccion', 'superadmin'])
    or public.is_superuser();

  if not v_actor_is_admin then
    raise exception 'Solo administración puede cambiar rol, colegio o vigencia del perfil'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_privileges on public.profiles;
create trigger trg_profiles_protect_privileges
  before insert or update on public.profiles
  for each row
  execute function public.protect_profile_privileges();
-- ===== SOURCE END: supabase/migrations/20261016100000_harden_profile_privileges.sql =====

-- ===== SOURCE START: supabase/migrations/20261016110000_scope_staff_policies_by_tenant.sql =====
-- #2: las políticas de absences/tests/instant_messages sólo exigían
-- is_staff() (= current_role() in ('staff','superuser')), sin filtrar por
-- colegio: un staff de cualquier establecimiento leía las anotaciones,
-- ausencias y mensajes de todos los demás.
--
-- Se conserva la misma audiencia (staff) y se acota a las filas cuyo
-- estudiante o curso pertenece al colegio del usuario. Verificado antes de
-- aplicar: 0 filas de estas tablas quedan sin tenant por estudiante/curso
-- (absences 350/0, tests 300/0, instant_messages 21/0).

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'absences'
      and column_name = 'student_id'
  ) then
    raise exception 'Precondition failed: absences.student_id must exist';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tests'
      and column_name = 'course_id'
  ) then
    raise exception 'Precondition failed: tests.course_id must exist';
  end if;
end
$$;

-- absences → students.tenant_id
drop policy if exists p_absences_staff_select on public.absences;
create policy p_absences_staff_select on public.absences
  for select to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.students s
       where s.id = absences.student_id
         and s.tenant_id = public.current_tenant_id()
    )
  );

drop policy if exists p_absences_staff_insert on public.absences;
create policy p_absences_staff_insert on public.absences
  for insert to authenticated
  with check (
    public.is_staff()
    and exists (
      select 1 from public.students s
       where s.id = absences.student_id
         and s.tenant_id = public.current_tenant_id()
    )
  );

drop policy if exists p_absences_staff_update on public.absences;
create policy p_absences_staff_update on public.absences
  for update to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.students s
       where s.id = absences.student_id
         and s.tenant_id = public.current_tenant_id()
    )
  )
  with check (
    public.is_staff()
    and exists (
      select 1 from public.students s
       where s.id = absences.student_id
         and s.tenant_id = public.current_tenant_id()
    )
  );

-- tests → courses.tenant_id
drop policy if exists p_tests_staff_select on public.tests;
create policy p_tests_staff_select on public.tests
  for select to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.courses c
       where c.id = tests.course_id
         and c.tenant_id = public.current_tenant_id()
    )
  );

drop policy if exists p_tests_staff_insert on public.tests;
create policy p_tests_staff_insert on public.tests
  for insert to authenticated
  with check (
    public.is_staff()
    and exists (
      select 1 from public.courses c
       where c.id = tests.course_id
         and c.tenant_id = public.current_tenant_id()
    )
  );

drop policy if exists p_tests_staff_update on public.tests;
create policy p_tests_staff_update on public.tests
  for update to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.courses c
       where c.id = tests.course_id
         and c.tenant_id = public.current_tenant_id()
    )
  )
  with check (
    public.is_staff()
    and exists (
      select 1 from public.courses c
       where c.id = tests.course_id
         and c.tenant_id = public.current_tenant_id()
    )
  );

-- instant_messages → courses.tenant_id o students.tenant_id
drop policy if exists p_instant_messages_staff_select on public.instant_messages;
create policy p_instant_messages_staff_select on public.instant_messages
  for select to authenticated
  using (
    public.is_staff()
    and (
      exists (
        select 1 from public.courses c
         where c.id = instant_messages.course_id
           and c.tenant_id = public.current_tenant_id()
      )
      or exists (
        select 1 from public.students s
         where s.id = instant_messages.student_id
           and s.tenant_id = public.current_tenant_id()
      )
    )
  );

drop policy if exists p_instant_messages_staff_insert on public.instant_messages;
create policy p_instant_messages_staff_insert on public.instant_messages
  for insert to authenticated
  with check (
    public.is_staff()
    and (created_by is null or created_by = (select auth.uid()))
    and (
      exists (
        select 1 from public.courses c
         where c.id = instant_messages.course_id
           and c.tenant_id = public.current_tenant_id()
      )
      or exists (
        select 1 from public.students s
         where s.id = instant_messages.student_id
           and s.tenant_id = public.current_tenant_id()
      )
    )
  );

drop policy if exists p_instant_messages_staff_update on public.instant_messages;
create policy p_instant_messages_staff_update on public.instant_messages
  for update to authenticated
  using (
    public.is_staff()
    and (
      exists (
        select 1 from public.courses c
         where c.id = instant_messages.course_id
           and c.tenant_id = public.current_tenant_id()
      )
      or exists (
        select 1 from public.students s
         where s.id = instant_messages.student_id
           and s.tenant_id = public.current_tenant_id()
      )
    )
  )
  with check (
    public.is_staff()
    and (
      exists (
        select 1 from public.courses c
         where c.id = instant_messages.course_id
           and c.tenant_id = public.current_tenant_id()
      )
      or exists (
        select 1 from public.students s
         where s.id = instant_messages.student_id
           and s.tenant_id = public.current_tenant_id()
      )
    )
  );
-- ===== SOURCE END: supabase/migrations/20261016110000_scope_staff_policies_by_tenant.sql =====

-- ===== SOURCE START: supabase/migrations/20261016120000_revoke_anon_gmail_import_absence.sql =====
-- #3: create_gmail_import_absence quedó con EXECUTE para anon: con la
-- publishable key cualquiera podía crear ausencias y auditar en nombre del
-- importador de Gmail. La función es SECURITY DEFINER y escribe sin pasar por
-- RLS, así que el único control era ese grant.
--
-- Se revoca a anon y a PUBLIC. authenticated y service_role se conservan: el
-- importador (n8n) puede invocarla con cualquiera de los dos.

do $$
begin
  if exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'create_gmail_import_absence'
  ) then
    execute 'revoke all on function public.create_gmail_import_absence(uuid, uuid, date, date, text, text, text, numeric, jsonb) from anon';
    execute 'revoke all on function public.create_gmail_import_absence(uuid, uuid, date, date, text, text, text, numeric, jsonb) from public';
  end if;
end
$$;
-- ===== SOURCE END: supabase/migrations/20261016120000_revoke_anon_gmail_import_absence.sql =====

-- ===== SOURCE START: supabase/migrations/20261016130000_next_causa_correlativo.sql =====
-- #5: causas.id es PK global (RLS sólo expone el colegio propio), así que el
-- correlativo calculado en el cliente con los ids visibles choca casi siempre
-- con los de otro colegio y, con 25 intentos, un colegio nuevo no podía crear
-- causas.
--
-- Esta función entrega el siguiente correlativo global del año para arrancar el
-- reintento con el id correcto (el cliente la usa como primer salto ante un
-- 23505). Entrega sólo un contador, no datos de otros colegios.

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'causas'
  ) then
    raise exception 'Precondition failed: public.causas must exist';
  end if;
end
$$;

create or replace function public.next_causa_correlativo(p_year integer)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select 'DC-' || p_year::text || '-' ||
         lpad(
           (
             coalesce(
               max((regexp_match(id, '(\d+)$'))[1]::integer),
               0
             ) + 1
           )::text,
           3,
           '0'
         )
    from public.causas
   where id ~ ('^DC-' || p_year::text || '-\d+$')
$$;

revoke all on function public.next_causa_correlativo(integer) from public, anon, authenticated;
grant execute on function public.next_causa_correlativo(integer) to authenticated;
-- ===== SOURCE END: supabase/migrations/20261016130000_next_causa_correlativo.sql =====

-- ===== SOURCE START: supabase/migrations/20261016140000_fix_atomic_confirm_date_and_basis.sql =====
-- #4 + #14: confirm_disciplinary_process_atomic escribía
--   · inspectorate_records.date_time = detected_date::timestamptz, o sea a las
--     00:00 UTC (la anotación aparecía el día anterior en Chile y desordenaba
--     el expediente); el flujo masivo del cliente ya usaba 12:00Z.
--   · cartas_disciplinarias.regulation_basis = 'RICE 2026 - ...' fijo, aunque el
--     servidor atiende a todos los colegios.
--
-- Se reemplaza la función con la fecha a las 12:00 y la base legal del
-- reglamento vigente del colegio (mismo criterio que
-- src/shared/api/services/institution.service.ts).

do $$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'confirm_disciplinary_process_atomic'
  ) then
    raise exception 'Precondition failed: confirm_disciplinary_process_atomic must exist';
  end if;
end
$$;

CREATE OR REPLACE FUNCTION public.confirm_disciplinary_process_atomic(
  p_tenant_id uuid,
  p_student_id uuid,
  p_suggested_letter_type text,
  p_file_name text,
  p_storage_path text,
  p_file_size integer,
  p_mime_type text,
  p_file_hash text,
  p_bucket text,
  p_original_file_name text,
  p_stored_file_name text,
  p_analysis_version text,
  p_annotations jsonb,
  p_total_negativas integer,
  p_total_positivas integer,
  p_total_informativas integer,
  p_confirmed_by uuid DEFAULT NULL
)
RETURNS TABLE(
  process_id uuid,
  process_number text,
  inserted_negativas integer,
  inserted_positivas integer,
  inserted_informativas integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_process_id uuid;
  v_process_number text;
  v_student_name text;
  v_course_id uuid;
  v_course_name text;
  v_letter_type text;
  v_stage_name text;
  v_step_number integer;
  v_regulation_basis text;
BEGIN
  IF p_tenant_id IS NULL OR p_student_id IS NULL THEN
    RAISE EXCEPTION 'Tenant y estudiante son obligatorios';
  END IF;

  SELECT s.full_name, s.course_id, c.name
    INTO v_student_name, v_course_id, v_course_name
    FROM public.students s
    LEFT JOIN public.courses c ON c.id = s.course_id AND c.tenant_id = p_tenant_id
   WHERE s.id = p_student_id
     AND s.tenant_id = p_tenant_id;

  IF v_student_name IS NULL THEN
    RAISE EXCEPTION 'El estudiante no pertenece al establecimiento activo';
  END IF;

  SELECT public.generate_process_number(p_tenant_id) INTO v_process_number;
  IF v_process_number IS NULL OR v_process_number = '' THEN
    RAISE EXCEPTION 'No fue posible generar el número de proceso';
  END IF;

  -- Base legal del colegio: título + versión de su reglamento publicado.
  SELECT nullif(
           trim(
             CASE
               WHEN rv.version IS NULL OR trim(rv.version) = '' THEN rv.title
               ELSE rv.title || ' ' || rv.version
             END
           ),
           ''
         )
    INTO v_regulation_basis
    FROM public.institution_rule_versions rv
   WHERE rv.tenant_id = p_tenant_id
     AND rv.status = 'active'
   ORDER BY rv.updated_at DESC
   LIMIT 1;

  v_regulation_basis := coalesce(
    v_regulation_basis,
    'Reglamento Interno de Convivencia Escolar (RICE)'
  ) || ' - Registro de anotaciones y debido proceso';

  INSERT INTO public.disciplinary_processes (
    student_id, process_number, status, tenant_id, suggested_letter_type,
    total_negativas, total_positivas, total_informativas, is_completed, created_by
  ) VALUES (
    p_student_id, v_process_number, 'draft', p_tenant_id, coalesce(p_suggested_letter_type, 'none'),
    coalesce(p_total_negativas, 0), coalesce(p_total_positivas, 0),
    coalesce(p_total_informativas, 0), false, p_confirmed_by
  ) RETURNING id INTO v_process_id;

  INSERT INTO public.disciplinary_process_files (
    process_id, file_name, storage_path, file_size, mime_type, file_hash,
    tenant_id, bucket, original_file_name, stored_file_name, processing_status,
    analysis_version, student_id, uploaded_by
  ) VALUES (
    v_process_id, p_file_name, p_storage_path, coalesce(p_file_size, 0),
    coalesce(p_mime_type, 'application/pdf'), p_file_hash, p_tenant_id,
    coalesce(p_bucket, 'disciplinary-processes'), p_original_file_name,
    p_stored_file_name, 'confirmed', p_analysis_version, p_student_id, p_confirmed_by
  );

  INSERT INTO public.disciplinary_annotations_detected (
    process_id, student_id, annotation_type, annotation_text, page_number,
    position_in_page, annotation_date, teacher_name, line_number, tenant_id,
    raw_text, normalized_text, category, classification_method, confidence,
    parser_version, confirmed_annotation_type
  )
  SELECT
    v_process_id,
    p_student_id,
    CASE a.type WHEN 'negative' THEN 'Negativa' WHEN 'positive' THEN 'Positiva' ELSE 'Información' END,
    a.raw_text,
    a.page_number,
    coalesce(a.sequence_number, row_number() OVER ()),
    a.detected_date,
    a.detected_teacher,
    coalesce(a.sequence_number, row_number() OVER ()),
    p_tenant_id,
    a.raw_text,
    coalesce(a.normalized_text, lower(a.raw_text)),
    a.type,
    'regex',
    coalesce(a.confidence, 0.8),
    p_analysis_version,
    a.type
  FROM jsonb_to_recordset(coalesce(p_annotations, '[]'::jsonb)) AS a(
    raw_text text,
    normalized_text text,
    type text,
    page_number integer,
    sequence_number integer,
    detected_date date,
    detected_teacher text,
    confidence numeric
  );

  INSERT INTO public.inspectorate_records (
    student_id, tenant_id, date_time, observation, severity, type,
    registered_by, created_by, pdf_file_path
  )
  SELECT
    p_student_id,
    p_tenant_id,
    -- Mediodía UTC: evita que la anotación caiga el día anterior en Chile.
    coalesce((a.detected_date + time '12:00')::timestamptz, now()),
    a.raw_text,
    CASE a.type WHEN 'negative' THEN 'Leve' WHEN 'positive' THEN 'Leve' ELSE 'Leve' END,
    CASE a.type WHEN 'negative' THEN 'Negativa' WHEN 'positive' THEN 'Positiva' ELSE 'Información' END,
    'PDF Convivencia Escolar',
    'Sistema PDF',
    p_storage_path
  FROM jsonb_to_recordset(coalesce(p_annotations, '[]'::jsonb)) AS a(
    raw_text text,
    type text,
    detected_date date
  )
  WHERE NOT EXISTS (
    SELECT 1
      FROM public.inspectorate_records ir
     WHERE ir.tenant_id = p_tenant_id
       AND ir.student_id = p_student_id
       AND ir.observation = a.raw_text
       AND ir.type = CASE a.type WHEN 'negative' THEN 'Negativa' WHEN 'positive' THEN 'Positiva' ELSE 'Información' END
  );

  v_letter_type := CASE p_suggested_letter_type
    WHEN 'amonestacion' THEN 'Amonestación Escrita'
    WHEN 'compromiso' THEN 'Carta de Compromiso Conductual'
    WHEN 'compromiso_conductual' THEN 'Carta de Compromiso Conductual'
    WHEN 'derivacion' THEN 'Ficha de Derivación'
    ELSE NULL
  END;

  IF v_letter_type IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cartas_disciplinarias
     WHERE tenant_id = p_tenant_id AND student_id = p_student_id
       AND observations ILIKE '%' || v_process_id::text || '%'
  ) THEN
    INSERT INTO public.cartas_disciplinarias (
      student_id, tenant_id, letter_type, emission_date, status, emitted_by,
      apoderado_name, annotations_count, student_name, course, regulation_basis,
      observations, created_by
    ) VALUES (
      p_student_id, p_tenant_id, v_letter_type, current_date, 'Vigente',
      'Convivencia Escolar', 'Por definir', coalesce(p_total_negativas, 0),
      v_student_name, coalesce(v_course_name, 'Sin curso'),
      v_regulation_basis,
      format('Proceso PDF %s (%s). Documento sugerido automáticamente desde PDF confirmado.', v_process_number, v_process_id),
      'Sistema PDF'
    );
  END IF;

  v_stage_name := CASE p_suggested_letter_type
    WHEN 'amonestacion' THEN 'amonestacion'
    WHEN 'compromiso' THEN 'compromiso'
    WHEN 'compromiso_conductual' THEN 'compromiso'
    WHEN 'derivacion' THEN 'derivacion'
    ELSE NULL
  END;
  v_step_number := CASE v_stage_name WHEN 'amonestacion' THEN 1 WHEN 'compromiso' THEN 2 WHEN 'derivacion' THEN 3 ELSE NULL END;

  IF v_stage_name IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.etapas_disciplinarias
     WHERE tenant_id = p_tenant_id AND student_id = p_student_id
       AND stage_name = v_stage_name AND comment ILIKE '%' || v_process_id::text || '%'
  ) THEN
    INSERT INTO public.etapas_disciplinarias (
      student_id, tenant_id, step_number, stage_name, responsible, comment, created_by
    ) VALUES (
      p_student_id, p_tenant_id, v_step_number, v_stage_name,
      'Convivencia Escolar',
      format('Proceso PDF %s (%s). Etapa sugerida automáticamente desde PDF confirmado.', v_process_number, v_process_id),
      'Sistema PDF'
    );
  END IF;

  INSERT INTO public.document_analyses (
    student_id, file_name, negativas, positivas, informativas, tenant_id,
    status, process_id, file_hash, parser_version, confirmed_at, confirmed_by
  ) VALUES (
    p_student_id, p_file_name, coalesce(p_total_negativas, 0),
    coalesce(p_total_positivas, 0), coalesce(p_total_informativas, 0),
    p_tenant_id, 'confirmed', v_process_id, p_file_hash, p_analysis_version,
    now(), p_confirmed_by
  );

  RETURN QUERY SELECT
    v_process_id,
    v_process_number,
    coalesce(p_total_negativas, 0),
    coalesce(p_total_positivas, 0),
    coalesce(p_total_informativas, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_disciplinary_process_atomic(
  uuid, uuid, text, text, text, integer, text, text, text, text, text, text,
  jsonb, integer, integer, integer, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_disciplinary_process_atomic(
  uuid, uuid, text, text, text, integer, text, text, text, text, text, text,
  jsonb, integer, integer, integer, uuid
) TO service_role;
-- ===== SOURCE END: supabase/migrations/20261016140000_fix_atomic_confirm_date_and_basis.sql =====

-- ===== SOURCE START: supabase/migrations/20261016150000_usage_events_tenant_scope.sql =====
-- #8: usage_events no tenía tenant_id. La ruta /api/usage/log ya insertaba la
-- columna (el INSERT fallaba con "column does not exist" y el evento se
-- perdía), y la política de SELECT dejaba que un admin/dirección leyera los
-- eventos de todos los colegios.
--
-- Se agrega tenant_id, se rellena desde el perfil del usuario y se acotan la
-- política de SELECT y las RPC de estadísticas al colegio propio.
-- Verificado antes de aplicar: 2 eventos, 0 sin tenant resoluble.

alter table public.usage_events add column if not exists tenant_id uuid;

update public.usage_events e
   set tenant_id = p.tenant_id
  from public.profiles p
 where p.user_id = e.user_id
   and e.tenant_id is null;

create index if not exists idx_usage_events_tenant_created
  on public.usage_events (tenant_id, created_at);

drop policy if exists usage_events_insert_own on public.usage_events;
create policy usage_events_insert_own on public.usage_events
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (tenant_id is null or tenant_id = public.current_tenant_id())
  );

drop policy if exists usage_events_select_admin on public.usage_events;
create policy usage_events_select_admin on public.usage_events
  for select to authenticated
  using (
    public.current_app_role() = any (array['admin', 'direccion'])
    and tenant_id = public.current_tenant_id()
  );

-- Las RPC agregaban sin filtrar por colegio. Se reemplazan por versiones que
-- reciben el tenant (las llama el servidor con service_role).

drop function if exists public.get_usage_stats(timestamptz, timestamptz);
create function public.get_usage_stats(
  p_tenant_id uuid,
  since timestamptz default (now() - '30 days'::interval),
  until timestamptz default now()
)
returns table(
  event_name text,
  total_count bigint,
  unique_users bigint,
  last_occurrence timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select e.event_name,
         count(*)::bigint as total_count,
         count(distinct e.user_id)::bigint as unique_users,
         max(e.created_at) as last_occurrence
    from public.usage_events e
   where e.tenant_id = p_tenant_id
     and e.created_at >= since
     and e.created_at <= until
   group by e.event_name
   order by count(*) desc
$$;

revoke all on function public.get_usage_stats(uuid, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_usage_stats(uuid, timestamptz, timestamptz)
  to service_role;

drop function if exists public.get_daily_active_users(timestamptz, timestamptz);
create function public.get_daily_active_users(
  p_tenant_id uuid,
  since timestamptz default (now() - '30 days'::interval),
  until timestamptz default now()
)
returns table(date date, active_users bigint)
language sql
stable
security definer
set search_path to 'public'
as $$
  select e.created_at::date as date,
         count(distinct e.user_id)::bigint as active_users
    from public.usage_events e
   where e.tenant_id = p_tenant_id
     and e.created_at >= since
     and e.created_at <= until
     and e.user_id is not null
   group by e.created_at::date
   order by 1
$$;

revoke all on function public.get_daily_active_users(uuid, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_daily_active_users(uuid, timestamptz, timestamptz)
  to service_role;
-- ===== SOURCE END: supabase/migrations/20261016150000_usage_events_tenant_scope.sql =====

-- ===== SOURCE START: supabase/migrations/20261016160000_students_tenant_rut_unique.sql =====
-- #13: la deduplicación de la importación de alumnos (RUT por colegio) sólo
-- confiaba en la consulta previa; sin índice único, dos importaciones
-- concurrentes podían crear el mismo estudiante dos veces.
-- Verificado antes de aplicar: 0 grupos duplicados por (tenant_id, rut) sobre
-- 809 filas con RUT.

do $$
declare
  v_dup_groups integer;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'students'
      and column_name = 'rut'
  ) then
    raise exception 'Precondition failed: students.rut must exist';
  end if;

  select count(*) into v_dup_groups
    from (
      select tenant_id, rut
        from public.students
       where rut is not null and rut <> ''
       group by tenant_id, rut
      having count(*) > 1
    ) d;

  if v_dup_groups > 0 then
    raise exception 'Hay % RUT duplicados por colegio en students: resolverlos antes de crear el índice único', v_dup_groups;
  end if;
end
$$;

create unique index if not exists students_tenant_rut_key
  on public.students (tenant_id, rut)
  where rut is not null and rut <> '';
-- ===== SOURCE END: supabase/migrations/20261016160000_students_tenant_rut_unique.sql =====

-- ===== SOURCE START: supabase/migrations/20261017183735_close_audit_authorization_gaps.sql =====
-- Cierra los huecos de autorización detectados en la auditoría integral.
-- La aplicación sigue ocultando acciones según rol, pero la RLS es la barrera
-- efectiva ante llamadas directas al API de Supabase.

create or replace function public.current_tenant_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant_id uuid;
begin
  if auth.uid() is null then
    return null;
  end if;

  select p.tenant_id
    into v_tenant_id
  from public.profiles p
  where p.user_id = auth.uid()
    and p.is_active = true
    and exists (
      select 1
      from public.app_memberships m
      join public.applications a on a.code = m.application_code
      where m.user_id = p.user_id
        and m.tenant_id = p.tenant_id
        and m.is_active = true
        and a.is_active = true
    )
  limit 1;

  return v_tenant_id;
end;
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.role
  from public.profiles p
  where p.user_id = auth.uid()
    and p.is_active = true
    and p.tenant_id = public.current_tenant_id()
  limit 1;
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_app_role(), 'teacher');
$$;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_role text;
  v_is_superadmin boolean;
begin
  -- Service role y procesos internos no llevan auth.uid().
  if auth.uid() is null then
    return new;
  end if;

  v_actor_role := public.current_app_role();
  v_is_superadmin := v_actor_role = 'superadmin' or public.is_superuser();

  if v_is_superadmin then
    return new;
  end if;

  if v_actor_role not in ('admin', 'direccion') then
    if tg_op = 'UPDATE'
       and new.role is not distinct from old.role
       and new.tenant_id is not distinct from old.tenant_id
       and new.is_active is not distinct from old.is_active then
      return new;
    end if;
    raise exception 'Solo administración puede cambiar privilegios del perfil'
      using errcode = '42501';
  end if;

  if new.role = 'superadmin' then
    raise exception 'Solo un superadmin puede asignar el rol superadmin'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.tenant_id is distinct from old.tenant_id then
    raise exception 'La administración local no puede mover perfiles de colegio'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop policy if exists "causas_tenant_insert" on public.causas;
create policy "causas_tenant_insert" on public.causas
  for insert
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array[
      'admin','direccion','convivencia','inspectoria','inspector','staff'
    ])
  );

drop policy if exists "causas_tenant_update" on public.causas;
create policy "causas_tenant_update" on public.causas
  for update
  using (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array[
      'admin','direccion','convivencia','inspectoria','inspector','staff'
    ])
  )
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array[
      'admin','direccion','convivencia','inspectoria','inspector','staff'
    ])
  );

drop policy if exists "checklist_tenant_insert" on public.checklist_items;
create policy "checklist_tenant_insert" on public.checklist_items
  for insert with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array[
      'admin','direccion','convivencia','inspectoria','inspector','staff'
    ])
  );

drop policy if exists "checklist_tenant_update" on public.checklist_items;
create policy "checklist_tenant_update" on public.checklist_items
  for update
  using (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array[
      'admin','direccion','convivencia','inspectoria','inspector','staff'
    ])
  )
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array[
      'admin','direccion','convivencia','inspectoria','inspector','staff'
    ])
  );

drop policy if exists "inspectorate_tenant_insert" on public.inspectorate_records;
create policy "inspectorate_tenant_insert" on public.inspectorate_records
  for insert with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array[
      'admin','direccion','convivencia','inspectoria','inspector','staff'
    ])
  );

drop policy if exists "inspectorate_tenant_update" on public.inspectorate_records;
create policy "inspectorate_tenant_update" on public.inspectorate_records
  for update
  using (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array[
      'admin','direccion','convivencia','inspectoria','inspector','staff'
    ])
  )
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (array[
      'admin','direccion','convivencia','inspectoria','inspector','staff'
    ])
  );

-- Gmail imports pertenecía a un esquema compartido sin tenant_id. Las filas
-- antiguas quedan deliberadamente fuera de la vista hasta ser etiquetadas por
-- el proceso de ingestión dueño de Inasistencias.
alter table if exists public.gmail_imports
  add column if not exists tenant_id uuid;

drop policy if exists "p_gmail_imports_staff_select" on public.gmail_imports;
create policy "p_gmail_imports_staff_select" on public.gmail_imports
  for select to authenticated
  using (
    public.is_staff()
    and tenant_id = public.current_tenant_id()
  );

drop policy if exists "p_gmail_imports_superuser_delete" on public.gmail_imports;
create policy "p_gmail_imports_superuser_delete" on public.gmail_imports
  for delete to authenticated
  using (
    public.is_superuser()
    and tenant_id = public.current_tenant_id()
  );

create or replace function public.ignore_gmail_import(p_import_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_staff() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.gmail_imports
  set status = 'IGNORED', error_message = 'Ignorada manualmente',
      reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_import_id
    and tenant_id = public.current_tenant_id()
    and status in ('PENDING', 'NEEDS_REVIEW', 'ERROR');
end;
$$;

create or replace function public.retry_gmail_import(p_import_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_staff() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.gmail_imports
  set status = 'PENDING', error_message = null,
      reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_import_id
    and tenant_id = public.current_tenant_id()
    and status = 'ERROR';
end;
$$;

create or replace function public.approve_gmail_import(
  p_import_id uuid,
  p_student_id uuid,
  p_start_date date,
  p_end_date date
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_import public.gmail_imports;
  v_absence_id uuid;
begin
  if not public.is_staff() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'invalid dates' using errcode = '22023';
  end if;

  select * into v_import
  from public.gmail_imports
  where id = p_import_id
    and tenant_id = public.current_tenant_id()
  for update;

  if not found then
    raise exception 'import not found' using errcode = 'P0002';
  end if;
  if v_import.status not in ('PENDING', 'NEEDS_REVIEW', 'ERROR') then
    raise exception 'import is not reviewable' using errcode = '55000';
  end if;
  if not exists (
    select 1 from public.students s
    where s.id = p_student_id
      and s.tenant_id = public.current_tenant_id()
  ) then
    raise exception 'student not found in current tenant' using errcode = '42501';
  end if;

  insert into public.absences (
    student_id, start_date, end_date, observation, document_url, status
  ) values (
    p_student_id, p_start_date, p_end_date,
    coalesce(v_import.extracted_data ->> 'reason', 'Importación desde Gmail'),
    v_import.document_path,
    case when v_import.document_path is null then 'PENDIENTE' else 'JUSTIFICADA' end
  ) returning id into v_absence_id;

  update public.gmail_imports
  set status = 'CREATED', absence_id = v_absence_id,
      reviewed_by = auth.uid(), reviewed_at = now(), error_message = null
  where id = p_import_id
    and tenant_id = public.current_tenant_id();

  insert into public.audit_logs (
    table_name, record_id, action, new_data, changed_by, performed_by, metadata
  ) values (
    'absences', v_absence_id, 'CREATE',
    jsonb_build_object('source', 'gmail_import', 'import_id', p_import_id),
    auth.uid(), auth.uid(), jsonb_build_object('gmail_import_id', p_import_id)
  );

  return v_absence_id;
end;
$$;

-- El borrado de un expediente y sus snapshots debe ser una sola transacción.
create or replace function public.delete_causa_cascade(p_causa_id text)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  if public.current_app_role() <> all (array['admin', 'direccion', 'superadmin']) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.causas
    where id = p_causa_id and tenant_id = public.current_tenant_id()
  ) then
    return false;
  end if;

  delete from public.bitacora_entries
  where causa_id = p_causa_id and tenant_id = public.current_tenant_id();
  delete from public.checklist_items
  where causa_id = p_causa_id and tenant_id = public.current_tenant_id();
  delete from public.causa_documents
  where causa_id = p_causa_id and tenant_id = public.current_tenant_id();
  delete from public.causas
  where id = p_causa_id and tenant_id = public.current_tenant_id();

  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
end;
$$;

revoke all on function public.delete_causa_cascade(text) from public;
grant execute on function public.delete_causa_cascade(text) to authenticated;
-- ===== SOURCE END: supabase/migrations/20261017183735_close_audit_authorization_gaps.sql =====

-- ===== SOURCE START: supabase/migrations/20261017204034_backfill_gmail_import_tenant.sql =====
-- Etiqueta importaciones Gmail históricas que fueron ingeridas antes del
-- aislamiento por tenant. Se detiene si la evidencia no identifica un único
-- tenant con ausencias, para no asignar datos entre colegios por conjetura.
do $$
declare
  v_tenant_id uuid;
  v_tenant_count integer;
begin
  if not exists (
    select 1
    from public.gmail_imports
    where tenant_id is null
  ) then
    return;
  end if;

  select count(distinct s.tenant_id)::integer
    into v_tenant_count
  from public.absences a
  join public.students s on s.id = a.student_id
  where s.tenant_id is not null;

  if v_tenant_count <> 1 then
    raise exception
      'No se puede etiquetar Gmail: se esperaban ausencias de un único tenant, se encontraron %',
      v_tenant_count;
  end if;

  select s.tenant_id
    into v_tenant_id
  from public.absences a
  join public.students s on s.id = a.student_id
  where s.tenant_id is not null
  limit 1;

  update public.gmail_imports
  set tenant_id = v_tenant_id,
      updated_at = now()
  where tenant_id is null;
end;
$$;
-- ===== SOURCE END: supabase/migrations/20261017204034_backfill_gmail_import_tenant.sql =====

-- ===== SOURCE START: supabase/migrations/20261017221534_audit_events_hash_chain.sql =====
-- Encadena los eventos de auditoría para detectar alteraciones posteriores.
-- No invalida ni reescribe eventos históricos: solo protege los nuevos.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.audit_events
  ADD COLUMN IF NOT EXISTS previous_hash text,
  ADD COLUMN IF NOT EXISTS event_hash text;

CREATE OR REPLACE FUNCTION public.stamp_audit_event_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  previous_event public.audit_events%ROWTYPE;
  canonical_payload text;
BEGIN
  SELECT *
    INTO previous_event
    FROM public.audit_events
   WHERE tenant_id = NEW.tenant_id
   ORDER BY occurred_at DESC, id DESC
   LIMIT 1;

  NEW.previous_hash := previous_event.event_hash;
  canonical_payload := concat_ws(
    '|',
    NEW.id::text,
    NEW.tenant_id::text,
    NEW.actor_user_id::text,
    NEW.action,
    NEW.entity_type,
    NEW.entity_id,
    coalesce(NEW.previous_values::text, ''),
    coalesce(NEW.new_values::text, ''),
    NEW.occurred_at::text,
    coalesce(NEW.previous_hash, '')
  );
  NEW.event_hash := encode(digest(canonical_payload, 'sha256'), 'hex');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_events_stamp_hash ON public.audit_events;
CREATE TRIGGER audit_events_stamp_hash
BEFORE INSERT ON public.audit_events
FOR EACH ROW
EXECUTE FUNCTION public.stamp_audit_event_hash();

COMMENT ON COLUMN public.audit_events.previous_hash IS
  'Hash SHA-256 del evento anterior del mismo tenant; null para el primer evento nuevo sin cadena histórica.';
COMMENT ON COLUMN public.audit_events.event_hash IS
  'Hash SHA-256 del evento y previous_hash; permite detectar alteraciones posteriores.';

CREATE OR REPLACE FUNCTION public.verify_audit_event_chain(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  current_event public.audit_events%ROWTYPE;
  expected_previous_hash text;
  canonical_payload text;
  expected_hash text;
BEGIN
  FOR current_event IN
    SELECT *
      FROM public.audit_events
     WHERE tenant_id = p_tenant_id
       AND event_hash IS NOT NULL
     ORDER BY occurred_at ASC, id ASC
  LOOP
    IF current_event.previous_hash IS DISTINCT FROM expected_previous_hash THEN
      RETURN false;
    END IF;
    canonical_payload := concat_ws(
      '|',
      current_event.id::text,
      current_event.tenant_id::text,
      current_event.actor_user_id::text,
      current_event.action,
      current_event.entity_type,
      current_event.entity_id,
      coalesce(current_event.previous_values::text, ''),
      coalesce(current_event.new_values::text, ''),
      current_event.occurred_at::text,
      coalesce(current_event.previous_hash, '')
    );
    expected_hash := encode(digest(canonical_payload, 'sha256'), 'hex');
    IF current_event.event_hash IS DISTINCT FROM expected_hash THEN
      RETURN false;
    END IF;
    expected_previous_hash := current_event.event_hash;
  END LOOP;
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.verify_audit_event_chain(uuid) IS
  'Verifica la cadena SHA-256 de audit_events de un tenant sin modificar datos.';

REVOKE ALL ON FUNCTION public.stamp_audit_event_hash() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_audit_event_chain(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_audit_event_chain(uuid) TO service_role;
-- ===== SOURCE END: supabase/migrations/20261017221534_audit_events_hash_chain.sql =====

-- ===== SOURCE START: supabase/migrations/20261017221547_restrict_audit_hash_functions.sql =====
-- Las funciones de la cadena solo deben ser ejecutables por service_role.
REVOKE EXECUTE ON FUNCTION public.stamp_audit_event_hash() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_audit_event_chain(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_audit_event_chain(uuid) TO service_role;
-- ===== SOURCE END: supabase/migrations/20261017221547_restrict_audit_hash_functions.sql =====

-- ===== SOURCE START: supabase/migrations/20261022120000_reject_unverified_profile_privileges.sql =====
-- A01: propuesta local para objetos compartidos. Requiere coordinación con
-- Inasistencias y aprobación antes de aplicarse fuera del entorno aislado.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_role text;
  v_actor_tenant uuid;
  v_database_role text := current_setting('role', true);
  v_admin_membership boolean;
begin
  if auth.uid() is null then
    -- La ausencia de sub no acredita por sí sola una operación interna.
    if v_database_role = 'service_role'
       or (v_database_role in ('none', 'postgres', 'supabase_admin', 'supabase_auth_admin')
           and session_user in ('postgres', 'supabase_admin', 'supabase_auth_admin')) then
      return new;
    end if;
    raise exception 'Se requiere una identidad autorizada para modificar perfiles'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception 'No se puede reasignar la identidad de un perfil'
        using errcode = '42501';
    end if;
    if new.role is not distinct from old.role
       and new.tenant_id is not distinct from old.tenant_id
       and new.is_active is not distinct from old.is_active then
      return new;
    end if;
  elsif new.user_id = auth.uid() and new.role is null and new.tenant_id is null then
    return new;
  end if;

  v_actor_role := public.current_app_role();
  v_actor_tenant := public.current_tenant_id();
  select exists (
    select 1
    from public.app_memberships m
    join public.applications a on a.code = m.application_code and a.is_active
    where m.user_id = auth.uid() and m.tenant_id = v_actor_tenant and m.is_active
      and m.role = any (case when v_actor_role = 'superadmin'
        then array['superadmin'] else array['admin', 'direccion'] end)
  ) into v_admin_membership;

  if coalesce(v_actor_role, '') not in ('admin', 'direccion', 'superadmin')
     or not v_admin_membership then
    raise exception 'Solo administración activa puede cambiar privilegios del perfil'
      using errcode = '42501';
  end if;
  if v_actor_role = 'superadmin' then
    return new;
  end if;
  if new.role = 'superadmin' or (tg_op = 'UPDATE' and old.role = 'superadmin') then
    raise exception 'Solo un superadmin puede modificar privilegios de superadmin'
      using errcode = '42501';
  end if;
  if new.tenant_id is distinct from v_actor_tenant
     or (tg_op = 'UPDATE' and old.tenant_id is distinct from v_actor_tenant) then
    raise exception 'La administración local solo puede gestionar su colegio'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.sync_convivencia_membership_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' then
    if old.tenant_id is not distinct from new.tenant_id
       and old.user_id is not distinct from new.user_id
       and old.role is not distinct from new.role
       and old.is_active is not distinct from new.is_active then
      return new;
    end if;
    if old.tenant_id is distinct from new.tenant_id or old.user_id is distinct from new.user_id then
      update public.app_memberships set is_active = false, updated_at = now()
      where tenant_id = old.tenant_id and user_id = old.user_id and application_code = 'convivencia';
    end if;
  end if;

  if new.tenant_id is not null and new.role in (
    'superadmin', 'admin', 'direccion', 'convivencia', 'inspectoria',
    'profesor_jefe', 'teacher', 'inspector', 'user', 'staff'
  ) then
    insert into public.app_memberships as membership (tenant_id, user_id, application_code, role, is_active)
    values (new.tenant_id, new.user_id, 'convivencia', new.role, new.is_active)
    on conflict (tenant_id, user_id, application_code) do update set
      role = excluded.role,
      -- Una revocación se levanta explícitamente desde administración, no al sincronizar un perfil.
      is_active = membership.is_active and excluded.is_active,
      updated_at = now();
  else
    update public.app_memberships set is_active = false, updated_at = now()
    where tenant_id = new.tenant_id and user_id = new.user_id and application_code = 'convivencia';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_convivencia_membership on public.profiles;
create trigger trg_sync_convivencia_membership
after insert or update of tenant_id, user_id, role, is_active on public.profiles
for each row execute function public.sync_convivencia_membership_from_profile();
-- ===== SOURCE END: supabase/migrations/20261022120000_reject_unverified_profile_privileges.sql =====

-- ===== SOURCE START: supabase/migrations/20261022130000_authorize_causas_by_convivencia_membership.sql =====
-- A04: membresía de Convivencia como autoridad del expediente (ADR-0009).
-- No cambia los resolutores de identidad compartidos con Inasistencias.
create or replace function public.current_convivencia_role()
returns text language sql stable security definer
set search_path = public, pg_temp
as $$
  select m.role
  from public.profiles p
  join public.app_memberships m on m.user_id = p.user_id and m.tenant_id = p.tenant_id
  join public.applications a on a.code = m.application_code
  where p.user_id = auth.uid() and p.is_active and m.is_active and a.is_active
    and m.application_code = 'convivencia'
  limit 1;
$$;
alter function public.current_convivencia_role() owner to postgres;
revoke all on function public.current_convivencia_role() from public, anon;
grant execute on function public.current_convivencia_role() to authenticated, service_role;

do $$
declare target record; operation text; policy_name text;
  tenant_condition text := 'tenant_id = public.current_tenant_id()';
  read_condition text := 'public.current_convivencia_role() is not null';
  write_condition text := 'public.current_convivencia_role() = any (array[''superadmin'',''admin'',''direccion'',''convivencia'',''inspectoria'',''inspector'',''staff''])';
  admin_condition text := 'public.current_convivencia_role() = any (array[''superadmin'',''admin'',''direccion''])';
begin
  for target in select * from (values
    ('incidentes', 'incidentes'), ('causas', 'causas'),
    ('checklist_items', 'checklist'), ('bitacora_entries', 'bitacora'),
    ('checklist_progress_entries', 'checklist_progress'), ('causa_documents', 'causa_documents')
  ) as tables(table_name, policy_prefix) loop
    foreach operation in array array['select','insert','update','delete'] loop
      policy_name := target.policy_prefix || '_tenant_' || operation;
      execute format('drop policy if exists %I on public.%I', policy_name, target.table_name);
      case operation
        when 'select' then
          execute format('create policy %I on public.%I for select to authenticated using (%s and %s)', policy_name, target.table_name, tenant_condition, read_condition);
        when 'insert' then
          execute format('create policy %I on public.%I for insert to authenticated with check (%s and %s)', policy_name, target.table_name, tenant_condition, write_condition);
        when 'update' then
          execute format('create policy %I on public.%I for update to authenticated using (%s and %s) with check (%s and %s)', policy_name, target.table_name, tenant_condition, write_condition, tenant_condition, write_condition);
        when 'delete' then
          execute format('create policy %I on public.%I for delete to authenticated using (%s and %s)', policy_name, target.table_name, tenant_condition, admin_condition);
      end case;
    end loop;
  end loop;
end $$;

create or replace function public.protect_causa_reopen()
returns trigger language plpgsql security invoker
set search_path = public, pg_temp
as $$
begin
  if old.estado_actual = 'Causa Cerrada' and new.estado_actual <> old.estado_actual
     and current_user not in ('postgres', 'supabase_admin', 'service_role')
     and coalesce(public.current_convivencia_role(), '') not in ('superadmin','admin','direccion') then
    raise exception 'Solo administración de Convivencia puede reabrir un expediente'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_causa_reopen() from public, anon;
grant execute on function public.protect_causa_reopen() to authenticated, service_role;
create trigger causas_protect_reopen before update of estado_actual on public.causas
for each row execute function public.protect_causa_reopen();

create or replace function public.delete_causa_cascade(p_causa_id text)
returns boolean language plpgsql security invoker
set search_path = public, pg_temp
as $$
declare v_deleted integer;
begin
  if coalesce(public.current_convivencia_role(), '') not in ('admin','direccion','superadmin') then
    raise exception 'No tiene permiso para eliminar el expediente' using errcode = '42501';
  end if;
  if not exists (select 1 from public.causas where id = p_causa_id and tenant_id = public.current_tenant_id()) then
    return false;
  end if;
  delete from public.bitacora_entries where causa_id = p_causa_id and tenant_id = public.current_tenant_id();
  delete from public.checklist_progress_entries where causa_id = p_causa_id and tenant_id = public.current_tenant_id();
  delete from public.checklist_items where causa_id = p_causa_id and tenant_id = public.current_tenant_id();
  delete from public.causa_documents where causa_id = p_causa_id and tenant_id = public.current_tenant_id();
  delete from public.causas where id = p_causa_id and tenant_id = public.current_tenant_id();
  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
end;
$$;

create or replace function public.ensure_causa_student_same_tenant()
returns trigger language plpgsql security invoker
set search_path = public, pg_temp
as $$
begin
  if new.student_id is not null and not exists (
    select 1 from public.students where id = new.student_id and tenant_id = new.tenant_id
  ) then
    raise exception 'El estudiante no pertenece al colegio del expediente' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.ensure_causa_student_same_tenant() from public, anon;
grant execute on function public.ensure_causa_student_same_tenant() to authenticated, service_role;
create trigger causas_student_same_tenant before insert or update of student_id, tenant_id on public.causas
for each row execute function public.ensure_causa_student_same_tenant();
-- ===== SOURCE END: supabase/migrations/20261022130000_authorize_causas_by_convivencia_membership.sql =====

-- ===== SOURCE START: supabase/migrations/20261022140000_create_incidente_with_causas_atomically.sql =====
-- A08/A12: alta completa por invoker, sin pasos parciales ni reintentos duplicados.
create table public.incidente_creation_requests (
  tenant_id uuid not null references public.tenants(id),
  actor_user_id uuid not null references auth.users(id),
  request_id uuid not null,
  request_hash text not null,
  incidente_id uuid references public.incidentes(id) on delete set null,
  causa_ids text[] not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, actor_user_id, request_id)
);
create index incidente_creation_requests_incidente_idx on public.incidente_creation_requests(incidente_id);
create index incidente_creation_requests_actor_idx on public.incidente_creation_requests(actor_user_id);
alter table public.incidente_creation_requests enable row level security;
grant select, insert on public.incidente_creation_requests to authenticated;
create policy incidente_requests_select on public.incidente_creation_requests for select to authenticated
using (tenant_id = public.current_tenant_id() and actor_user_id = auth.uid() and public.current_convivencia_role() is not null);
create policy incidente_requests_insert on public.incidente_creation_requests for insert to authenticated
with check (tenant_id = public.current_tenant_id() and actor_user_id = auth.uid()
  and public.current_convivencia_role() in ('superadmin','admin','direccion','convivencia','inspectoria','inspector','staff'));

-- Conserva el contrato del correlativo global sin truncarlo al superar 999.
create or replace function public.next_causa_correlativo(p_year integer)
returns text language sql stable security definer set search_path = public, pg_temp
as $$
  select 'DC-' || p_year::text || '-' || lpad(next_value, greatest(3, length(next_value)), '0')
  from (
    select (coalesce(max((regexp_match(id, '(\d+)$'))[1]::bigint), 0) + 1)::text as next_value
    from public.causas where id ~ ('^DC-' || p_year::text || '-\d+$')
  ) counter;
$$;

create or replace function public.create_incidente_with_causas(
  p_request_id uuid,
  p_request jsonb,
  p_defaults jsonb,
  p_initial_checklist jsonb
)
returns jsonb language plpgsql security invoker
set search_path = public, extensions, pg_temp
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_actor uuid := auth.uid();
  v_role text := public.current_convivencia_role();
  v_course uuid;
  v_students uuid[];
  v_fecha timestamptz;
  v_aula boolean;
  v_conducta text;
  v_gravedad text;
  v_input jsonb;
  v_hash text;
  v_previous record;
  v_incidente_id uuid;
  v_causa_ids text[] := array[]::text[];
  v_causa_id text;
  v_incidente jsonb;
  v_student record;
  v_today date := (now() at time zone 'America/Santiago')::date;
  v_deadline date;
  v_plazo integer;
  v_expected_ids text[];
  v_attempt integer;
begin
  if v_actor is null or v_tenant is null
     or coalesce(v_role, '') not in ('superadmin','admin','direccion','convivencia','inspectoria','inspector','staff') then
    raise exception 'No tiene permiso para crear expedientes de Convivencia' using errcode = '42501';
  end if;
  if p_request_id is null or jsonb_typeof(p_request) is distinct from 'object'
     or jsonb_typeof(p_request->'studentIds') is distinct from 'array'
     or jsonb_typeof(p_request->'comprometeAulaSegura') is distinct from 'boolean'
     or exists (select 1 from unnest(array['courseId','fechaHora','lugar','tipo','descripcion','responsable','conductaRiceId','tipoInfraccion']) key
       where jsonb_typeof(p_request->key) is distinct from 'string') then
    raise exception 'La solicitud del incidente no es válida' using errcode = '22023';
  end if;
  begin
    v_course := (p_request->>'courseId')::uuid;
    v_fecha := (p_request->>'fechaHora')::timestamptz;
    v_aula := (p_request->>'comprometeAulaSegura')::boolean;
    select array_agg(value::uuid order by value::uuid) into v_students
    from jsonb_array_elements_text(p_request->'studentIds');
  exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
    raise exception 'Revise curso, estudiantes y fecha del incidente' using errcode = '22023';
  end;
  if v_course is null or v_fecha is null or not isfinite(v_fecha)
     or coalesce(cardinality(v_students), 0) not between 2 and 100
     or exists (select 1 from unnest(v_students) id where id is null)
     or (select count(distinct id) from unnest(v_students) id) <> cardinality(v_students) then
    raise exception 'Seleccione entre dos y cien estudiantes distintos y una fecha válida' using errcode = '22023';
  end if;
  v_conducta := p_request->>'conductaRiceId';
  v_gravedad := case
    when v_conducta ~ '^L([1-9]|1[0-5])$' then 'Leve'
    when v_conducta ~ '^G[1-9]$' then 'Grave'
    when v_conducta ~ '^MG([1-9]|1[0-2])$' then 'Muy Grave'
    when v_conducta ~ '^AS[1-5]$' then 'Gravísima'
  end;
  if v_gravedad is null or (p_request->>'tipoInfraccion') is distinct from v_gravedad
     or length(btrim(coalesce(p_request->>'descripcion',''))) not between 10 and 10000
     or length(btrim(coalesce(p_request->>'responsable',''))) not between 1 and 500
     or length(btrim(coalesce(p_request->>'lugar',''))) not between 1 and 500
     or length(btrim(coalesce(p_request->>'tipo',''))) not between 1 and 500 then
    raise exception 'Revise conducta, gravedad, relato, lugar y responsable' using errcode = '22023';
  end if;
  v_input := jsonb_build_object(
    'courseId', v_course, 'studentIds', to_jsonb(v_students), 'fechaHora', to_char(v_fecha at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'lugar', btrim(p_request->>'lugar'), 'tipo', btrim(p_request->>'tipo'),
    'descripcion', btrim(p_request->>'descripcion'), 'responsable', btrim(p_request->>'responsable'),
    'conductaRiceId', v_conducta, 'tipoInfraccion', v_gravedad, 'comprometeAulaSegura', v_aula
  );
  v_hash := encode(extensions.digest(v_input::text, 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(v_tenant::text || ':' || v_actor::text || ':' || p_request_id::text, 0));
  select request_hash, incidente_id, causa_ids into v_previous
  from public.incidente_creation_requests
  where tenant_id = v_tenant and actor_user_id = v_actor and request_id = p_request_id;
  if found then
    if v_previous.request_hash <> v_hash then
      raise exception 'La solicitud ya se confirmó con otro contenido. Revise el incidente antes de iniciar otra' using errcode = '22023';
    end if;
    v_incidente_id := v_previous.incidente_id;
    v_causa_ids := v_previous.causa_ids;
    if v_incidente_id is null or (select count(*) from public.causas where id = any(v_causa_ids) and tenant_id = v_tenant) <> cardinality(v_causa_ids) then
      raise exception 'La solicitud ya se confirmó y sus registros fueron modificados. Revise el historial' using errcode = '22023';
    end if;
  else
    if not exists (select 1 from public.courses where id = v_course and tenant_id = v_tenant)
       or (select count(*) from public.students where id = any(v_students) and tenant_id = v_tenant and course_id = v_course) <> cardinality(v_students) then
      raise exception 'El curso o sus estudiantes no pertenecen al colegio activo' using errcode = '22023';
    end if;
    -- El cálculo de feriados se reutiliza desde causaFactory; la DB valida su estructura y límites.
    begin
      v_deadline := (p_defaults->>'fechaLimiteInvestigacion')::date;
      v_plazo := (p_defaults->>'plazoInvestigacionDias')::integer;
      if (p_defaults->>'fechaApertura')::date is distinct from v_today
         or (p_defaults->>'fechaInicioInvestigacion')::date is distinct from v_today
         or v_deadline is null or not isfinite(v_deadline)
         or v_plazo is distinct from (case when v_aula or v_gravedad in ('Muy Grave','Gravísima') then 10 else 60 end)
         or (v_plazo = 60 and v_deadline <> v_today + 60)
         or (v_plazo = 10 and v_deadline not between v_today + 10 and v_today + 40) then
        raise exception 'Los plazos iniciales del expediente no son válidos' using errcode = '22023';
      end if;
    exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
      raise exception 'Los plazos iniciales del expediente no son válidos' using errcode = '22023';
    end;
    select array_agg(prefix || n::text) into v_expected_ids
    from (values ('chk_rec_',3),('chk_inv_',9),('chk_res_',9),('chk_imp_',7),('chk_seg_',4),('chk_legal_',6)) phases(prefix, amount)
    cross join lateral generate_series(1, amount) n;
    if jsonb_typeof(p_initial_checklist) is distinct from 'array' then
      raise exception 'Falta el checklist inicial del expediente' using errcode = '22023';
    end if;
    if jsonb_array_length(p_initial_checklist) <> cardinality(v_expected_ids)
       or (select count(distinct entry->>'id') from jsonb_array_elements(p_initial_checklist) entry) <> cardinality(v_expected_ids)
       or exists (
         select 1 from jsonb_array_elements(p_initial_checklist) entry
         where coalesce(entry->>'id','') <> all(v_expected_ids)
           or jsonb_typeof(entry->'label') is distinct from 'string'
           or length(btrim(coalesce(entry->>'label',''))) not between 1 and 500
           or jsonb_typeof(entry->'descripcion') is distinct from 'string'
           or jsonb_typeof(entry->'requeridoPor') is distinct from 'string'
           or (entry->'completado') is distinct from 'false'::jsonb
       ) then
      raise exception 'El checklist inicial está incompleto o acredita hitos no realizados' using errcode = '22023';
    end if;
    insert into public.incidentes (tenant_id, fecha_hora, lugar, tipo, descripcion, responsable)
    values (v_tenant, v_fecha, v_input->>'lugar', v_input->>'tipo', v_input->>'descripcion', v_input->>'responsable')
    returning id into v_incidente_id;

    -- El PK de causas es global; serializa los correlativos de todas las altas grupales del año.
    perform pg_advisory_xact_lock(hashtextextended('causa-correlativo:' || extract(year from v_today)::text, 0));
    for v_student in
      select s.id, s.full_name, s.rut, c.name as course_name
      from public.students s join public.courses c on c.id = s.course_id and c.tenant_id = s.tenant_id
      where s.id = any(v_students) and s.tenant_id = v_tenant and s.course_id = v_course
      order by s.id
    loop
      for v_attempt in 1..25 loop
        v_causa_id := public.next_causa_correlativo(extract(year from v_today)::integer);
        begin
          insert into public.causas (
            id, tenant_id, student_id, incidente_id, procedural_model_version,
            estudiante_nombre, estudiante_curso, nna_protected_name, run_estudiante,
            fecha_apertura, estado_actual, tipo_infraccion, responsable, compromete_aula_segura,
            fecha_ultima_actualizacion, observaciones, conducta_rice_id, fecha_inicio_investigacion,
            plazo_investigacion_dias, fecha_limite_investigacion, created_by
          ) values (
            v_causa_id, v_tenant, v_student.id, v_incidente_id, 2,
            v_student.full_name, v_student.course_name,
            (select coalesce(string_agg(upper(left(word,1)) || '.', ' '), 'N. N.') from regexp_split_to_table(v_student.full_name, '\s+') word where length(word) >= 2),
            coalesce(v_student.rut,''), v_today::text, 'Recepción de Denuncia', v_gravedad,
            v_input->>'responsable', v_aula, v_today::text, v_input->>'descripcion', v_conducta,
            v_today, v_plazo, v_deadline, v_actor::text
          );
          exit;
        exception when unique_violation then
          if v_attempt = 25 then raise; end if;
        end;
      end loop;
      insert into public.checklist_items (id, causa_id, tenant_id, label, descripcion, completado, requerido_por)
      select entry->>'id', v_causa_id, v_tenant, entry->>'label', entry->>'descripcion', false, entry->>'requeridoPor'
      from jsonb_array_elements(p_initial_checklist) entry;
      insert into public.bitacora_entries (id, causa_id, tenant_id, fecha, tipo, titulo, descripcion, participantes, compartido_grupal)
      values ('b_init_' || gen_random_uuid()::text, v_causa_id, v_tenant, to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'), 'Otro',
        'Apertura formal de Causa de Convivencia',
        'Se inicia formalmente la tramitación del expediente de disciplina de conformidad con el Reglamento Interno (RIE) del colegio.',
        jsonb_build_array(v_input->>'responsable'), false);
      v_causa_ids := array_append(v_causa_ids, v_causa_id);
    end loop;
    if cardinality(v_causa_ids) <> cardinality(v_students) then
      raise exception 'No se pudieron crear todos los expedientes' using errcode = '22023';
    end if;
    insert into public.incidente_creation_requests (tenant_id, actor_user_id, request_id, request_hash, incidente_id, causa_ids)
    values (v_tenant, v_actor, p_request_id, v_hash, v_incidente_id, v_causa_ids);
  end if;
  select jsonb_build_object('id', id, 'tenant_id', tenant_id, 'fecha_hora', fecha_hora, 'lugar', lugar,
    'tipo', tipo, 'descripcion', descripcion, 'responsable', responsable, 'created_at', created_at, 'updated_at', updated_at)
  into v_incidente from public.incidentes where id = v_incidente_id and tenant_id = v_tenant;
  if v_incidente is null then
    raise exception 'El incidente confirmado ya no está disponible' using errcode = '22023';
  end if;
  return jsonb_build_object('incidente', v_incidente, 'causaIds', to_jsonb(v_causa_ids));
end;
$$;
revoke all on function public.create_incidente_with_causas(uuid,jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.create_incidente_with_causas(uuid,jsonb,jsonb,jsonb) to authenticated;
-- ===== SOURCE END: supabase/migrations/20261022140000_create_incidente_with_causas_atomically.sql =====

-- ===== SOURCE START: supabase/migrations/20261023150000_add_carta_apoderado_update_rpc.sql =====
-- Permite corregir el apoderado titular solo dentro del flujo autorizado de cartas.

create or replace function public.update_carta_apoderado_nombre(
  p_carta_id uuid,
  p_apoderado_nombre text
)
returns boolean
language plpgsql
security definer
set search_path = public
set row_security = on
as $$
declare
  v_student_id uuid;
  v_name text := nullif(trim(p_apoderado_nombre), '');
  v_role text := public.current_app_role();
  v_tenant_id uuid := public.current_tenant_id();
begin
  if auth.uid() is null or v_tenant_id is null or v_name is null then
    return false;
  end if;

  if v_role is null or v_role not in (
    'superadmin', 'admin', 'direccion', 'convivencia', 'inspectoria',
    'inspector', 'staff'
  ) then
    return false;
  end if;

  select c.student_id
    into v_student_id
    from public.cartas_disciplinarias c
   where c.id = p_carta_id
     and c.tenant_id = v_tenant_id;

  if v_student_id is null then
    return false;
  end if;

  update public.students
     set apoderado_nombre = v_name,
         apoderado_actualizado_at = now()
   where id = v_student_id
     and tenant_id = v_tenant_id;

  if not found then
    return false;
  end if;

  update public.cartas_disciplinarias
     set apoderado_name = v_name,
         updated_at = now()
   where id = p_carta_id
     and tenant_id = v_tenant_id;

  return found;
end;
$$;

revoke all on function public.update_carta_apoderado_nombre(uuid, text) from public, anon;
grant execute on function public.update_carta_apoderado_nombre(uuid, text) to authenticated, service_role;
-- ===== SOURCE END: supabase/migrations/20261023150000_add_carta_apoderado_update_rpc.sql =====

-- ===== SOURCE START: supabase/migrations/20261023170000_include_apoderado_in_annotation_summary.sql =====
-- Devuelve el apoderado titular junto con el resumen usado por el módulo de anotaciones.

drop function if exists public.get_student_annotation_summary();

create function public.get_student_annotation_summary()
returns table(
  id uuid,
  full_name text,
  course_id uuid,
  teacher_id uuid,
  status text,
  annotations_count bigint,
  positive_annotations_count bigint,
  informative_annotations_count bigint,
  last_annotation_date timestamptz,
  disciplinary_status text,
  rut text,
  apoderado_nombre text,
  course_name text,
  ai_analysis jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with tenant_scope as (
    select
      public.current_tenant_id() as tenant_id,
      extract(year from timezone('America/Santiago', now()))::integer as school_year
  )
  select
    s.id,
    s.full_name,
    s.course_id,
    null::uuid as teacher_id,
    'Activo'::text as status,
    coalesce(annotation_totals.negativas, 0)::bigint as annotations_count,
    coalesce(annotation_totals.positivas, 0)::bigint as positive_annotations_count,
    coalesce(annotation_totals.informativas, 0)::bigint as informative_annotations_count,
    annotation_totals.last_date as last_annotation_date,
    case
      when coalesce(annotation_totals.negativas, 0) >= 15 then 'Rojo'
      when coalesce(annotation_totals.negativas, 0) >= 10 then 'Naranja'
      when coalesce(annotation_totals.negativas, 0) >= 5 then 'Amarillo'
      else 'Verde'
    end as disciplinary_status,
    s.rut,
    s.apoderado_nombre,
    c.name as course_name,
    latest.analysis_json as ai_analysis
  from public.students s
  cross join tenant_scope scope
  left join public.courses c
    on c.id = s.course_id
   and c.tenant_id = scope.tenant_id
  left join lateral (
    select
      count(*) filter (where ir.type = 'Negativa')::bigint as negativas,
      count(*) filter (where ir.type = 'Positiva')::bigint as positivas,
      count(*) filter (where ir.type = 'Información')::bigint as informativas,
      max(ir.date_time) as last_date
    from public.inspectorate_records ir
    where ir.student_id = s.id
      and ir.tenant_id = scope.tenant_id
      and extract(year from timezone('America/Santiago', ir.date_time))::integer = scope.school_year
  ) annotation_totals on true
  left join lateral (
    select jsonb_build_object(
      'negativas', da.negativas,
      'positivas', da.positivas,
      'informativas', da.informativas,
      'analyzed_at', da.analyzed_at
    ) as analysis_json
    from public.document_analyses da
    where da.student_id = s.id
      and da.tenant_id = scope.tenant_id
    order by da.analyzed_at desc
    limit 1
  ) latest on true
  where s.tenant_id = scope.tenant_id
  order by s.full_name;
$$;

revoke all on function public.get_student_annotation_summary() from public;
grant execute on function public.get_student_annotation_summary() to authenticated, service_role;

comment on function public.get_student_annotation_summary() is
  'Stable tenant-scoped student annotation totals including guardian name for the current school year only.';
-- ===== SOURCE END: supabase/migrations/20261023170000_include_apoderado_in_annotation_summary.sql =====

-- ===== SOURCE START: supabase/migrations/20261031185103_restrict_teacher_attendance_writes_and_scope_rpcs.sql =====
-- Teachers can read attendance data, but cannot mutate it.
-- Keep application boundaries explicit because this database is shared with Convivencia.

DROP POLICY IF EXISTS p_absences_staff_select ON public.absences;
CREATE POLICY p_absences_staff_select
  ON public.absences FOR SELECT TO authenticated
  USING (
    public.has_app_access('inasistencias', ARRAY['teacher','staff','superuser','admin','direccion'])
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = absences.student_id
        AND s.tenant_id = public.current_tenant_id()
    )
  );

DROP POLICY IF EXISTS p_absences_staff_insert ON public.absences;
CREATE POLICY p_absences_staff_insert
  ON public.absences FOR INSERT TO authenticated
  WITH CHECK (
    public.has_app_access('inasistencias', ARRAY['staff','superuser','admin','direccion'])
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = absences.student_id
        AND s.tenant_id = public.current_tenant_id()
    )
  );

DROP POLICY IF EXISTS p_absences_staff_update ON public.absences;
CREATE POLICY p_absences_staff_update
  ON public.absences FOR UPDATE TO authenticated
  USING (
    public.has_app_access('inasistencias', ARRAY['staff','superuser','admin','direccion'])
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = absences.student_id
        AND s.tenant_id = public.current_tenant_id()
    )
  )
  WITH CHECK (
    public.has_app_access('inasistencias', ARRAY['staff','superuser','admin','direccion'])
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = absences.student_id
        AND s.tenant_id = public.current_tenant_id()
    )
  );

DROP POLICY IF EXISTS p_tests_staff_select ON public.tests;
CREATE POLICY p_tests_staff_select
  ON public.tests FOR SELECT TO authenticated
  USING (
    public.has_app_access('inasistencias', ARRAY['teacher','staff','superuser','admin','direccion'])
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = tests.course_id
        AND c.tenant_id = public.current_tenant_id()
    )
  );

DROP POLICY IF EXISTS p_tests_staff_insert ON public.tests;
CREATE POLICY p_tests_staff_insert
  ON public.tests FOR INSERT TO authenticated
  WITH CHECK (
    public.has_app_access('inasistencias', ARRAY['staff','superuser','admin','direccion'])
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = tests.course_id
        AND c.tenant_id = public.current_tenant_id()
    )
  );

DROP POLICY IF EXISTS p_tests_staff_update ON public.tests;
CREATE POLICY p_tests_staff_update
  ON public.tests FOR UPDATE TO authenticated
  USING (
    public.has_app_access('inasistencias', ARRAY['staff','superuser','admin','direccion'])
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = tests.course_id
        AND c.tenant_id = public.current_tenant_id()
    )
  )
  WITH CHECK (
    public.has_app_access('inasistencias', ARRAY['staff','superuser','admin','direccion'])
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = tests.course_id
        AND c.tenant_id = public.current_tenant_id()
    )
  );

DROP POLICY IF EXISTS makeup_exams_staff_select ON public.makeup_exams;
CREATE POLICY makeup_exams_staff_select
  ON public.makeup_exams FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.has_app_access('inasistencias', ARRAY['teacher','staff','superuser','admin','direccion'])
  );

CREATE OR REPLACE FUNCTION public.teacher_get_public_absences(
  p_month integer,
  p_year integer,
  p_level text DEFAULT NULL::text,
  p_course_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  absence_id uuid, student_name text, course_id uuid, course_name text,
  course_level text, start_date date, end_date date, status text,
  observation text, affected_tests_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_month_start date;
  v_month_end date;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_app_access(
    'inasistencias', ARRAY['teacher','staff','superuser','admin','direccion']
  ) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  IF p_month IS NULL OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'p_month must be between 1 and 12';
  END IF;
  IF p_year IS NULL OR p_year < 2000 OR p_year > 2100 THEN
    RAISE EXCEPTION 'p_year must be between 2000 and 2100';
  END IF;

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end := (v_month_start + interval '1 month - 1 day')::date;

  RETURN QUERY
  SELECT a.id, s.full_name, c.id, c.name, c.level,
    a.start_date, a.end_date, a.status, a.observation,
    COALESCE(ta.affected_tests_count, 0)::int
  FROM public.absences a
  JOIN public.students s ON s.id = a.student_id
    AND s.tenant_id = public.current_tenant_id()
  JOIN public.courses c ON c.id = s.course_id
    AND c.tenant_id = public.current_tenant_id()
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS affected_tests_count
    FROM public.tests t
    WHERE t.course_id = c.id
      AND t.date BETWEEN a.start_date AND a.end_date
      AND t.date BETWEEN v_month_start AND v_month_end
  ) ta ON true
  WHERE a.start_date <= v_month_end
    AND a.end_date >= v_month_start
    AND (p_level IS NULL OR c.level = p_level)
    AND (p_course_id IS NULL OR c.id = p_course_id)
  ORDER BY a.start_date DESC, s.full_name ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.teacher_get_public_absence_detail(p_absence_id uuid)
RETURNS TABLE(id uuid, date date, subject text, type text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT t.id, t.date, t.subject, t.type
  FROM public.absences a
  JOIN public.students s ON s.id = a.student_id
    AND s.tenant_id = public.current_tenant_id()
  JOIN public.tests t ON t.course_id = s.course_id
  WHERE a.id = p_absence_id
    AND public.has_app_access(
      'inasistencias', ARRAY['teacher','staff','superuser','admin','direccion']
    )
    AND t.date BETWEEN a.start_date AND a.end_date
  ORDER BY t.date;
$function$;

CREATE OR REPLACE FUNCTION public.teacher_get_public_makeup_exams(
  p_month integer,
  p_year integer,
  p_level text DEFAULT NULL::text,
  p_course_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  makeup_exam_id uuid, student_name text, course_id uuid, course_name text,
  course_level text, subject text, original_date date, scheduled_date date,
  status text, observation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_month_start date;
  v_month_end date;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_app_access(
    'inasistencias', ARRAY['teacher','staff','superuser','admin','direccion']
  ) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  IF p_month IS NULL OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'p_month must be between 1 and 12';
  END IF;
  IF p_year IS NULL OR p_year < 2000 OR p_year > 2100 THEN
    RAISE EXCEPTION 'p_year must be between 2000 and 2100';
  END IF;

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end := (v_month_start + interval '1 month - 1 day')::date;

  RETURN QUERY
  SELECT m.id, s.full_name, c.id, c.name, c.level, m.subject,
    m.original_date, m.scheduled_date, m.status, m.notes
  FROM public.makeup_exams m
  JOIN public.students s ON s.id = m.student_id
    AND s.tenant_id = public.current_tenant_id()
  JOIN public.courses c ON c.id = s.course_id
    AND c.tenant_id = public.current_tenant_id()
  WHERE m.tenant_id = public.current_tenant_id()
    AND m.scheduled_date BETWEEN v_month_start AND v_month_end
    AND (p_level IS NULL OR c.level = p_level)
    AND (p_course_id IS NULL OR c.id = p_course_id)
  ORDER BY m.scheduled_date, s.full_name, m.subject;
END;
$function$;
-- ===== SOURCE END: supabase/migrations/20261031185103_restrict_teacher_attendance_writes_and_scope_rpcs.sql =====

-- ===== SOURCE START: supabase/migrations/20261031185113_tighten_attendance_delete_scope_and_fix_year_validation.sql =====
DROP POLICY IF EXISTS p_absences_superuser_delete ON public.absences;
CREATE POLICY p_absences_superuser_delete
  ON public.absences FOR DELETE TO authenticated
  USING (
    public.is_superuser()
    AND public.has_app_access('inasistencias', ARRAY['superuser','admin','direccion'])
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = absences.student_id
        AND s.tenant_id = public.current_tenant_id()
    )
  );

CREATE OR REPLACE FUNCTION public.teacher_get_public_makeup_exams(
  p_month integer,
  p_year integer,
  p_level text DEFAULT NULL::text,
  p_course_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  makeup_exam_id uuid, student_name text, course_id uuid, course_name text,
  course_level text, subject text, original_date date, scheduled_date date,
  status text, observation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_month_start date;
  v_month_end date;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_app_access(
    'inasistencias', ARRAY['teacher','staff','superuser','admin','direccion']
  ) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  IF p_month IS NULL OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'p_month must be between 1 and 12';
  END IF;
  IF p_year IS NULL OR p_year < 2000 OR p_year > 2100 THEN
    RAISE EXCEPTION 'p_year must be between 2000 and 2100';
  END IF;

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end := (v_month_start + interval '1 month - 1 day')::date;

  RETURN QUERY
  SELECT m.id, s.full_name, c.id, c.name, c.level, m.subject,
    m.original_date, m.scheduled_date, m.status, m.notes
  FROM public.makeup_exams m
  JOIN public.students s ON s.id = m.student_id
    AND s.tenant_id = public.current_tenant_id()
  JOIN public.courses c ON c.id = s.course_id
    AND c.tenant_id = public.current_tenant_id()
  WHERE m.tenant_id = public.current_tenant_id()
    AND m.scheduled_date BETWEEN v_month_start AND v_month_end
    AND (p_level IS NULL OR c.level = p_level)
    AND (p_course_id IS NULL OR c.id = p_course_id)
  ORDER BY m.scheduled_date, s.full_name, m.subject;
END;
$function$;
-- ===== SOURCE END: supabase/migrations/20261031185113_tighten_attendance_delete_scope_and_fix_year_validation.sql =====

-- ===== SOURCE START: supabase/migrations/20261106120000_add_dupla_psicosocial_carta_type.sql =====
/** @license SPDX-License-Identifier: Apache-2.0 */

ALTER TABLE public.cartas_disciplinarias
  DROP CONSTRAINT IF EXISTS cartas_disciplinarias_letter_type_check;

ALTER TABLE public.cartas_disciplinarias
  ADD CONSTRAINT cartas_disciplinarias_letter_type_check
  CHECK (letter_type IN (
    'Amonestación Escrita',
    'Carta de Compromiso Conductual',
    'Compromiso Conductual - Derivación a Dupla Psicosocial',
    'Ficha de Derivación'
  ));
-- ===== SOURCE END: supabase/migrations/20261106120000_add_dupla_psicosocial_carta_type.sql =====

-- ===== SOURCE START: supabase/migrations/20261120120000_add_appeal_deadline.sql =====
alter table public.causas
  add column if not exists fecha_limite_apelacion timestamptz;

comment on column public.causas.fecha_limite_apelacion is
  'Plazo máximo de 48 horas para presentar reconsideración o apelación desde la resolución concluyente.';
-- ===== SOURCE END: supabase/migrations/20261120120000_add_appeal_deadline.sql =====

COMMIT;
