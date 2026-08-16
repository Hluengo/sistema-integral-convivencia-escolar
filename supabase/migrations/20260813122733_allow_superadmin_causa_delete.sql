/** @license SPDX-License-Identifier: Apache-2.0 */

-- Superadmin may delete causes within the currently selected tenant only.
DROP POLICY IF EXISTS "causas_tenant_delete" ON public.causas;

CREATE POLICY "causas_tenant_delete"
  ON public.causas
  FOR DELETE
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_app_role() = ANY (ARRAY['admin', 'direccion', 'superadmin'])
  );
