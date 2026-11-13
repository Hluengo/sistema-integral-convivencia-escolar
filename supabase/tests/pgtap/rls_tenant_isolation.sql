-- RLS: un usuario del tenant A no ve ni escribe causas del tenant B.
-- Fixtures ficticios dentro de una transacción con rollback: no persiste nada.
begin;
create extension if not exists pgtap;
select plan(3);

-- Fixtures (como superusuario; RLS todavía no aplica).
insert into public.tenants (id, name, slug) values
  ('70000000-0000-4000-8000-000000000001', 'Colegio RLS A', 'rls-a'),
  ('70000000-0000-4000-8000-000000000002', 'Colegio RLS B', 'rls-b');

insert into public.applications (code, name, is_active)
values ('convivencia', 'Convivencia de prueba', true)
on conflict (code) do update set is_active = true;

insert into auth.users (id, email)
values ('80000000-0000-4000-8000-000000000001', 'rls-a@example.invalid');

insert into public.profiles (user_id, tenant_id, role, is_active)
values (
  '80000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  'convivencia',
  true
);

-- El trigger de profiles crea la membresía de convivencia; el ON CONFLICT la normaliza.
insert into public.app_memberships (tenant_id, user_id, application_code, role, is_active)
values (
  '70000000-0000-4000-8000-000000000001',
  '80000000-0000-4000-8000-000000000001',
  'convivencia',
  'convivencia',
  true
)
on conflict (tenant_id, user_id, application_code)
do update set role = excluded.role, is_active = excluded.is_active;

insert into public.causas (
  id, tenant_id, estudiante_nombre, estudiante_curso, nna_protected_name,
  run_estudiante, fecha_apertura, estado_actual, tipo_infraccion, responsable,
  fecha_ultima_actualizacion
) values
  ('RLS-A', '70000000-0000-4000-8000-000000000001', 'Estudiante ficticio A', '8 A', 'E. F.', '', '2026-11-13', 'Recepción de Denuncia', 'Grave', 'Inspectoría ficticia', '2026-11-13'),
  ('RLS-B', '70000000-0000-4000-8000-000000000002', 'Estudiante ficticio B', '8 B', 'E. F.', '', '2026-11-13', 'Recepción de Denuncia', 'Grave', 'Inspectoría ficticia', '2026-11-13');

set local role authenticated;
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*)::int from public.causas where id = 'RLS-B'),
  0,
  'RLS: un usuario de A no ve causas de B'
);

select is(
  (select count(*)::int from public.causas where id = 'RLS-A'),
  1,
  'RLS: un usuario de A sí ve las causas de A'
);

select throws_ok(
  $$ insert into public.causas (
       id, tenant_id, estudiante_nombre, estudiante_curso, nna_protected_name,
       run_estudiante, fecha_apertura, estado_actual, tipo_infraccion, responsable,
       fecha_ultima_actualizacion
     ) values (
       'RLS-X', '70000000-0000-4000-8000-000000000002', 'Estudiante ficticio X', '8 B', 'E. F.',
       '', '2026-11-13', 'Recepción de Denuncia', 'Grave', 'Inspectoría ficticia', '2026-11-13'
     ) $$,
  '42501',
  null,
  'RLS: no se puede escribir una causa en otro tenant'
);

reset role;
select * from finish();
rollback;
