/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import { checkRateLimitAsync } from '../api/services/rateLimit.js';

const DEFAULT_WINDOW_SEC = 60;

/**
 * Express middleware de rate limit.
 *
 * Clave por usuario autenticado (req.user.sub) con fallback a IP.
 * Usa Redis via checkRateLimitAsync si UPSTASH_REDIS_REST_URL está configurado,
 * o memoria en desarrollo.
 *
 * Retorna 429 con estructura JSON cuando se excede el límite.
 */
export async function rateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const key = authReq.user?.sub ?? req.ip ?? 'unknown';
  const allowed = await checkRateLimitAsync(key);

  if (!allowed) {
    res.status(429).json({
      error: 'Demasiadas solicitudes. Intente nuevamente en un minuto.',
      retryAfter: DEFAULT_WINDOW_SEC,
    });
    return;
  }

  next();
}
