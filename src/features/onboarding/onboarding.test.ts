/** @license SPDX-License-Identifier: Apache-2.0 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getOnboardingStorageKey, readOnboardingState } from './onboarding';

describe('onboarding storage', () => {
  it('scopea la clave por tenant y usuario', () => {
    assert.equal(
      getOnboardingStorageKey('tenant-1', 'user-1'),
      'onboarding_completed_v1:tenant-1:user-1',
    );
  });

  it('devuelve un estado vacío fuera del navegador', () => {
    assert.deepEqual(readOnboardingState('onboarding_completed_v1:tenant:user'), {
      completed: {},
      dismissed: false,
    });
  });
});
