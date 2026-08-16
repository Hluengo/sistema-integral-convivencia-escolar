/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/requireTenant.js';
import { requireMembership, CONVIVENCIA_MEMBERSHIP } from '../../middleware/requireMembership.js';

const router = Router();

router.get(
  '/pilot/membership-check',
  requireAuth,
  requireTenant,
  requireMembership(CONVIVENCIA_MEMBERSHIP),
  async (_req, res) => {
    res.json({
      status: 'ok',
      message: 'Acceso autorizado por membresía.',
      timestamp: new Date().toISOString(),
    });
  },
);

export default router;
