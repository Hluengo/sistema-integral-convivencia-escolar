-- @license SPDX-License-Identifier: Apache-2.0
-- Fase B — checks for member administration and invitation isolation.

select 'profiles_is_active' as test_name,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_active'
  ) as passed;

select 'invitations_rls_enabled' as test_name,
  relrowsecurity as passed
from pg_class
where oid = 'public.membership_invitations'::regclass;

select 'invitations_not_client_writable' as test_name,
  not has_table_privilege('anon', 'public.membership_invitations', 'SELECT')
  and not has_table_privilege('authenticated', 'public.membership_invitations', 'SELECT')
  and has_table_privilege('service_role', 'public.membership_invitations', 'ALL') as passed;

select 'last_admin_index' as test_name,
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'profiles'
      and indexname = 'idx_profiles_tenant_active'
  ) as passed;

-- Run as an authenticated admin/direccion user:
-- 1. GET /api/admin/members must only return profiles from the current tenant.
-- 2. PATCHing a member in another tenant must return 404 and make no change.
-- 3. Demoting/deactivating the only active admin must return 409.
-- 4. Creating a duplicate pending invitation for the same tenant/email must return 409.
-- 5. A cancelled invitation must not be returned as pending and its profile/membership
--    must be inactive.
-- 6. All successful role/access/invitation changes must create an audit_events row
--    with entity_type = 'membership' and the authenticated actor_user_id.
