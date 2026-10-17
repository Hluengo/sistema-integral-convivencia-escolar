-- #8: usage_events no tenía tenant_id. La ruta /api/usage/log ya insertaba la
-- columna (el INSERT fallaba con "column does not exist" y el evento se
-- perdía), y la política de SELECT dejaba que un admin/dirección leyera los
-- eventos de todos los colegios.
--
-- Se agrega tenant_id, se rellena desde el perfil del usuario y se acotan la
-- política de SELECT y las RPC de estadísticas al colegio propio.
-- Verificado antes de aplicar: 2 eventos, 0 sin tenant resoluble.

alter table public.usage_events add column if not exists tenant_id uuid;

update public.usage_events e
   set tenant_id = p.tenant_id
  from public.profiles p
 where p.user_id = e.user_id
   and e.tenant_id is null;

create index if not exists idx_usage_events_tenant_created
  on public.usage_events (tenant_id, created_at);

drop policy if exists usage_events_insert_own on public.usage_events;
create policy usage_events_insert_own on public.usage_events
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (tenant_id is null or tenant_id = public.current_tenant_id())
  );

drop policy if exists usage_events_select_admin on public.usage_events;
create policy usage_events_select_admin on public.usage_events
  for select to authenticated
  using (
    public.current_app_role() = any (array['admin', 'direccion'])
    and tenant_id = public.current_tenant_id()
  );

-- Las RPC agregaban sin filtrar por colegio. Se reemplazan por versiones que
-- reciben el tenant (las llama el servidor con service_role).

drop function if exists public.get_usage_stats(timestamptz, timestamptz);
create function public.get_usage_stats(
  p_tenant_id uuid,
  since timestamptz default (now() - '30 days'::interval),
  until timestamptz default now()
)
returns table(
  event_name text,
  total_count bigint,
  unique_users bigint,
  last_occurrence timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select e.event_name,
         count(*)::bigint as total_count,
         count(distinct e.user_id)::bigint as unique_users,
         max(e.created_at) as last_occurrence
    from public.usage_events e
   where e.tenant_id = p_tenant_id
     and e.created_at >= since
     and e.created_at <= until
   group by e.event_name
   order by count(*) desc
$$;

revoke all on function public.get_usage_stats(uuid, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_usage_stats(uuid, timestamptz, timestamptz)
  to service_role;

drop function if exists public.get_daily_active_users(timestamptz, timestamptz);
create function public.get_daily_active_users(
  p_tenant_id uuid,
  since timestamptz default (now() - '30 days'::interval),
  until timestamptz default now()
)
returns table(date date, active_users bigint)
language sql
stable
security definer
set search_path to 'public'
as $$
  select e.created_at::date as date,
         count(distinct e.user_id)::bigint as active_users
    from public.usage_events e
   where e.tenant_id = p_tenant_id
     and e.created_at >= since
     and e.created_at <= until
     and e.user_id is not null
   group by e.created_at::date
   order by 1
$$;

revoke all on function public.get_daily_active_users(uuid, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_daily_active_users(uuid, timestamptz, timestamptz)
  to service_role;
