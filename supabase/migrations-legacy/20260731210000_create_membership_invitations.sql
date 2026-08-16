-- @license SPDX-License-Identifier: Apache-2.0
-- Fase B: gestión administrativa de miembros e invitaciones.

begin;

alter table public.profiles
  add column if not exists is_active boolean not null default true;

create index if not exists idx_profiles_tenant_active
  on public.profiles (tenant_id, is_active);

create table public.membership_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  email text not null,
  role text not null,
  application_code text not null default 'convivencia'
    references public.applications(code),
  auth_user_id uuid,
  invited_by uuid not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_sent_at timestamptz not null default now(),
  cancelled_at timestamptz,
  accepted_at timestamptz,
  constraint membership_invitations_email_format
    check (email = lower(btrim(email)) and position('@' in email) > 1),
  constraint membership_invitations_status_check
    check (status in ('pending', 'accepted', 'cancelled')),
  constraint membership_invitations_role_check
    check (role in (
      'admin', 'direccion', 'convivencia', 'inspectoria', 'profesor_jefe',
      'teacher', 'inspector', 'user', 'staff'
    ))
);

comment on table public.membership_invitations is
  'Invitaciones administrativas por tenant; la entrega del correo la realiza Supabase Auth.';

create unique index membership_invitations_pending_email_idx
  on public.membership_invitations (tenant_id, email)
  where status = 'pending';
create index membership_invitations_tenant_created_idx
  on public.membership_invitations (tenant_id, created_at desc);
create index membership_invitations_auth_user_idx
  on public.membership_invitations (auth_user_id);

alter table public.membership_invitations enable row level security;
revoke all on table public.membership_invitations from public, anon, authenticated;
grant all on table public.membership_invitations to service_role;
grant all on table public.membership_invitations to postgres;

commit;

select pg_notify('pgrst', 'reload schema');
