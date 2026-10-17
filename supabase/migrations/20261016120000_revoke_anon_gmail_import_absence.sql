-- #3: create_gmail_import_absence quedó con EXECUTE para anon: con la
-- publishable key cualquiera podía crear ausencias y auditar en nombre del
-- importador de Gmail. La función es SECURITY DEFINER y escribe sin pasar por
-- RLS, así que el único control era ese grant.
--
-- Se revoca a anon y a PUBLIC. authenticated y service_role se conservan: el
-- importador (n8n) puede invocarla con cualquiera de los dos.

do $$
begin
  if exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'create_gmail_import_absence'
  ) then
    execute 'revoke all on function public.create_gmail_import_absence(uuid, uuid, date, date, text, text, text, numeric, jsonb) from anon';
    execute 'revoke all on function public.create_gmail_import_absence(uuid, uuid, date, date, text, text, text, numeric, jsonb) from public';
  end if;
end
$$;
