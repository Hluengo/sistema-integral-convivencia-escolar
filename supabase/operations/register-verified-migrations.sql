-- @license SPDX-License-Identifier: Apache-2.0
-- Registra únicamente migraciones ya aplicadas y verificadas.
-- No ejecuta DDL, no modifica datos de aplicación y no toca versiones históricas.
-- Ejecutar en Supabase Dashboard > SQL Editor como una sola consulta.

begin;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'document_templates'
      and indexname = 'document_templates_tenant_doc_type_key'
  ) or exists (
    select 1
    from pg_constraint
    where conrelid = 'public.document_templates'::regclass
      and conname = 'document_templates_doc_type_key'
  ) then
    raise exception 'Precondición fallida: document_templates no coincide con 20260801090000';
  end if;

  if not exists (select 1 from pg_class where oid = 'public.institution_settings'::regclass and relrowsecurity)
     or not exists (select 1 from pg_class where oid = 'public.institution_rule_versions'::regclass and relrowsecurity)
     or not exists (select 1 from storage.buckets where id = 'institution-assets' and public = false)
     or not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'institution_assets_select')
     or not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'institution_assets_write') then
    raise exception 'Precondición fallida: configuración institucional incompleta';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    raise exception 'Precondición fallida: notifications no está en supabase_realtime';
  end if;
end $$;

insert into supabase_migrations.schema_migrations(version)
select version
from (values
  ('20260801090000'),
  ('20260801100000'),
  ('20260801120000')
) as verified(version)
on conflict (version) do nothing;

commit;

select version
from supabase_migrations.schema_migrations
where version in ('20260801090000', '20260801100000', '20260801120000')
order by version;
