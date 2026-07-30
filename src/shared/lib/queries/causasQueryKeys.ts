/** @license SPDX-License-Identifier: Apache-2.0 */

export const causasQueryKeys = {
  root: ['causas'] as const,
  list: (tenantId: string) => ['causas', tenantId, 'list'] as const,
  details: (tenantId: string, causaId: string) => ['causas', tenantId, 'details', causaId] as const,
};
