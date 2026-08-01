-- ============================================================
-- Migration 20260724200000: Add tenant_id to usage_events
-- Asocia eventos de uso al tenant para aislamiento multi-tenant.
-- ============================================================

-- 1. Agregar columna tenant_id (nullable inicialmente para datos históricos)
ALTER TABLE public.usage_events
  ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- 2. Agregar foreign key
DO $$
BEGIN
  ALTER TABLE public.usage_events
    ADD CONSTRAINT usage_events_tenant_id_fkey
    FOREIGN KEY (tenant_id)
    REFERENCES public.tenants(id)
    ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Crear índice para queries por tenant
CREATE INDEX IF NOT EXISTS idx_usage_events_tenant_id
  ON public.usage_events(tenant_id);

-- 4. Backfill: asociar eventos existentes al tenant del usuario
-- Solo para eventos donde el user_id tiene un profile con tenant_id
UPDATE public.usage_events ue
SET tenant_id = p.tenant_id
FROM public.profiles p
WHERE ue.user_id = p.user_id
  AND ue.tenant_id IS NULL
  AND p.tenant_id IS NOT NULL;

-- 5. Actualizar la política de inserción para incluir tenant_id
DROP POLICY IF EXISTS "usage_events_insert_own" ON public.usage_events;
CREATE POLICY "usage_events_insert_own" ON public.usage_events
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      tenant_id IS NULL
      OR tenant_id = public.current_tenant_id()
    )
  );

-- 6. Actualizar la política de lectura para filtrar por tenant
DROP POLICY IF EXISTS "usage_events_select_admin" ON public.usage_events;
CREATE POLICY "usage_events_select_admin" ON public.usage_events
  FOR SELECT TO authenticated
  USING (
    public.current_app_role() IN ('admin', 'direccion')
    AND tenant_id = public.current_tenant_id()
  );

-- 7. Actualizar RPC get_usage_stats para filtrar por tenant
CREATE OR REPLACE FUNCTION public.get_usage_stats(
  since TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  until TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  event_name TEXT,
  total_count BIGINT,
  unique_users BIGINT,
  last_occurrence TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.event_name,
    COUNT(*)::BIGINT AS total_count,
    COUNT(DISTINCT e.user_id)::BIGINT AS unique_users,
    MAX(e.created_at) AS last_occurrence
  FROM usage_events e
  WHERE e.created_at >= since
    AND e.created_at <= until
    AND e.tenant_id = public.current_tenant_id()
  GROUP BY e.event_name
  ORDER BY total_count DESC;
$$;

-- 8. Actualizar RPC get_daily_active_users para filtrar por tenant
CREATE OR REPLACE FUNCTION public.get_daily_active_users(
  since TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  until TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  date DATE,
  active_users BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.created_at::DATE AS date,
    COUNT(DISTINCT e.user_id)::BIGINT AS active_users
  FROM usage_events e
  WHERE e.created_at >= since
    AND e.created_at <= until
    AND e.user_id IS NOT NULL
    AND e.tenant_id = public.current_tenant_id()
  GROUP BY e.created_at::DATE
  ORDER BY date;
$$;

SELECT pg_notify('pgrst', 'reload schema');
