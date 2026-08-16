/** @license SPDX-License-Identifier: Apache-2.0 */

-- Seed local idempotente para desarrollo.
-- Se ejecuta automaticamente con `supabase db reset` por supabase/config.toml.
-- Para forzar solo este seed durante un reset local:
--   supabase db reset --local --sql-paths ./seed.sql
-- Credenciales locales sugeridas:
--   superadmin.demo.local@example.local / 12345678
--   direccion.demo.local@example.local / 12345678
--   convivencia.demo.local@example.local / 12345678
--   inspectoria.demo.local@example.local / 12345678
--   profesor.demo.local@example.local / 12345678

SET search_path = public, auth, extensions;

INSERT INTO public.tenants (id, name, slug, created_at)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'Colegio Demo Convivencia', 'colegio-demo-convivencia', '2026-03-01T12:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug;

INSERT INTO public.applications (code, name, is_active, created_at)
VALUES
  ('convivencia', 'Convivencia Escolar', true, '2026-03-01T12:00:00Z'),
  ('inasistencias', 'Gestion de Inasistencias', true, '2026-03-01T12:00:00Z')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active;

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-9000-000000000001',
    'authenticated',
    'authenticated',
    'superadmin.demo.local@example.local',
    crypt('12345678', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"tenant_id":"00000000-0000-4000-8000-000000000001"}'::jsonb,
    '{"full_name":"Superadmin Demo Local"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-9000-000000000002',
    'authenticated',
    'authenticated',
    'direccion.demo.local@example.local',
    crypt('12345678', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"tenant_id":"00000000-0000-4000-8000-000000000001"}'::jsonb,
    '{"full_name":"Direccion Demo Local"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-9000-000000000003',
    'authenticated',
    'authenticated',
    'convivencia.demo.local@example.local',
    crypt('12345678', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"tenant_id":"00000000-0000-4000-8000-000000000001"}'::jsonb,
    '{"full_name":"Convivencia Demo Local"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-9000-000000000004',
    'authenticated',
    'authenticated',
    'inspectoria.demo.local@example.local',
    crypt('12345678', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"tenant_id":"00000000-0000-4000-8000-000000000001"}'::jsonb,
    '{"full_name":"Inspectoria Demo Local"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-9000-000000000005',
    'authenticated',
    'authenticated',
    'profesor.demo.local@example.local',
    crypt('12345678', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"tenant_id":"00000000-0000-4000-8000-000000000001"}'::jsonb,
    '{"full_name":"Profesor Jefe Demo Local"}'::jsonb,
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_app_meta_data = EXCLUDED.raw_app_meta_data,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = now();

INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  u.id,
  u.id,
  u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  now(),
  now(),
  now()
FROM auth.users u
WHERE u.email IN (
  'superadmin.demo.local@example.local',
  'direccion.demo.local@example.local',
  'convivencia.demo.local@example.local',
  'inspectoria.demo.local@example.local',
  'profesor.demo.local@example.local'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.courses (id, name, position, level, tenant_id, created_at)
VALUES
  ('00000000-0000-4000-8001-000000000001', '7 basico A', 1, 'BASICA', '00000000-0000-4000-8000-000000000001', '2026-03-01T12:00:00Z'),
  ('00000000-0000-4000-8001-000000000002', '8 basico B', 2, 'BASICA', '00000000-0000-4000-8000-000000000001', '2026-03-01T12:00:00Z'),
  ('00000000-0000-4000-8001-000000000003', '1 medio A', 3, 'MEDIA', '00000000-0000-4000-8000-000000000001', '2026-03-01T12:00:00Z'),
  ('00000000-0000-4000-8001-000000000004', '2 medio B', 4, 'MEDIA', '00000000-0000-4000-8000-000000000001', '2026-03-01T12:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  position = EXCLUDED.position,
  level = EXCLUDED.level,
  tenant_id = EXCLUDED.tenant_id;

INSERT INTO public.profiles (user_id, email, full_name, role, tenant_id, course_ids, is_active, created_at, updated_at)
VALUES
  ('00000000-0000-4000-9000-000000000001', 'superadmin.demo.local@example.local', 'Superadmin Demo Local', 'superadmin', '00000000-0000-4000-8000-000000000001', '{}', true, now(), now()),
  ('00000000-0000-4000-9000-000000000002', 'direccion.demo.local@example.local', 'Direccion Demo Local', 'direccion', '00000000-0000-4000-8000-000000000001', '{}', true, now(), now()),
  ('00000000-0000-4000-9000-000000000003', 'convivencia.demo.local@example.local', 'Convivencia Demo Local', 'convivencia', '00000000-0000-4000-8000-000000000001', '{}', true, now(), now()),
  ('00000000-0000-4000-9000-000000000004', 'inspectoria.demo.local@example.local', 'Inspectoria Demo Local', 'inspectoria', '00000000-0000-4000-8000-000000000001', '{}', true, now(), now()),
  ('00000000-0000-4000-9000-000000000005', 'profesor.demo.local@example.local', 'Profesor Jefe Demo Local', 'profesor_jefe', '00000000-0000-4000-8000-000000000001', ARRAY['00000000-0000-4000-8001-000000000003'::uuid], true, now(), now())
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  tenant_id = EXCLUDED.tenant_id,
  course_ids = EXCLUDED.course_ids,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO public.app_memberships (tenant_id, user_id, application_code, role, is_active)
VALUES
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000001', 'convivencia', 'superadmin', true),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000002', 'convivencia', 'direccion', true),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000003', 'convivencia', 'convivencia', true),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000004', 'convivencia', 'inspectoria', true),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000005', 'convivencia', 'profesor_jefe', true),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000005', 'inasistencias', 'teacher', true)
ON CONFLICT (tenant_id, user_id, application_code) DO UPDATE SET
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO public.students (id, full_name, course_id, rut, tenant_id, ai_analysis, created_at)
VALUES
  ('00000000-0000-4000-8002-000000000001', 'Estudiante Demo Verde', '00000000-0000-4000-8001-000000000001', '11.111.111-1', '00000000-0000-4000-8000-000000000001', '{"risk":"bajo","summary":"Sin registros negativos vigentes."}'::jsonb, now()),
  ('00000000-0000-4000-8002-000000000002', 'Estudiante Demo Sin Carta', '00000000-0000-4000-8001-000000000001', '22.222.222-2', '00000000-0000-4000-8000-000000000001', '{"risk":"bajo","summary":"Registros iniciales para seguimiento formativo."}'::jsonb, now()),
  ('00000000-0000-4000-8002-000000000003', 'Estudiante Demo Amonestacion', '00000000-0000-4000-8001-000000000002', '33.333.333-3', '00000000-0000-4000-8000-000000000001', '{"risk":"medio","summary":"Umbral de amonestacion alcanzado."}'::jsonb, now()),
  ('00000000-0000-4000-8002-000000000004', 'Estudiante Demo Compromiso', '00000000-0000-4000-8001-000000000003', '44.444.444-4', '00000000-0000-4000-8000-000000000001', '{"risk":"alto","summary":"Requiere compromiso conductual y seguimiento."}'::jsonb, now()),
  ('00000000-0000-4000-8002-000000000005', 'Estudiante Demo Derivacion', '00000000-0000-4000-8001-000000000004', '55.555.555-5', '00000000-0000-4000-8000-000000000001', '{"risk":"critico","summary":"Acumula registros para derivacion y plan intensivo."}'::jsonb, now()),
  ('00000000-0000-4000-8002-000000000006', 'Estudiante Demo Positivo', '00000000-0000-4000-8001-000000000003', '66.666.666-6', '00000000-0000-4000-8000-000000000001', '{"risk":"protector","summary":"Alta presencia de registros positivos."}'::jsonb, now())
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  course_id = EXCLUDED.course_id,
  rut = EXCLUDED.rut,
  tenant_id = EXCLUDED.tenant_id,
  ai_analysis = EXCLUDED.ai_analysis;

INSERT INTO public.inspectorate_records (id, student_id, date_time, observation, type, severity, registered_by, created_by, tenant_id)
SELECT
  ('10000000-0000-4000-8000-' || lpad(gs::text, 12, '0'))::uuid,
  '00000000-0000-4000-8002-000000000005'::uuid,
  ('2026-03-01'::date + gs)::timestamptz,
  format('Registro negativo demo %s para estudiante en tramo Derivacion.', gs),
  'Negativa',
  CASE WHEN gs >= 13 THEN 'Muy Grave' WHEN gs >= 8 THEN 'Grave' ELSE 'Leve' END,
  'Inspectoria Demo Local',
  '00000000-0000-4000-9000-000000000004',
  '00000000-0000-4000-8000-000000000001'::uuid
FROM generate_series(1, 16) AS gs
ON CONFLICT (id) DO UPDATE SET
  date_time = EXCLUDED.date_time,
  observation = EXCLUDED.observation,
  type = EXCLUDED.type,
  severity = EXCLUDED.severity,
  tenant_id = EXCLUDED.tenant_id;

INSERT INTO public.inspectorate_records (id, student_id, date_time, observation, type, severity, registered_by, created_by, tenant_id)
SELECT
  ('10000000-0000-4000-8001-' || lpad(gs::text, 12, '0'))::uuid,
  '00000000-0000-4000-8002-000000000004'::uuid,
  ('2026-04-01'::date + gs)::timestamptz,
  format('Registro negativo demo %s para estudiante en tramo Compromiso.', gs),
  'Negativa',
  CASE WHEN gs >= 8 THEN 'Grave' ELSE 'Leve' END,
  'Inspectoria Demo Local',
  '00000000-0000-4000-9000-000000000004',
  '00000000-0000-4000-8000-000000000001'::uuid
FROM generate_series(1, 11) AS gs
ON CONFLICT (id) DO UPDATE SET
  date_time = EXCLUDED.date_time,
  observation = EXCLUDED.observation,
  type = EXCLUDED.type,
  severity = EXCLUDED.severity,
  tenant_id = EXCLUDED.tenant_id;

INSERT INTO public.inspectorate_records (id, student_id, date_time, observation, type, severity, registered_by, created_by, tenant_id)
SELECT
  ('10000000-0000-4000-8002-' || lpad(gs::text, 12, '0'))::uuid,
  '00000000-0000-4000-8002-000000000003'::uuid,
  ('2026-05-01'::date + gs)::timestamptz,
  format('Registro negativo demo %s para estudiante en tramo Amonestacion.', gs),
  'Negativa',
  CASE WHEN gs >= 5 THEN 'Grave' ELSE 'Leve' END,
  'Inspectoria Demo Local',
  '00000000-0000-4000-9000-000000000004',
  '00000000-0000-4000-8000-000000000001'::uuid
FROM generate_series(1, 6) AS gs
ON CONFLICT (id) DO UPDATE SET
  date_time = EXCLUDED.date_time,
  observation = EXCLUDED.observation,
  type = EXCLUDED.type,
  severity = EXCLUDED.severity,
  tenant_id = EXCLUDED.tenant_id;

INSERT INTO public.inspectorate_records (id, student_id, date_time, observation, type, severity, registered_by, created_by, tenant_id)
SELECT
  ('10000000-0000-4000-8003-' || lpad(gs::text, 12, '0'))::uuid,
  '00000000-0000-4000-8002-000000000002'::uuid,
  ('2026-06-01'::date + gs)::timestamptz,
  format('Registro negativo demo %s para seguimiento sin carta.', gs),
  'Negativa',
  'Leve',
  'Inspectoria Demo Local',
  '00000000-0000-4000-9000-000000000004',
  '00000000-0000-4000-8000-000000000001'::uuid
FROM generate_series(1, 3) AS gs
ON CONFLICT (id) DO UPDATE SET
  date_time = EXCLUDED.date_time,
  observation = EXCLUDED.observation,
  type = EXCLUDED.type,
  severity = EXCLUDED.severity,
  tenant_id = EXCLUDED.tenant_id;

INSERT INTO public.inspectorate_records (id, student_id, date_time, observation, type, severity, registered_by, created_by, tenant_id)
VALUES
  ('10000000-0000-4000-8004-000000000001', '00000000-0000-4000-8002-000000000006', '2026-06-15T14:00:00Z', 'Reconoce el error y apoya a un companero durante recreo.', 'Positiva', 'Leve', 'Inspectoria Demo Local', '00000000-0000-4000-9000-000000000004', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8004-000000000002', '00000000-0000-4000-8002-000000000006', '2026-06-20T14:00:00Z', 'Participa en mediacion y propone acuerdos reparatorios.', 'Positiva', 'Leve', 'Convivencia Demo Local', '00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8004-000000000003', '00000000-0000-4000-8002-000000000001', '2026-06-22T14:00:00Z', 'Informacion preventiva registrada para entrevista familiar.', 'Información', 'Leve', 'Convivencia Demo Local', '00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000001')
ON CONFLICT (id) DO UPDATE SET
  date_time = EXCLUDED.date_time,
  observation = EXCLUDED.observation,
  type = EXCLUDED.type,
  severity = EXCLUDED.severity,
  tenant_id = EXCLUDED.tenant_id;

INSERT INTO public.causas (
  id,
  estudiante_nombre,
  estudiante_curso,
  nna_protected_name,
  run_estudiante,
  fecha_apertura,
  estado_actual,
  tipo_infraccion,
  responsable,
  compromete_aula_segura,
  fecha_ultima_actualizacion,
  observaciones,
  medidas_ejecutadas,
  student_id,
  annotations_count,
  created_by,
  tenant_id
)
VALUES
  ('CAUSA-DEMO-001', 'Estudiante Demo Derivacion', '2 medio B', 'E.D.D.', '55.555.555-5', '2026-06-01', 'Recopilación de evidencias', 'Gravísima', 'Convivencia Demo Local', true, '2026-06-22', 'Caso demo con 16 registros negativos para validar derivacion y Aula Segura.', '["medida de resguardo", "entrevista inicial"]'::jsonb, '00000000-0000-4000-8002-000000000005', 16, '00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000001'),
  ('CAUSA-DEMO-002', 'Estudiante Demo Compromiso', '1 medio A', 'E.D.C.', '44.444.444-4', '2026-05-15', 'Notificación apertura', 'Grave', 'Convivencia Demo Local', false, '2026-06-10', 'Caso demo con 11 registros negativos para validar compromiso conductual.', '["citación apoderado"]'::jsonb, '00000000-0000-4000-8002-000000000004', 11, '00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000001'),
  ('CAUSA-DEMO-003', 'Estudiante Demo Amonestacion', '8 basico B', 'E.D.A.', '33.333.333-3', '2026-05-20', 'Cierre formal', 'Grave', 'Direccion Demo Local', false, '2026-06-18', 'Caso demo cerrado para validar historico de expedientes.', '["amonestacion registrada"]'::jsonb, '00000000-0000-4000-8002-000000000003', 6, '00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001')
ON CONFLICT (id) DO UPDATE SET
  estudiante_nombre = EXCLUDED.estudiante_nombre,
  estudiante_curso = EXCLUDED.estudiante_curso,
  nna_protected_name = EXCLUDED.nna_protected_name,
  run_estudiante = EXCLUDED.run_estudiante,
  estado_actual = EXCLUDED.estado_actual,
  tipo_infraccion = EXCLUDED.tipo_infraccion,
  responsable = EXCLUDED.responsable,
  compromete_aula_segura = EXCLUDED.compromete_aula_segura,
  fecha_ultima_actualizacion = EXCLUDED.fecha_ultima_actualizacion,
  observaciones = EXCLUDED.observaciones,
  medidas_ejecutadas = EXCLUDED.medidas_ejecutadas,
  student_id = EXCLUDED.student_id,
  annotations_count = EXCLUDED.annotations_count,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO public.bitacora_entries (id, causa_id, fecha, tipo, titulo, descripcion, participantes, tenant_id)
VALUES
  ('BIT-DEMO-001', 'CAUSA-DEMO-001', '2026-06-01', 'Notificación', 'Apertura formal del procedimiento', 'Se informa inicio de indagacion y medidas de resguardo.', '["Convivencia", "Apoderado"]'::jsonb, '00000000-0000-4000-8000-000000000001'),
  ('BIT-DEMO-002', 'CAUSA-DEMO-001', '2026-06-05', 'Entrevista', 'Entrevista de descargos', 'Se registra entrevista y antecedentes aportados por la familia.', '["Estudiante", "Apoderado", "Convivencia"]'::jsonb, '00000000-0000-4000-8000-000000000001'),
  ('BIT-DEMO-003', 'CAUSA-DEMO-002', '2026-05-16', 'Mediación', 'Acuerdos formativos iniciales', 'Se acuerdan compromisos de convivencia y seguimiento semanal.', '["Estudiante", "Profesor jefe"]'::jsonb, '00000000-0000-4000-8000-000000000001'),
  ('BIT-DEMO-004', 'CAUSA-DEMO-003', '2026-06-18', 'Resolución', 'Cierre con amonestacion registrada', 'Se cierra el caso con carta registrada y acciones formativas cumplidas.', '["Direccion", "Convivencia"]'::jsonb, '00000000-0000-4000-8000-000000000001')
ON CONFLICT (id) DO UPDATE SET
  fecha = EXCLUDED.fecha,
  tipo = EXCLUDED.tipo,
  titulo = EXCLUDED.titulo,
  descripcion = EXCLUDED.descripcion,
  participantes = EXCLUDED.participantes,
  tenant_id = EXCLUDED.tenant_id;

INSERT INTO public.checklist_items (id, causa_id, label, descripcion, completado, fecha_completado, requerido_por, registrado_por, observaciones, tenant_id)
VALUES
  ('CHK-DEMO-001', 'CAUSA-DEMO-001', 'Notificar apertura', 'Comunicar apertura de indagacion al apoderado.', true, '2026-06-01', 'Circular 482', 'Convivencia Demo Local', 'Notificacion enviada y registrada.', '00000000-0000-4000-8000-000000000001'),
  ('CHK-DEMO-002', 'CAUSA-DEMO-001', 'Entrevista de descargos', 'Registrar version del estudiante y apoderado.', true, '2026-06-05', 'Debido proceso', 'Convivencia Demo Local', 'Entrevista incorporada a bitacora.', '00000000-0000-4000-8000-000000000001'),
  ('CHK-DEMO-003', 'CAUSA-DEMO-001', 'Informe de cierre', 'Emitir informe tecnico de cierre de indagacion.', false, null, 'Circular 482', null, 'Pendiente para validar notificaciones y plazos.', '00000000-0000-4000-8000-000000000001'),
  ('CHK-DEMO-004', 'CAUSA-DEMO-002', 'Citación apoderado', 'Coordinar entrevista y compromisos.', true, '2026-05-18', 'RICE', 'Convivencia Demo Local', 'Cita realizada.', '00000000-0000-4000-8000-000000000001'),
  ('CHK-DEMO-005', 'CAUSA-DEMO-003', 'Cierre formal', 'Registrar resolucion y cierre.', true, '2026-06-18', 'RICE', 'Direccion Demo Local', 'Caso cerrado.', '00000000-0000-4000-8000-000000000001')
ON CONFLICT (id, causa_id) DO UPDATE SET
  label = EXCLUDED.label,
  descripcion = EXCLUDED.descripcion,
  completado = EXCLUDED.completado,
  fecha_completado = EXCLUDED.fecha_completado,
  requerido_por = EXCLUDED.requerido_por,
  registrado_por = EXCLUDED.registrado_por,
  observaciones = EXCLUDED.observaciones,
  tenant_id = EXCLUDED.tenant_id;

INSERT INTO public.cartas_disciplinarias (
  id,
  student_id,
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
  tenant_id,
  content_snapshot,
  origin,
  school_year
)
VALUES
  ('00000000-0000-4000-8003-000000000001', '00000000-0000-4000-8002-000000000003', 'Amonestación Escrita', '2026-06-18', 'Cumplida', 'Direccion Demo Local', 'Direccion Demo Local', 'Apoderado Demo A', 6, 'Estudiante Demo Amonestacion', '8 basico B', 'RICE demo: reiteracion de faltas leves y graves.', 'Carta procesada para cierre de caso demo.', '00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', '{"version":"seed","resumen":"Amonestacion demo procesada"}'::jsonb, 'platform', 2026),
  ('00000000-0000-4000-8003-000000000002', '00000000-0000-4000-8002-000000000004', 'Carta de Compromiso Conductual', '2026-06-10', 'Vigente', 'Convivencia Demo Local', 'Direccion Demo Local', 'Apoderado Demo B', 11, 'Estudiante Demo Compromiso', '1 medio A', 'RICE demo: compromiso conductual por reiteracion.', 'Carta vigente para seguimiento.', '00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000001', '{"version":"seed","resumen":"Compromiso demo vigente"}'::jsonb, 'platform', 2026)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  annotations_count = EXCLUDED.annotations_count,
  observations = EXCLUDED.observations,
  content_snapshot = EXCLUDED.content_snapshot,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO public.carta_events (id, carta_id, student_id, tenant_id, event_type, event_detail, created_by, metadata)
VALUES
  ('00000000-0000-4000-8004-000000000001', '00000000-0000-4000-8003-000000000001', '00000000-0000-4000-8002-000000000003', '00000000-0000-4000-8000-000000000001', 'registered', 'Carta de amonestacion registrada desde seed local.', '00000000-0000-4000-9000-000000000002', '{"source":"seed"}'::jsonb),
  ('00000000-0000-4000-8004-000000000002', '00000000-0000-4000-8003-000000000002', '00000000-0000-4000-8002-000000000004', '00000000-0000-4000-8000-000000000001', 'created', 'Carta de compromiso creada desde seed local.', '00000000-0000-4000-9000-000000000003', '{"source":"seed"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  event_type = EXCLUDED.event_type,
  event_detail = EXCLUDED.event_detail,
  metadata = EXCLUDED.metadata;

INSERT INTO public.etapas_disciplinarias (id, student_id, step_number, stage_name, responsible, transition_date, comment, created_by, tenant_id)
VALUES
  ('00000000-0000-4000-8005-000000000001', '00000000-0000-4000-8002-000000000003', 1, 'Amonestación Escrita', 'Direccion Demo Local', '2026-06-18T15:00:00Z', 'Etapa registrada por seed local.', '00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8005-000000000002', '00000000-0000-4000-8002-000000000004', 2, 'Carta de Compromiso Conductual', 'Convivencia Demo Local', '2026-06-10T15:00:00Z', 'Etapa vigente para seguimiento.', '00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000001')
ON CONFLICT (id) DO UPDATE SET
  step_number = EXCLUDED.step_number,
  stage_name = EXCLUDED.stage_name,
  responsible = EXCLUDED.responsible,
  transition_date = EXCLUDED.transition_date,
  comment = EXCLUDED.comment,
  tenant_id = EXCLUDED.tenant_id;

WITH seed_rules AS (
  SELECT *
  FROM (
    VALUES
      ('annotation_count', 'Sin carta', '0 a 4 registros negativos: seguimiento formativo sin carta.', 0, 4, null::integer, null::integer, null::integer, null::integer, 'Sin Carta', 1),
      ('annotation_count', 'Amonestacion escrita', '5 a 9 registros negativos: sugerir amonestacion escrita.', 5, 9, null::integer, null::integer, null::integer, null::integer, 'Amonestación Escrita', 2),
      ('annotation_count', 'Compromiso conductual', '10 a 14 registros negativos: sugerir carta de compromiso.', 10, 14, null::integer, null::integer, null::integer, null::integer, 'Carta de Compromiso Conductual', 3),
      ('annotation_count', 'Derivacion', '15 o mas registros negativos: sugerir ficha de derivacion.', 15, null::integer, null::integer, null::integer, null::integer, null::integer, 'Ficha de Derivación', 4)
  ) AS rule_data(rule_type, rule_name, description, min_negativas, max_negativas, min_positivas, max_positivas, min_informativas, max_informativas, suggested_letter_type, priority)
),
updated_rules AS (
  UPDATE public.disciplinary_rules rules
  SET
    rule_name = seed_rules.rule_name,
    description = seed_rules.description,
    priority = seed_rules.priority,
    is_active = true,
    updated_at = now()
  FROM seed_rules
  WHERE rules.tenant_id = '00000000-0000-4000-8000-000000000001'
    AND rules.rule_type = seed_rules.rule_type
    AND rules.suggested_letter_type = seed_rules.suggested_letter_type
    AND rules.min_negativas IS NOT DISTINCT FROM seed_rules.min_negativas
    AND rules.max_negativas IS NOT DISTINCT FROM seed_rules.max_negativas
    AND rules.min_positivas IS NOT DISTINCT FROM seed_rules.min_positivas
    AND rules.max_positivas IS NOT DISTINCT FROM seed_rules.max_positivas
    AND rules.min_informativas IS NOT DISTINCT FROM seed_rules.min_informativas
    AND rules.max_informativas IS NOT DISTINCT FROM seed_rules.max_informativas
  RETURNING rules.id
)
INSERT INTO public.disciplinary_rules (
  rule_type,
  rule_name,
  description,
  min_negativas,
  max_negativas,
  min_positivas,
  max_positivas,
  min_informativas,
  max_informativas,
  suggested_letter_type,
  priority,
  is_active,
  tenant_id
)
SELECT
  seed_rules.rule_type,
  seed_rules.rule_name,
  seed_rules.description,
  seed_rules.min_negativas,
  seed_rules.max_negativas,
  seed_rules.min_positivas,
  seed_rules.max_positivas,
  seed_rules.min_informativas,
  seed_rules.max_informativas,
  seed_rules.suggested_letter_type,
  seed_rules.priority,
  true,
  '00000000-0000-4000-8000-000000000001'
FROM seed_rules
WHERE NOT EXISTS (
  SELECT 1
  FROM public.disciplinary_rules rules
  WHERE rules.tenant_id = '00000000-0000-4000-8000-000000000001'
    AND rules.rule_type = seed_rules.rule_type
    AND rules.suggested_letter_type = seed_rules.suggested_letter_type
    AND rules.min_negativas IS NOT DISTINCT FROM seed_rules.min_negativas
    AND rules.max_negativas IS NOT DISTINCT FROM seed_rules.max_negativas
    AND rules.min_positivas IS NOT DISTINCT FROM seed_rules.min_positivas
    AND rules.max_positivas IS NOT DISTINCT FROM seed_rules.max_positivas
    AND rules.min_informativas IS NOT DISTINCT FROM seed_rules.min_informativas
    AND rules.max_informativas IS NOT DISTINCT FROM seed_rules.max_informativas
);

INSERT INTO public.document_templates (id, doc_type, label, system_prompt, tenant_id)
VALUES
  ('tpl_demo_informe_cierre', 'informe_cierre_indagacion', 'Informe de Cierre de Indagacion', 'Elabora un informe tecnico de cierre con antecedentes, hechos acreditados, descargos, analisis de proporcionalidad y medidas propuestas.', '00000000-0000-4000-8000-000000000001'),
  ('tpl_demo_informe_concluyente', 'informe_concluyente', 'Informe Concluyente', 'Elabora un informe concluyente disciplinario y formativo con matriz de evidencia, debido proceso, resolucion fundada y plan de seguimiento.', '00000000-0000-4000-8000-000000000001')
ON CONFLICT (tenant_id, doc_type) DO UPDATE SET
  label = EXCLUDED.label,
  system_prompt = EXCLUDED.system_prompt,
  updated_at = now();

INSERT INTO public.disciplinary_processes (
  id,
  student_id,
  process_number,
  status,
  created_by,
  tenant_id,
  course,
  teacher_name,
  incident_date,
  description,
  suggested_letter_type,
  final_letter_type,
  total_negativas,
  total_positivas,
  total_informativas,
  is_completed
)
VALUES
  ('00000000-0000-4000-8006-000000000001', '00000000-0000-4000-8002-000000000005', 'DP-2026-0001', 'pending', '00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000001', '2 medio B', 'Profesor Jefe Demo Local', '2026-06-10', 'Proceso demo generado desde revision de PDF disciplinario.', 'Ficha de Derivación', null, 16, 0, 1, false)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  suggested_letter_type = EXCLUDED.suggested_letter_type,
  final_letter_type = EXCLUDED.final_letter_type,
  total_negativas = EXCLUDED.total_negativas,
  total_positivas = EXCLUDED.total_positivas,
  total_informativas = EXCLUDED.total_informativas,
  updated_at = now();

INSERT INTO public.disciplinary_process_files (
  id,
  process_id,
  file_name,
  storage_path,
  file_size,
  mime_type,
  file_hash,
  uploaded_by,
  tenant_id,
  bucket,
  original_file_name,
  stored_file_name,
  processing_status,
  analysis_version,
  student_id
)
VALUES
  ('00000000-0000-4000-8007-000000000001', '00000000-0000-4000-8006-000000000001', 'anotaciones-demo.pdf', '00000000-0000-4000-8000-000000000001/00000000-0000-4000-8002-000000000005/00000000-0000-4000-8006-000000000001/anotaciones-demo.pdf', 24576, 'application/pdf', 'seed-demo-pdf-hash', '00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000001', 'disciplinary-processes', 'anotaciones-demo.pdf', 'anotaciones-demo.pdf', 'confirmed', 'seed-v1', '00000000-0000-4000-8002-000000000005')
ON CONFLICT (id) DO UPDATE SET
  file_name = EXCLUDED.file_name,
  storage_path = EXCLUDED.storage_path,
  processing_status = EXCLUDED.processing_status,
  analysis_version = EXCLUDED.analysis_version;

INSERT INTO public.disciplinary_annotations_detected (
  id,
  process_id,
  student_id,
  annotation_type,
  annotation_text,
  page_number,
  annotation_date,
  teacher_name,
  line_number,
  tenant_id,
  raw_text,
  normalized_text,
  category,
  classification_method,
  confidence,
  parser_version
)
VALUES
  ('00000000-0000-4000-8008-000000000001', '00000000-0000-4000-8006-000000000001', '00000000-0000-4000-8002-000000000005', 'Negativa', 'Interrumpe reiteradamente la clase y no acata instrucciones.', 1, '2026-06-10', 'Profesor Jefe Demo Local', 14, '00000000-0000-4000-8000-000000000001', 'Texto crudo demo de anotacion negativa.', 'interrumpe reiteradamente la clase y no acata instrucciones', 'conducta_disruptiva', 'seed', 0.970, 'seed-v1'),
  ('00000000-0000-4000-8008-000000000002', '00000000-0000-4000-8006-000000000001', '00000000-0000-4000-8002-000000000005', 'Información', 'Se informa entrevista preventiva con apoderado.', 2, '2026-06-12', 'Convivencia Demo Local', 22, '00000000-0000-4000-8000-000000000001', 'Texto crudo demo de registro informativo.', 'se informa entrevista preventiva con apoderado', 'informativa', 'seed', 0.940, 'seed-v1')
ON CONFLICT (id) DO UPDATE SET
  annotation_text = EXCLUDED.annotation_text,
  category = EXCLUDED.category,
  confidence = EXCLUDED.confidence,
  parser_version = EXCLUDED.parser_version;

INSERT INTO public.document_analyses (
  id,
  student_id,
  file_name,
  negativas,
  positivas,
  informativas,
  tenant_id,
  process_id,
  file_id,
  status,
  detected_student_name,
  detected_course,
  student_match_status,
  warnings,
  file_hash,
  parser_version,
  confirmed_at,
  confirmed_by
)
VALUES
  ('00000000-0000-4000-8009-000000000001', '00000000-0000-4000-8002-000000000005', 'anotaciones-demo.pdf', 16, 0, 1, '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8006-000000000001', '00000000-0000-4000-8007-000000000001', 'completed', 'Estudiante Demo Derivacion', '2 medio B', 'matched', '[]'::jsonb, 'seed-demo-pdf-hash', 'seed-v1', now(), '00000000-0000-4000-9000-000000000003')
ON CONFLICT (id) DO UPDATE SET
  negativas = EXCLUDED.negativas,
  positivas = EXCLUDED.positivas,
  informativas = EXCLUDED.informativas,
  status = EXCLUDED.status,
  warnings = EXCLUDED.warnings,
  confirmed_at = EXCLUDED.confirmed_at,
  confirmed_by = EXCLUDED.confirmed_by;

INSERT INTO public.student_history_entries (id, student_id, tenant_id, title, description, created_by, created_at)
VALUES
  ('00000000-0000-4000-8010-000000000001', '00000000-0000-4000-8002-000000000005', '00000000-0000-4000-8000-000000000001', 'Seguimiento semanal', 'Registro demo para validar historial manual del estudiante.', '00000000-0000-4000-9000-000000000003', '2026-06-21T15:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

INSERT INTO public.notifications (
  id,
  tenant_id,
  user_id,
  notification_key,
  notification_type,
  title,
  description,
  severity,
  entity_type,
  entity_id,
  action_url,
  expires_at
)
VALUES
  ('00000000-0000-4000-8011-000000000001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000003', 'seed:causa-demo-001:informe-pendiente', 'due_process', 'Informe de cierre pendiente', 'La causa demo de derivacion mantiene el informe de cierre pendiente.', 'warning', 'causa', 'CAUSA-DEMO-001', '/causas/CAUSA-DEMO-001', '2026-07-15T00:00:00Z')
ON CONFLICT (tenant_id, user_id, notification_key) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  severity = EXCLUDED.severity,
  entity_type = EXCLUDED.entity_type,
  entity_id = EXCLUDED.entity_id,
  action_url = EXCLUDED.action_url,
  expires_at = EXCLUDED.expires_at,
  updated_at = now();

INSERT INTO public.report_history (
  id,
  tenant_id,
  created_by,
  report_type,
  status,
  filters,
  row_count,
  file_name,
  completed_at,
  expires_at
)
VALUES
  ('00000000-0000-4000-8012-000000000001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000003', 'anotaciones', 'completed', '{"course":"Todos","schoolYear":2026,"privacyMode":true}'::jsonb, 37, 'reporte-anotaciones-demo-2026.xlsx', now(), '2026-12-31T00:00:00Z'),
  ('00000000-0000-4000-8012-000000000002', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000002', 'expedientes', 'completed', '{"estado":"Todos","responsable":"Todos"}'::jsonb, 3, 'reporte-expedientes-demo-2026.xlsx', now(), '2026-12-31T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  filters = EXCLUDED.filters,
  row_count = EXCLUDED.row_count,
  file_name = EXCLUDED.file_name,
  completed_at = EXCLUDED.completed_at,
  expires_at = EXCLUDED.expires_at;

INSERT INTO public.institution_settings (
  tenant_id,
  official_name,
  institution_rut,
  address,
  commune,
  region,
  phone,
  institutional_email,
  proprietor,
  director_name,
  education_levels,
  updated_by
)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Colegio Demo Convivencia',
  '76.000.000-0',
  'Av. Demo 123',
  'Santiago',
  'Region Metropolitana',
  '+56 2 2000 0000',
  'contacto.demo.local@example.local',
  'Sostenedor Demo',
  'Direccion Demo Local',
  ARRAY['BASICA', 'MEDIA'],
  '00000000-0000-4000-9000-000000000002'
)
ON CONFLICT (tenant_id) DO UPDATE SET
  official_name = EXCLUDED.official_name,
  institution_rut = EXCLUDED.institution_rut,
  address = EXCLUDED.address,
  commune = EXCLUDED.commune,
  region = EXCLUDED.region,
  phone = EXCLUDED.phone,
  institutional_email = EXCLUDED.institutional_email,
  proprietor = EXCLUDED.proprietor,
  director_name = EXCLUDED.director_name,
  education_levels = EXCLUDED.education_levels,
  updated_by = EXCLUDED.updated_by,
  updated_at = now();

INSERT INTO public.institution_rule_versions (
  id,
  tenant_id,
  title,
  version,
  content,
  status,
  effective_at,
  created_by,
  published_by
)
VALUES
  ('00000000-0000-4000-8013-000000000001', '00000000-0000-4000-8000-000000000001', 'Reglamento Interno Demo', '2026-demo', 'Contenido demo para validar carga de reglamento institucional, busqueda y version activa.', 'active', '2026-03-01T00:00:00Z', '00000000-0000-4000-9000-000000000002', '00000000-0000-4000-9000-000000000002')
ON CONFLICT (tenant_id, version) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  status = EXCLUDED.status,
  effective_at = EXCLUDED.effective_at,
  published_by = EXCLUDED.published_by,
  updated_at = now();

INSERT INTO public.institution_documents (
  id,
  tenant_id,
  title,
  category,
  original_name,
  storage_path,
  mime_type,
  size_bytes,
  status,
  uploaded_by
)
VALUES (
  '00000000-0000-4000-8014-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Reglamento demo cargado',
  'reglamento',
  'reglamento-demo.pdf',
  '00000000-0000-4000-8000-000000000001/documentos/reglamento-demo.pdf',
  'application/pdf',
  32768,
  'active',
  '00000000-0000-4000-9000-000000000002'
)
ON CONFLICT (storage_path) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  original_name = EXCLUDED.original_name,
  mime_type = EXCLUDED.mime_type,
  size_bytes = EXCLUDED.size_bytes,
  status = EXCLUDED.status,
  uploaded_by = EXCLUDED.uploaded_by;

INSERT INTO public.membership_invitations (
  id,
  tenant_id,
  email,
  role,
  application_code,
  invited_by,
  status,
  created_at,
  updated_at,
  last_sent_at
)
SELECT
  '00000000-0000-4000-8015-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'nuevo.staff.demo.local@example.local',
  'staff',
  'convivencia',
  '00000000-0000-4000-9000-000000000002',
  'pending',
  now(),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.membership_invitations invitation
  WHERE invitation.tenant_id = '00000000-0000-4000-8000-000000000001'
    AND invitation.email = 'nuevo.staff.demo.local@example.local'
    AND invitation.status = 'pending'
);

INSERT INTO public.audit_events (
  id,
  tenant_id,
  actor_user_id,
  action,
  entity_type,
  entity_id,
  previous_values,
  new_values,
  occurred_at
)
VALUES
  ('00000000-0000-4000-8016-000000000001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000002', 'seed.local.loaded', 'tenant', '00000000-0000-4000-8000-000000000001', null, '{"source":"supabase/seed.sql"}'::jsonb, now())
ON CONFLICT (id) DO NOTHING;
