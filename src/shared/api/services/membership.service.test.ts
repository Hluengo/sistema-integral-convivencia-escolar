/** @license SPDX-License-Identifier: Apache-2.0 */

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getMembershipAuthMode, getMembershipConfig } from '../lib/membershipConfig';

const originalEnv = process.env;
before(() => {
  process.env = { ...originalEnv, VITE_APP_MEMBERSHIPS_ENABLED: 'false' };
});
after(() => {
  process.env = originalEnv;
});

describe('membership configuration', () => {
  it('mantiene el modo legacy desactivado por defecto', () => {
    assert.deepEqual(getMembershipConfig(), {
      enabled: false,
      enforced: false,
      allowLegacyFallback: true,
    });
    assert.equal(getMembershipAuthMode(), 'legacy');
  });

  it('activa el modo transición sin exigir un RPC real', () => {
    process.env.VITE_APP_MEMBERSHIPS_ENABLED = 'true';
    process.env.VITE_APP_MEMBERSHIPS_ENFORCED = 'false';

    assert.deepEqual(getMembershipConfig(), {
      enabled: true,
      enforced: false,
      allowLegacyFallback: true,
    });
    assert.equal(getMembershipAuthMode(), 'transition');
  });

  it('activa el modo forzado solo cuando no existe fallback legacy', () => {
    process.env.VITE_APP_MEMBERSHIPS_ENABLED = 'true';
    process.env.VITE_APP_MEMBERSHIPS_ENFORCED = 'true';
    process.env.VITE_APP_MEMBERSHIPS_ALLOW_LEGACY_FALLBACK = 'false';

    assert.equal(getMembershipAuthMode(), 'enforced');
  });
});

describe('membership types', () => {
  it('MembershipResult has correct shape', () => {
    const validStatuses = [
      'active',
      'inactive',
      'no_membership',
      'not_available',
      'error',
    ] as const;
    for (const status of validStatuses) {
      const result = { memberships: [], status, applicationRole: null };
      assert.equal(result.status, status);
      assert.equal(result.applicationRole, null);
      assert.deepEqual(result.memberships, []);
    }
  });

  it('AppMembership has correct shape', () => {
    const membership = {
      application_code: 'convivencia',
      role: 'admin',
      is_active: true,
      app_is_active: true,
    };
    assert.equal(membership.application_code, 'convivencia');
    assert.equal(membership.role, 'admin');
    assert.equal(membership.is_active, true);
    assert.equal(membership.app_is_active, true);
  });
});
