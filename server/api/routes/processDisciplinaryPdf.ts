/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireTenant } from '../middleware/requireTenant.js';
import type { AuthenticatedRequest } from '../types';
import { rateLimit } from '../../middleware/rateLimit.js';
import { requireMembership, CONVIVENCIA_MEMBERSHIP } from '../middleware/requireMembership.js';
import {
  analyzeDisciplinaryPdf,
  confirmDisciplinaryProcess,
} from '../../lib/disciplinaryPdfAnalysis';

const router = Router();
router.use(requireAuth);
router.use(requireMembership(CONVIVENCIA_MEMBERSHIP));
router.use(rateLimit);

interface AuthedRequestBody {
  bucket?: string;
  storagePath?: string;
  fileName?: string;
  tenantId?: string;
  analysisId?: string | null;
  fileId?: string | null;
  fileHash?: string;
  fileSize?: number;
  mimeType?: string;
  studentId?: string;
  suggestedLetterType?: string;
  annotations?: Array<{
    raw_text: string;
    normalized_text?: string;
    type: 'negative' | 'positive' | 'information';
    page_number?: number | null;
    sequence_number: number;
    detected_date?: string | null;
    detected_teacher?: string | null;
    confidence?: number;
  }>;
  idempotencyKey?: string;
}

function getBearerToken(req: Parameters<Parameters<Router['post']>[1]>[0]): string | undefined {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
}
function getProcessErrorResponse(error: unknown): { status: number; message: string } {
  const message = error instanceof Error ? error.message : 'Error interno al procesar el documento';

  if (message === 'Supabase no configurado') {
    return {
      status: 503,
      message: 'Supabase no está configurado en el servidor para procesar PDFs privados.',
    };
  }

  if (
    message.includes('Bucket de documentos disciplinarios no permitido') ||
    message.includes('Ruta de archivo no válida') ||
    message.includes('El archivo no pertenece') ||
    message.includes('El PDF excede') ||
    message.includes('PDF válido')
  ) {
    return { status: 400, message };
  }

  if (message.includes('No fue posible descargar')) {
    return {
      status: 404,
      message: 'No fue posible encontrar o leer el PDF privado subido.',
    };
  }

  if (message.includes('Este PDF ya fue registrado')) {
    return { status: 409, message };
  }

  return { status: 500, message };
}
router.post('/process-disciplinary-pdf', requireTenant, async (req, res) => {
  try {
    const body = req.body as AuthedRequestBody;
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenantId!;
    if (!body.bucket || !body.storagePath || !body.fileName) {
      res.status(400).json({ error: 'Faltan parámetros requeridos para analizar el PDF' });
      return;
    }

    const result = await analyzeDisciplinaryPdf({
      bucket: body.bucket,
      storagePath: body.storagePath,
      fileName: body.fileName,
      tenantId,
      authToken: getBearerToken(req),
    });
    res.json(result);
  } catch (error) {
    const response = getProcessErrorResponse(error);
    console.error(
      'Error processing disciplinary PDF:',
      error instanceof Error ? error.message : error,
    );
    res.status(response.status).json({ error: response.message });
  }
});

router.post('/process-disciplinary-pdf/confirm', requireTenant, async (req, res) => {
  try {
    const body = req.body as AuthedRequestBody;
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenantId!;
    if (!body.bucket || !body.storagePath || !body.fileName || !body.fileHash || !body.studentId) {
      res.status(400).json({ error: 'Faltan parámetros requeridos para confirmar el proceso' });
      return;
    }

    const result = await confirmDisciplinaryProcess({
      analysisId: body.analysisId,
      fileId: body.fileId,
      bucket: body.bucket,
      storagePath: body.storagePath,
      fileName: body.fileName,
      fileHash: body.fileHash,
      fileSize: body.fileSize,
      mimeType: body.mimeType,
      tenantId,
      studentId: body.studentId,
      suggestedLetterType: body.suggestedLetterType || 'none',
      annotations: body.annotations ?? [],
      idempotencyKey: body.idempotencyKey,
      authToken: getBearerToken(req),
    });
    res.json(result);
  } catch (error) {
    const response = getProcessErrorResponse(error);
    console.error(
      'Error confirming disciplinary process:',
      error instanceof Error ? error.message : error,
    );
    res.status(response.status).json({ error: response.message });
  }
});

export default router;
