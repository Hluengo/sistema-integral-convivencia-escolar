/** @license SPDX-License-Identifier: Apache-2.0 */

# Operación de configuración institucional

## Flujo

1. El superadministrador crea o selecciona el tenant desde **Administración global**.
2. Administración o dirección completa **Perfil y reglamento**: nombre oficial, niveles, contacto, logo y versiones del reglamento.
3. Se guarda una versión como borrador y se publica cuando el contenido fue revisado por el establecimiento.
4. El onboarding refleja automáticamente perfil, cursos, plantillas, miembros y reglamento.

No se deben inventar logos, RUT, dirección ni contenido normativo. Si el colegio no entrega esos datos, se deja el campo vacío y el checklist pendiente.

## Validación

```powershell
npm run lint
npm run test
npm run build:web
npm run check:bundle
npm run security-audit
npm run test:multitenant
npm run test:roles
npm run test:e2e
git diff --check
```

La migración `20260801100000_add_institutional_configuration.sql` es incremental. No se deben editar migraciones antiguas ni hacer público el bucket `institution-assets`.
