-- Versiona el modelo procedimental sin reinterpretar expedientes históricos.
alter table public.causas
  add column if not exists procedural_model_version smallint;

update public.causas
set procedural_model_version = 1
where procedural_model_version is null;

alter table public.causas
  alter column procedural_model_version set default 1,
  alter column procedural_model_version set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'causas_procedural_model_version_check'
      and conrelid = 'public.causas'::regclass
  ) then
    alter table public.causas
      add constraint causas_procedural_model_version_check
      check (procedural_model_version in (1, 2));
  end if;
end
$$;
