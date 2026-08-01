-- @license SPDX-License-Identifier: Apache-2.0
-- Diagnóstico de solo lectura para reconciliar migraciones remotas.
-- Ejecutar en Supabase Dashboard > SQL Editor.
-- No modifica tablas, datos, políticas ni historial.

-- 1. Historial que Supabase considera aplicado.
select version
from supabase_migrations.schema_migrations
order by version;

-- 2. Tablas nuevas esperadas y su existencia real.
select
  expected.table_name,
  to_regclass('public.' || expected.table_name) is not null as exists_in_public
from (
  values
    ('applications'),
    ('app_memberships'),
    ('audit_events'),
    ('membership_invitations'),
    ('notifications'),
    ('report_history')
) as expected(table_name)
order by expected.table_name;

-- 3. Columnas críticas para comprobar que no basta con que exista la tabla.
select
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'app_memberships' and column_name in
      ('tenant_id', 'user_id', 'application_code', 'role', 'is_active'))
    or (table_name = 'audit_events' and column_name in
      ('tenant_id', 'actor_user_id', 'action', 'entity_type', 'entity_id',
       'previous_values', 'new_values', 'occurred_at'))
    or (table_name = 'membership_invitations' and column_name in
      ('tenant_id', 'email', 'role', 'status', 'invited_by'))
    or (table_name = 'notifications' and column_name in
      ('tenant_id', 'user_id', 'notification_key', 'read_at', 'expires_at'))
    or (table_name = 'report_history' and column_name in
      ('tenant_id', 'created_by', 'report_type', 'filters', 'status'))
  )
order by table_name, ordinal_position;

-- 4. Políticas RLS relevantes.
select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'applications',
    'app_memberships',
    'audit_events',
    'membership_invitations',
    'notifications',
    'report_history'
  )
order by tablename, policyname;

-- 5. Triggers y funciones append-only de auditoría.
select
  n.nspname as schema_name,
  c.relname as table_name,
  t.tgname as trigger_name,
  pg_get_triggerdef(t.oid) as trigger_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal
  and n.nspname = 'public'
  and c.relname in ('audit_events', 'profiles')
order by c.relname, t.tgname;
