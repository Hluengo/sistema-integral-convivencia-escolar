/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { isRequestValidationError } from '../lib/validators.js';

/**
 * Express global error handler middleware (4-param signature).
 *
 * Safety net for any error not caught by route-level try/catch.
 * Always returns JSON `{ error: string }` — never HTML.
 *
 * Known error types:
 *   - RequestValidationError     → 400
 *   - SyntaxError (JSON body)    → 400
 *   - Everything else            → 500
 *
 * In NODE_ENV=development the actual message is included.
 * In production a generic message is used for 500s to avoid leaking internals.
 */

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Always log
  console.error('[errorHandler]', err instanceof Error ? err.message : String(err));

  // Known error types
  if (isRequestValidationError(err)) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    // JSON parse errors from express.json()
    res.status(400).json({ error: 'JSON malformado en el cuerpo de la solicitud.' });
    return;
  }

  // Default: internal server error
  const isDev = process.env.NODE_ENV === 'development';
  const message = isDev && err instanceof Error ? err.message : 'Error interno del servidor.';

  res.status(500).json({ error: message });
};
