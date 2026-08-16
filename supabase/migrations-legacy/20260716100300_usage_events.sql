-- Usage events table for internal analytics dashboard.
-- Individual events are also sent to PostHog; this table enables
-- aggregated queries and custom dashboards within the app.

CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_event_name ON usage_events(event_name);
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at ON usage_events(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_id ON usage_events(user_id);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own events
CREATE POLICY "usage_events_insert_own" ON public.usage_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow admin/direccion to read all events
CREATE POLICY "usage_events_select_admin" ON public.usage_events
  FOR SELECT TO authenticated
  USING (
    public.current_app_role() IN ('admin', 'direccion')
  );

-- Aggregated stats function: count events by name for a given period
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
  GROUP BY e.event_name
  ORDER BY total_count DESC;
$$;

-- Daily unique users function
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
  GROUP BY e.created_at::DATE
  ORDER BY date;
$$;
