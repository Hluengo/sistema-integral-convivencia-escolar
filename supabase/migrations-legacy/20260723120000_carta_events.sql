-- @license SPDX-License-Identifier: Apache-2.0

CREATE TABLE IF NOT EXISTS public.carta_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carta_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'suggested',
      'created',
      'registered',
      'printed',
      'downloaded_pdf',
      'downloaded_word',
      'processed_manually',
      'annulled'
    )
  ),
  event_detail TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_carta_events_carta_id ON public.carta_events(carta_id);
CREATE INDEX IF NOT EXISTS idx_carta_events_student_id ON public.carta_events(student_id);
CREATE INDEX IF NOT EXISTS idx_carta_events_tenant_id ON public.carta_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_carta_events_created_at ON public.carta_events(created_at DESC);

ALTER TABLE public.carta_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "carta_events_select_tenant" ON public.carta_events;
CREATE POLICY "carta_events_select_tenant" ON public.carta_events
  FOR SELECT USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "carta_events_insert_tenant" ON public.carta_events;
CREATE POLICY "carta_events_insert_tenant" ON public.carta_events
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
