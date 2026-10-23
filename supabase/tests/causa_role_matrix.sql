-- El ejecutor antepone fixtures/convivencia-roles.sql dentro de una transacción.
insert into public.causas (id, tenant_id, estudiante_nombre, estudiante_curso, nna_protected_name, run_estudiante, fecha_apertura, estado_actual, tipo_infraccion, responsable, fecha_ultima_actualizacion)
values
  ('A04-protected', '30000000-0000-4000-8000-000000000001', 'Estudiante ficticio', '8 A', 'E. F.', '', '2026-10-22', 'Recepción de Denuncia', 'Grave', 'Inspectoría ficticia', '2026-10-22'),
  ('A04-foreign', '30000000-0000-4000-8000-000000000002', 'Estudiante ficticio ajeno', '8 B', 'E. F.', '', '2026-10-22', 'Recepción de Denuncia', 'Grave', 'Inspectoría ficticia', '2026-10-22');
insert into public.checklist_items (id, causa_id, tenant_id, label, requerido_por)
values ('chk_rec_1', 'A04-protected', '30000000-0000-4000-8000-000000000001', 'Recepción de Denuncia', 'Circular 482');
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
do $$
declare actor record; incident_id uuid; case_id text; affected integer;
begin
  for actor in select * from fixture_roles order by n loop
    perform set_config('request.jwt.claim.sub', actor.user_id::text, true);
    if actor.can_write then
      insert into public.incidentes (tenant_id, descripcion)
      values ('30000000-0000-4000-8000-000000000001', 'Hechos ficticios de prueba') returning id into incident_id;
      case_id := 'A04-' || actor.n;
      insert into public.causas (id, tenant_id, incidente_id, estudiante_nombre, estudiante_curso, nna_protected_name, run_estudiante, fecha_apertura, estado_actual, tipo_infraccion, responsable, fecha_ultima_actualizacion)
      values (case_id, '30000000-0000-4000-8000-000000000001', incident_id, 'Estudiante ficticio', '8 A', 'E. F.', '', '2026-10-22', 'Causa Cerrada', 'Grave', 'Inspectoría ficticia', '2026-10-22');
      insert into public.checklist_items (id, causa_id, label, requerido_por) values ('chk_rec_1', case_id, 'Recepción de Denuncia', 'Circular 482');
      insert into public.bitacora_entries (id, causa_id, fecha, tipo, titulo) values ('b-' || case_id, case_id, '2026-10-22', 'Otro', 'Registro ficticio');
      insert into public.checklist_progress_entries (causa_id, checklist_item_id, title, description, entry_type)
      values (case_id, 'chk_rec_1', 'Avance ficticio', 'Descripción ficticia de prueba', 'Otro');
      insert into public.causa_documents (causa_id, doc_type, student_name, apoderado_name, course)
      values (case_id, 'notificacion_inicio_indagacion', 'Estudiante ficticio', 'Apoderado ficticio', '8 A');
      update public.causas set observaciones = 'Edición ficticia' where id = case_id;
      get diagnostics affected = row_count;
      assert affected = 1, 'El rol operativo no pudo editar su expediente';
      if actor.can_admin then
        update public.causas set estado_actual = 'En Proceso de Seguimiento' where id = case_id;
        assert public.delete_causa_cascade(case_id), 'La administración no pudo borrar el expediente con sus relaciones';
      else
        perform pg_temp.must_deny(format('update public.causas set estado_actual = ''En Proceso de Seguimiento'' where id = %L', case_id));
        perform pg_temp.must_deny(format('delete from public.causas where id = %L', case_id));
      end if;
      perform pg_temp.must_deny($sql$insert into public.incidentes (tenant_id) values ('30000000-0000-4000-8000-000000000002')$sql$);
      perform pg_temp.must_deny($sql$update public.causas set student_id = '60000000-0000-4000-8000-000000000003' where id = 'A04-protected'$sql$);
    else
      perform pg_temp.must_deny($sql$insert into public.incidentes (tenant_id) values ('30000000-0000-4000-8000-000000000001')$sql$);
      perform pg_temp.must_deny($sql$update public.causas set observaciones = 'No autorizado' where id = 'A04-protected'$sql$);
      perform pg_temp.must_deny($sql$insert into public.bitacora_entries (id, causa_id, fecha, tipo, titulo) values ('no-autorizado', 'A04-protected', '2026-10-22', 'Otro', 'No autorizado')$sql$);
      perform pg_temp.must_deny($sql$insert into public.checklist_progress_entries (causa_id, checklist_item_id, title, description, entry_type) values ('A04-protected', 'chk_rec_1', 'No autorizado', 'No autorizado', 'Otro')$sql$);
      perform pg_temp.must_deny($sql$insert into public.causa_documents (causa_id, doc_type, student_name, apoderado_name, course) values ('A04-protected', 'notificacion_inicio_indagacion', 'No autorizado', 'No autorizado', '8 A')$sql$);
      assert (select exists (select 1 from public.causas where id = 'A04-protected')) = (actor.n <= 10), 'La lectura no respetó la membresía o vigencia del perfil';
    end if;
    assert not exists (select 1 from public.causas where id = 'A04-foreign'), 'Se leyó un expediente de otro colegio';
    perform pg_temp.must_deny($sql$update public.causas set observaciones = 'Otro colegio' where id = 'A04-foreign'$sql$);
  end loop;
end $$;
reset role;
select 'A04: siete roles operativos, docentes de solo lectura, revocación, perfil inactivo y tenant ajeno' as resultado;
