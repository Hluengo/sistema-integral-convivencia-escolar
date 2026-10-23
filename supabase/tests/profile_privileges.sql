-- Regresión A01: identidades ficticias, RLS real y rollback de todos los fixtures.
-- Ejecutar con psql -v ON_ERROR_STOP=1 solo en la copia aislada del runbook.
begin;
do $$ begin
  if current_database() not like 'runbook_audit_%' then
    raise exception 'Prueba restringida a una base aislada del runbook';
  end if;
end $$;

insert into public.tenants (id, name, slug) values
  ('20000000-0000-4000-8000-000000000001', 'Colegio ficticio A', 'runbook-a'),
  ('20000000-0000-4000-8000-000000000002', 'Colegio ficticio B', 'runbook-b');
insert into public.applications (code, name, is_active) values
  ('convivencia', 'Convivencia de prueba', true),
  ('inasistencias', 'Inasistencias de prueba', true);
insert into auth.users (id, email)
select ('10000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
       'fixture-' || n || '@example.invalid'
from generate_series(1, 13) n;

insert into public.profiles (user_id, tenant_id, role, is_active) values
  ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', null, true),
  ('10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'admin', false),
  ('10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'admin', true),
  ('10000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', 'teacher', true),
  ('10000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', 'admin', true),
  ('10000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000002', 'admin', true),
  ('10000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000001', 'superadmin', true),
  ('10000000-0000-4000-8000-000000000009', null, null, true),
  ('10000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000001', 'admin', true),
  ('10000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000001', 'teacher', true)
on conflict (user_id) do update set tenant_id = excluded.tenant_id,
  role = excluded.role, is_active = excluded.is_active;
delete from public.profiles where user_id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000012',
  '10000000-0000-4000-8000-000000000013'
);
update public.app_memberships set is_active = false where user_id in (
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000010'
);
insert into public.app_memberships (tenant_id, user_id, application_code, role, is_active)
values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000010', 'inasistencias', 'admin', true);
create temporary table original_profiles as select user_id, role, tenant_id, is_active from public.profiles;
create temporary table original_memberships as select id, role, is_active from public.app_memberships;

create function pg_temp.must_deny(statement text) returns void
language plpgsql security invoker as $$
declare affected integer;
begin
  begin
    execute statement;
    get diagnostics affected = row_count;
  exception when insufficient_privilege then
    return;
  end;
  if affected > 0 then
    raise exception 'Se permitió una modificación de privilegios no autorizada';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select pg_temp.must_deny($sql$insert into public.profiles (user_id, tenant_id, role)
  values (auth.uid(), '20000000-0000-4000-8000-000000000001', 'admin')$sql$);

do $$
declare actor uuid;
begin
  foreach actor in array array[
    '10000000-0000-4000-8000-000000000002'::uuid,
    '10000000-0000-4000-8000-000000000003'::uuid,
    '10000000-0000-4000-8000-000000000004'::uuid,
    '10000000-0000-4000-8000-000000000005'::uuid,
    '10000000-0000-4000-8000-000000000009'::uuid
  ] loop
    perform set_config('request.jwt.claim.sub', actor::text, true);
    perform pg_temp.must_deny('update public.profiles set role = ''direccion'' where user_id = auth.uid()');
    perform pg_temp.must_deny('update public.profiles set tenant_id = ''20000000-0000-4000-8000-000000000002'' where user_id = auth.uid()');
    perform pg_temp.must_deny('update public.profiles set is_active = not is_active where user_id = auth.uid()');
  end loop;
end $$;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000007', true);
select pg_temp.must_deny($sql$update public.profiles set role = 'admin'
  where user_id = '10000000-0000-4000-8000-000000000011'$sql$);
reset role;
do $$ begin
  assert not exists (
    (select user_id, role, tenant_id, is_active from public.profiles except select user_id, role, tenant_id, is_active from original_profiles)
    union all
    (select user_id, role, tenant_id, is_active from original_profiles except select user_id, role, tenant_id, is_active from public.profiles)
  ), 'Una denegación alteró un perfil';
  assert not exists (
    (select id, role, is_active from public.app_memberships except select id, role, is_active from original_memberships)
    union all
    (select id, role, is_active from original_memberships except select id, role, is_active from public.app_memberships)
  ), 'Una denegación alteró membresías';
end $$;
select 'A01: sin perfil, rol nulo, inactivo, revocado, docente y otro colegio rechazados sin efectos' as resultado;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
update public.profiles set full_name = 'Nombre ficticio corregido' where user_id = auth.uid();
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);
update public.profiles set role = 'staff' where user_id = '10000000-0000-4000-8000-000000000011';
update public.profiles set role = role where user_id = '10000000-0000-4000-8000-000000000004';
select pg_temp.must_deny($sql$update public.profiles set role = 'admin'
  where user_id = '10000000-0000-4000-8000-000000000008'$sql$);
select pg_temp.must_deny($sql$insert into public.profiles (user_id, tenant_id, role)
  values ('10000000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000002', 'admin')$sql$);
insert into public.profiles (user_id, tenant_id, role)
values ('10000000-0000-4000-8000-000000000013', '20000000-0000-4000-8000-000000000001', 'teacher');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000010', true);
update public.profiles set full_name = 'Administración ficticia compartida' where user_id = auth.uid();
update public.profiles set role = 'direccion' where user_id = auth.uid();
reset role;
do $$ begin
  assert (select full_name = 'Nombre ficticio corregido' from public.profiles where user_id = '10000000-0000-4000-8000-000000000005');
  assert (select role = 'staff' from public.profiles where user_id = '10000000-0000-4000-8000-000000000011');
  assert (select role = 'staff' and is_active from public.app_memberships where user_id = '10000000-0000-4000-8000-000000000011');
  assert not (select is_active from public.app_memberships where user_id = '10000000-0000-4000-8000-000000000004'), 'Una actualización sin cambios reactivó una membresía revocada';
  assert not exists (select 1 from public.app_memberships where user_id = '10000000-0000-4000-8000-000000000003' and is_active), 'Un perfil inactivo obtuvo membresía activa';
  assert not (select is_active from public.app_memberships where user_id = '10000000-0000-4000-8000-000000000010' and application_code = 'convivencia'), 'La administración de Inasistencias reactivó Convivencia';
  assert (select is_active and role = 'admin' from public.app_memberships where user_id = '10000000-0000-4000-8000-000000000010' and application_code = 'inasistencias'), 'Se alteró la membresía del otro consumidor';
end $$;
select 'A01: edición no privilegiada, administración del tenant y revocaciones preservadas' as resultado;
rollback;
