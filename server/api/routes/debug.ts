/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/auth-debug', requireAuth, async (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'No encontrado.' });
    return;
  }

  res.json({ authenticated: true });
});

export default router;
