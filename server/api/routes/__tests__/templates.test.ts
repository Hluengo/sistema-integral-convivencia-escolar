/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidUuid } from '../../../middleware/auth';

describe('PUT /document-templates — UUID validation', () => {
  it('rejects non-UUID strings', () => {
    assert.equal(isValidUuid('not-a-uuid'), false);
    assert.equal(isValidUuid('123'), false);
    assert.equal(isValidUuid(''), false);
    assert.equal(isValidUuid('tenant-1'), false);
  });

  it('accepts valid UUIDs', () => {
    assert.equal(isValidUuid('550e8400-e29b-41d4-a716-446655440000'), true);
    assert.equal(isValidUuid('00000000-0000-4000-8000-000000000000'), true);
  });
});
