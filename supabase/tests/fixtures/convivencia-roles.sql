-- Identidades de prueba: el perfil no concede los permisos de Convivencia.
do $$ begin
  if current_database() not like 'runbook_audit_%' then
    raise exception 'Fixtures restringidos a la base aislada del runbook';
  end if;
end $$;
create temporary table fixture_roles as
select n, ('40000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid as user_id,
       role, n <= 7 as can_write, n <= 3 as can_admin
from unnest(array['superadmin','admin','direccion','convivencia','inspectoria','inspector','staff','teacher','profesor_jefe','user','admin','admin','admin']) with ordinality as r(role, n);
grant select on fixture_roles to authenticated;
insert into public.tenants (id, name, slug) values
  ('30000000-0000-4000-8000-000000000001', 'Colegio ficticio A', 'roles-a'),
  ('30000000-0000-4000-8000-000000000002', 'Colegio ficticio B', 'roles-b');
insert into public.applications (code, name, is_active) values
  ('convivencia', 'Convivencia de prueba', true), ('inasistencias', 'Inasistencias de prueba', true);
insert into auth.users (id, email) select user_id, 'roles-' || n || '@example.invalid' from fixture_roles;
insert into public.profiles (user_id, tenant_id, role, is_active)
select user_id, '30000000-0000-4000-8000-000000000001', case when n = 13 then 'admin' else 'teacher' end, n <> 12
from fixture_roles
on conflict (user_id) do update set tenant_id = excluded.tenant_id, role = excluded.role, is_active = excluded.is_active;
update public.app_memberships m set role = f.role, is_active = f.n <> 11
from fixture_roles f where f.user_id = m.user_id and m.application_code = 'convivencia';
delete from public.app_memberships where user_id = '40000000-0000-4000-8000-000000000013';
insert into public.app_memberships (tenant_id, user_id, application_code, role)
values ('30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000013', 'inasistencias', 'admin');

insert into public.courses (id, name, tenant_id) values
  ('50000000-0000-4000-8000-000000000001', '8 A', '30000000-0000-4000-8000-000000000001'),
  ('50000000-0000-4000-8000-000000000002', '8 B', '30000000-0000-4000-8000-000000000002');
insert into public.students (id, full_name, course_id, tenant_id) values
  ('60000000-0000-4000-8000-000000000001', 'Estudiante ficticio uno', '50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001'),
  ('60000000-0000-4000-8000-000000000002', 'Estudiante ficticio dos', '50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001'),
  ('60000000-0000-4000-8000-000000000003', 'Estudiante ficticio ajeno', '50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002');

create function pg_temp.must_deny(statement text) returns void language plpgsql security invoker as $$
declare affected integer;
begin
  begin
    execute statement;
    get diagnostics affected = row_count;
  exception when insufficient_privilege then return;
  end;
  if affected > 0 then raise exception 'Escritura no autorizada permitida'; end if;
end $$;
