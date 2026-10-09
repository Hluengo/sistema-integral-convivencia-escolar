/** @license SPDX-License-Identifier: Apache-2.0 */

-- Alinea los roles de colegio reconocidos por la aplicación con la política
-- de actualización de causas, manteniendo el aislamiento por tenant.
DROP POLICY IF EXISTS "causas_tenant_update" ON public.causas;

CREATE POLICY "causas_tenant_update"
  ON public.causas
  FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id()
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.current_app_role() = ANY (
      ARRAY[
        'admin',
        'direccion',
        'convivencia',
        'inspectoria',
        'inspector',
        'profesor_jefe',
        'teacher',
        'user',
        'staff'
      ]
    )
  );
