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

/**
 * Cuerpo de error seguro para enviar al cliente.
 *
 * - Errores 4xx (negocio: 400/403/404/409/422) conservan su mensaje: son
 *   respuestas intencionales que el usuario debe leer.
 * - Errores 5xx en producción se enmascaran con un mensaje genérico para no
 *   filtrar detalles internos (rutas de archivo, SQL, stack).
 * - En desarrollo se mantiene el mensaje real para depurar.
 */
export function clientErrorBody(message: string, status: number): { error: string } {
  if (status >= 500 && process.env.NODE_ENV === 'production') {
    return { error: 'Error interno del servidor.' };
  }
  return { error: message };
}

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

  // Payload demasiado grande (express.json / multer con límite de tamaño).
  // body-parser lanza un error con status 413 y type entity.too.large.
  const tooLarge =
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    (err as { type?: string }).type === 'entity.too.large';
  if (
    tooLarge ||
    (err instanceof Error && 'status' in err && (err as { status?: number }).status === 413)
  ) {
    res
      .status(413)
      .json({ error: 'El archivo o cuerpo de la solicitud excede el tamaño permitido.' });
    return;
  }

  // Default: internal server error
  const isDev = process.env.NODE_ENV === 'development';
  const message = isDev && err instanceof Error ? err.message : 'Error interno del servidor.';

  res.status(500).json({ error: message });
};
