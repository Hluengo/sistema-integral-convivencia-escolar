-- Prevent exact PDF re-registration under concurrent requests.
CREATE UNIQUE INDEX IF NOT EXISTS idx_disciplinary_files_tenant_hash
  ON public.disciplinary_process_files (tenant_id, file_hash)
  WHERE file_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.bulk_pdf_import_claims (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  file_hash text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (tenant_id, course_id, file_hash)
);

ALTER TABLE public.bulk_pdf_import_claims ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.claim_bulk_pdf_import(
  p_tenant_id uuid,
  p_course_id uuid,
  p_file_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_claimed_at timestamptz;
  v_completed_at timestamptz;
  v_inserted boolean;
BEGIN
  INSERT INTO public.bulk_pdf_import_claims (tenant_id, course_id, file_hash)
  VALUES (p_tenant_id, p_course_id, p_file_hash)
  ON CONFLICT (tenant_id, course_id, file_hash) DO NOTHING
  RETURNING true INTO v_inserted;

  IF v_inserted THEN
    RETURN true;
  END IF;

  SELECT claimed_at, completed_at
    INTO v_claimed_at, v_completed_at
    FROM public.bulk_pdf_import_claims
   WHERE tenant_id = p_tenant_id
     AND course_id = p_course_id
     AND file_hash = p_file_hash
   FOR UPDATE;

  IF v_completed_at IS NOT NULL THEN
    RETURN false;
  END IF;

  IF v_claimed_at > now() - interval '60 minutes' THEN
    RETURN false;
  END IF;

  UPDATE public.bulk_pdf_import_claims
     SET claimed_at = now()
   WHERE tenant_id = p_tenant_id AND course_id = p_course_id AND file_hash = p_file_hash;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_bulk_pdf_import(
  p_tenant_id uuid,
  p_course_id uuid,
  p_file_hash text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  UPDATE public.bulk_pdf_import_claims
     SET completed_at = now()
   WHERE tenant_id = p_tenant_id
     AND course_id = p_course_id
     AND file_hash = p_file_hash;
$function$;

CREATE OR REPLACE FUNCTION public.release_bulk_pdf_import(
  p_tenant_id uuid,
  p_course_id uuid,
  p_file_hash text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  DELETE FROM public.bulk_pdf_import_claims
   WHERE tenant_id = p_tenant_id
     AND course_id = p_course_id
     AND file_hash = p_file_hash
     AND completed_at IS NULL;
$function$;

REVOKE ALL ON FUNCTION public.claim_bulk_pdf_import(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_bulk_pdf_import(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_bulk_pdf_import(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_bulk_pdf_import(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_bulk_pdf_import(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_bulk_pdf_import(uuid, uuid, text) TO service_role;
