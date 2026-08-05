/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveRoleGates } from './useRoleGates';

describe('resolveRoleGates', () => {
  it('usa el rol más privilegiado entre perfil y membresía de aplicación', () => {
    const gates = resolveRoleGates({
      isAuthenticated: true,
      tenantId: 'tenant-1',
      userId: 'user-1',
      profileRole: 'admin',
      appRole: 'superadmin',
    });

    assert.equal(gates.effectiveAdminRole, 'superadmin');
    assert.equal(gates.canAccessAdmin, true);
    assert.equal(gates.canAccessReports, true);
    assert.equal(gates.canAccessPlatform, true);
    assert.equal(gates.onboardingEnabled, true);
  });

  it('bloquea onboarding sin tenant aunque el rol sea administrativo', () => {
    const gates = resolveRoleGates({
      isAuthenticated: true,
      tenantId: null,
      userId: 'user-1',
      profileRole: 'direccion',
      appRole: null,
    });

    assert.equal(gates.canAccessAdmin, true);
    assert.equal(gates.canAccessReports, true);
    assert.equal(gates.canAccessPlatform, false);
    assert.equal(gates.onboardingEnabled, false);
  });
});
