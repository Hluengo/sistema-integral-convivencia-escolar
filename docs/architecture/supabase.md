# Supabase Configuration

## Auth

| Configuración | Valor |
|--------------|-------|
| Tipo | Email/Password |
| Signup habilitado | ✅ |
| Confirmación email | ❌ |
| JWT expiry | 3600s (1 hr) |
| Refresh token rotation | ✅ |
| Min password length | 6 |
| OAuth providers | Ninguno |

## RLS (Row Level Security)

### Patrón General
Todas las tablas de datos siguen el mismo patrón:

```sql
-- SELECT
CREATE POLICY "tabla_tenant_select" ON "public"."tabla"
  FOR SELECT USING (tenant_id = current_tenant_id());

-- INSERT
CREATE POLICY "tabla_tenant_insert" ON "public"."tabla"
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

-- UPDATE
CREATE POLICY "tabla_tenant_update" ON "public"."tabla"
  FOR UPDATE USING (tenant_id = current_tenant_id());

-- DELETE
CREATE POLICY "tabla_tenant_delete" ON "public"."tabla"
  FOR DELETE USING (tenant_id = current_tenant_id());
```

### Funciones Clave para RLS

```sql
-- Fast path: lee tenant_id del JWT (sin query a DB)
CREATE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid,
    (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
  );
$$;

-- Roll check
CREATE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid();
$$;
```

### JWT Fast Path
El trigger `sync_tenant_to_jwt()` en `profiles` escribe `tenant_id` en `auth.users.raw_app_meta_data` después de INSERT o UPDATE de `tenant_id`. Esto permite que RLS lea el tenant desde el JWT sin subquery adicional.

## Storage

| Bucket | Público | Max Size | MIME Types |
|--------|---------|----------|------------|
| `anotaciones` | No | 10 MB | PDF, MD, TXT |
| `disciplinary-processes` | No | 10 MB | PDF |

Los buckets usan path pattern `{tenant_id}/...` para isolation RLS.

## Migraciones

Ubicadas en `supabase/migrations/`. Convención: `YYYYMMDDHHMMSS_descripcion.sql`.

Nunca modificar migraciones existentes — siempre crear nuevas.

## Env Vars Requeridas

| Variable | Propósito |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key (cliente) |
| `SUPABASE_JWT_SECRET` | JWT secret (server middleware) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server admin) |
