/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireTenant } from '../middleware/requireTenant';
import { requireMembership } from '../middleware/requireMembership';

const router = Router();

router.get(
  '/pilot/membership-check',
  requireAuth,
  requireTenant,
  requireMembership({
    applicationCode: 'convivencia',
    allowedRoles: ['direccion', 'convivencia'],
  }),
  async (_req, res) => {
    res.json({
      status: 'ok',
      message: 'Acceso autorizado por membresía.',
      timestamp: new Date().toISOString(),
    });
  },
);

export default router;
