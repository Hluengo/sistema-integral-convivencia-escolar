


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
