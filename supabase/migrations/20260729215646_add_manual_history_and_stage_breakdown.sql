-- Manual student history entries and live annotation KPI breakdown.

create table public.student_history_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  tenant_id uuid not null default public.current_tenant_id()
    references public.tenants(id) on delete cascade,
  title text not null,
  description text not null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint student_history_entries_title_length
    check (char_length(btrim(title)) between 3 and 120),
  constraint student_history_entries_description_length
    check (char_length(btrim(description)) between 3 and 2000)
);

comment on table public.student_history_entries is
  'Immutable manual events recorded in a student disciplinary history.';
comment on column public.student_history_entries.created_by is
  'Auth user UUID captured for audit; intentionally retained without an FK if the account is removed.';

create index student_history_entries_tenant_student_created_idx
  on public.student_history_entries (tenant_id, student_id, created_at desc);

alter table public.student_history_entries enable row level security;

create policy student_history_entries_select_tenant
  on public.student_history_entries
  for select
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_app_role() = any (
      array['admin', 'direccion', 'convivencia', 'inspectoria', 'inspector', 'staff', 'superuser']
    )
  );

create policy student_history_entries_insert_tenant
  on public.student_history_entries
  for insert
  to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and created_by = auth.uid()
    and public.current_app_role() = any (
      array['admin', 'direccion', 'convivencia', 'inspectoria', 'inspector', 'staff', 'superuser']
    )
    and exists (
      select 1
      from public.students s
      where s.id = student_id
        and s.tenant_id = public.current_tenant_id()
    )
  );

-- History is append-only: these explicit policies document that browser updates and deletes are denied.
create policy student_history_entries_update_denied
  on public.student_history_entries
  for update
  to authenticated
  using (false)
  with check (false);

create policy student_history_entries_delete_denied
  on public.student_history_entries
  for delete
  to authenticated
  using (false);

revoke all on table public.student_history_entries from public, anon, authenticated, service_role;
grant select on table public.student_history_entries to authenticated;
grant insert (student_id, title, description) on table public.student_history_entries
  to authenticated;
grant all on table public.student_history_entries to service_role;

drop function if exists public.get_annotation_stage_counts();

create function public.get_annotation_stage_counts()
returns table (
  stage text,
  total_count bigint,
  pending_count bigint,
  processed_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with tenant_scope as (
    select
      public.current_tenant_id() as tenant_id,
      extract(year from timezone('America/Santiago', now()))::integer as school_year
  ),
  negative_counts as (
    select
      s.id as student_id,
      count(ir.id) filter (where ir.type = 'Negativa')::integer as negatives
    from public.students s
    cross join tenant_scope scope
    left join public.inspectorate_records ir
      on ir.student_id = s.id
     and ir.tenant_id = scope.tenant_id
    where s.tenant_id = scope.tenant_id
    group by s.id
  ),
  completed_letters as (
    select
      c.student_id,
      max(
        case
          when c.letter_type in ('Ficha de Derivación', 'Derivación a Convivencia Escolar') then 3
          when c.letter_type = 'Carta de Compromiso Conductual' then 2
          when c.letter_type = 'Amonestación Escrita' then 1
          else 0
        end
      )::integer as completed_rank
    from public.cartas_disciplinarias c
    cross join tenant_scope scope
    where c.tenant_id = scope.tenant_id
      and c.status <> 'Anulada'
      and coalesce(c.school_year, extract(year from c.emission_date)::integer) = scope.school_year
      and (
        c.origin = 'physical'
        or exists (
          select 1
          from public.carta_events ce
          where ce.carta_id = c.id::text
            and ce.student_id = c.student_id::text
            and ce.tenant_id = c.tenant_id
            and ce.event_type in ('registered', 'printed', 'processed_manually')
        )
      )
    group by c.student_id
  ),
  classified as (
    select
      greatest(
        case
          when nc.negatives >= 15 then 3
          when nc.negatives >= 10 then 2
          when nc.negatives >= 5 then 1
          else 0
        end,
        coalesce(cl.completed_rank, 0)
      ) as effective_rank,
      coalesce(cl.completed_rank, 0) as completed_rank
    from negative_counts nc
    left join completed_letters cl on cl.student_id = nc.student_id
    where nc.negatives > 0 or coalesce(cl.completed_rank, 0) > 0
  ),
  aggregated as (
    select
      effective_rank,
      count(*)::bigint as total_count,
      count(*) filter (
        where not (effective_rank > 0 and completed_rank = effective_rank)
      )::bigint as pending_count,
      count(*) filter (
        where effective_rank > 0 and completed_rank = effective_rank
      )::bigint as processed_count
    from classified
    group by effective_rank
  ),
  stage_catalog(stage, stage_rank) as (
    values
      ('sin_carta'::text, 0),
      ('amonestacion'::text, 1),
      ('compromiso'::text, 2),
      ('derivacion'::text, 3)
  )
  select
    catalog.stage,
    coalesce(aggregated.total_count, 0)::bigint,
    coalesce(aggregated.pending_count, 0)::bigint,
    coalesce(aggregated.processed_count, 0)::bigint
  from stage_catalog catalog
  left join aggregated on aggregated.effective_rank = catalog.stage_rank
  order by catalog.stage_rank;
$$;

revoke all on function public.get_annotation_stage_counts() from public, anon;
grant execute on function public.get_annotation_stage_counts() to authenticated, service_role;

comment on function public.get_annotation_stage_counts() is
  'Live tenant-scoped annotation stages split into pending and processed using current-year completed carta events.';
