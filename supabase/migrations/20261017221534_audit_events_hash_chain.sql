-- Encadena los eventos de auditoría para detectar alteraciones posteriores.
-- No invalida ni reescribe eventos históricos: solo protege los nuevos.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.audit_events
  ADD COLUMN IF NOT EXISTS previous_hash text,
  ADD COLUMN IF NOT EXISTS event_hash text;

CREATE OR REPLACE FUNCTION public.stamp_audit_event_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  previous_event public.audit_events%ROWTYPE;
  canonical_payload text;
BEGIN
  SELECT *
    INTO previous_event
    FROM public.audit_events
   WHERE tenant_id = NEW.tenant_id
   ORDER BY occurred_at DESC, id DESC
   LIMIT 1;

  NEW.previous_hash := previous_event.event_hash;
  canonical_payload := concat_ws(
    '|',
    NEW.id::text,
    NEW.tenant_id::text,
    NEW.actor_user_id::text,
    NEW.action,
    NEW.entity_type,
    NEW.entity_id,
    coalesce(NEW.previous_values::text, ''),
    coalesce(NEW.new_values::text, ''),
    NEW.occurred_at::text,
    coalesce(NEW.previous_hash, '')
  );
  NEW.event_hash := encode(digest(canonical_payload, 'sha256'), 'hex');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_events_stamp_hash ON public.audit_events;
CREATE TRIGGER audit_events_stamp_hash
BEFORE INSERT ON public.audit_events
FOR EACH ROW
EXECUTE FUNCTION public.stamp_audit_event_hash();

COMMENT ON COLUMN public.audit_events.previous_hash IS
  'Hash SHA-256 del evento anterior del mismo tenant; null para el primer evento nuevo sin cadena histórica.';
COMMENT ON COLUMN public.audit_events.event_hash IS
  'Hash SHA-256 del evento y previous_hash; permite detectar alteraciones posteriores.';

CREATE OR REPLACE FUNCTION public.verify_audit_event_chain(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  current_event public.audit_events%ROWTYPE;
  expected_previous_hash text;
  canonical_payload text;
  expected_hash text;
BEGIN
  FOR current_event IN
    SELECT *
      FROM public.audit_events
     WHERE tenant_id = p_tenant_id
       AND event_hash IS NOT NULL
     ORDER BY occurred_at ASC, id ASC
  LOOP
    IF current_event.previous_hash IS DISTINCT FROM expected_previous_hash THEN
      RETURN false;
    END IF;
    canonical_payload := concat_ws(
      '|',
      current_event.id::text,
      current_event.tenant_id::text,
      current_event.actor_user_id::text,
      current_event.action,
      current_event.entity_type,
      current_event.entity_id,
      coalesce(current_event.previous_values::text, ''),
      coalesce(current_event.new_values::text, ''),
      current_event.occurred_at::text,
      coalesce(current_event.previous_hash, '')
    );
    expected_hash := encode(digest(canonical_payload, 'sha256'), 'hex');
    IF current_event.event_hash IS DISTINCT FROM expected_hash THEN
      RETURN false;
    END IF;
    expected_previous_hash := current_event.event_hash;
  END LOOP;
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.verify_audit_event_chain(uuid) IS
  'Verifica la cadena SHA-256 de audit_events de un tenant sin modificar datos.';

REVOKE ALL ON FUNCTION public.stamp_audit_event_hash() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_audit_event_chain(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_audit_event_chain(uuid) TO service_role;
