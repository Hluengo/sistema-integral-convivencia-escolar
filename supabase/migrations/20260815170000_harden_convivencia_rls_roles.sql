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