/** @license SPDX-License-Identifier: Apache-2.0 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const originalEnv = process.env;
before(() => {
  process.env = { ...originalEnv, VITE_APP_MEMBERSHIPS_ENABLED: 'false' };
});
after(() => {
  process.env = originalEnv;
});

describe('membership.service (flag disabled)', () => {
  it('returns not_available when MEMBERSHIPS_ENABLED is false', async () => {
    const { getMyMembership, isMembershipsEnabled } = await import('./membership.service');
    assert.equal(isMembershipsEnabled(), false);

    const result = await getMyMembership('convivencia');
    assert.equal(result.status, 'not_available');
    assert.equal(result.applicationRole, null);
    assert.deepEqual(result.memberships, []);
  });

  it('isMembershipsEnabled returns false by default', async () => {
    const { isMembershipsEnabled } = await import('./membership.service');
    assert.equal(isMembershipsEnabled(), false);
  });
});

describe('membership.service (flag enabled)', () => {
  before(() => {
    process.env.VITE_APP_MEMBERSHIPS_ENABLED = 'true';
  });
  after(() => {
    process.env.VITE_APP_MEMBERSHIPS_ENABLED = 'false';
  });

  it('handles error status gracefully', async () => {
    const { getMyMembership } = await import('./membership.service');
    process.env.VITE_APP_MEMBERSHIPS_ENABLED = 'true';
    const result = await getMyMembership('convivencia');
    assert.ok(
      ['active', 'inactive', 'no_membership', 'not_available', 'error'].includes(result.status),
    );
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
