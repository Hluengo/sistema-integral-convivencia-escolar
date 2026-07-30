/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CHECKLIST_CONFLICT_TARGET } from './checklistConflict';

describe('saveChecklist', () => {
  it('usa la clave primaria compuesta del checklist al hacer upsert', () => {
    assert.equal(CHECKLIST_CONFLICT_TARGET, 'id,causa_id');
  });
});
