-- Read-only checks for the platform superadmin membership.
-- Execute in Supabase SQL Editor only after reviewing the migration.

select
  'superadmin_profile' as check_name,
  count(*) = 1 as passed,
  jsonb_agg(jsonb_build_object(
    'email', email,
    'role', role,
    'is_active', is_active,
    'tenant_id', tenant_id
  )) as result
from public.profiles
where role = 'superadmin';

select
  'superadmin_convivencia_membership' as check_name,
  count(*) = count(*) filter (where role = 'superadmin' and is_active)
    and count(*) >= 1 as passed,
  jsonb_agg(jsonb_build_object(
    'user_id', user_id,
    'tenant_id', tenant_id,
    'role', role,
    'is_active', is_active
  )) as result
from public.app_memberships
where application_code = 'convivencia'
  and user_id in (select user_id from public.profiles where role = 'superadmin');

select
  'sync_trigger_includes_superadmin' as check_name,
  pg_get_functiondef(p.oid) like '%superadmin%' as passed,
  p.proname as result
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'sync_convivencia_membership_from_profile';
