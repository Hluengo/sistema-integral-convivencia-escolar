/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { invalidateDashboardQueries } from './useInvalidateDashboardQueries';

test('invalidateDashboardQueries refresca las fuentes agregadas del dashboard', async () => {
  const invalidated: unknown[] = [];

  await invalidateDashboardQueries({
    invalidateQueries: async (options) => {
      assert.ok(options);
      invalidated.push(options.queryKey);
    },
  });

  assert.deepEqual(invalidated, [
    ['public-dashboard-kpis'],
    ['annotation-stage-kpis'],
    ['course-carta-ranking'],
    ['teacher-annotation-ranking'],
    ['student-annotation-ranking'],
    ['annual-annotation-trends'],
    ['causas'],
    ['dashboard-deadline-kpis'],
  ]);
});
