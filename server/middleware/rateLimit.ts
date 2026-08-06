/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import { checkRateLimitAsync } from '../api/services/rateLimit.js';

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
  const info = await checkRateLimitAsync(key);

  // Standard rate limit headers
  res.setHeader('X-RateLimit-Limit', String(info.limit));
  res.setHeader('X-RateLimit-Remaining', String(info.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(info.resetAt / 1000)));

  if (!info.allowed) {
    const retryAfterSec = Math.max(1, Math.ceil((info.resetAt - Date.now()) / 1000));
    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(429).json({
      error: 'Demasiadas solicitudes. Intente nuevamente más tarde.',
      retryAfter: retryAfterSec,
    });
    return;
  }

  next();
}
