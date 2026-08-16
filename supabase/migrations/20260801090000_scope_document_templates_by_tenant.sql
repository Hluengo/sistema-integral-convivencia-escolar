/** @license SPDX-License-Identifier: Apache-2.0 */

-- Permite que cada colegio tenga una plantilla por tipo de documento.
-- La restricción anterior era global y bloqueaba la provisión multi-tenant.
ALTER TABLE public.document_templates
  DROP CONSTRAINT IF EXISTS document_templates_doc_type_key;

CREATE UNIQUE INDEX IF NOT EXISTS document_templates_tenant_doc_type_key
  ON public.document_templates (tenant_id, doc_type);
