SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolcanlogin, rolconnlimit, rolvaliduntil
FROM pg_roles 
WHERE rolname IN ('anon', 'authenticated', 'service_role', 'supabase_admin')
ORDER BY rolname;
