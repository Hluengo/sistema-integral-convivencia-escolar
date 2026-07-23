/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from 'express';
import { checkRateLimit } from '../services/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';
import { analyzeDisciplinaryPdf, confirmDisciplinaryProcess } from '../../lib/disciplinaryPdfAnalysis';

const router = Router();
router.use(requireAuth);

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

function getTenantId(body: AuthedRequestBody): string {
  return body.tenantId || process.env.DEFAULT_TENANT_ID || '';
}

function assertRateLimit(req: Parameters<Parameters<Router['post']>[1]>[0]): boolean {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  return checkRateLimit(ip);
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

  return { status: 500, message };
}
router.post('/process-disciplinary-pdf', async (req, res) => {
  try {
    if (!assertRateLimit(req)) {
      res.status(429).json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
      return;
    }

    const body = req.body as AuthedRequestBody;
    const tenantId = getTenantId(body);
    if (!tenantId || !body.bucket || !body.storagePath || !body.fileName) {
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
    console.error('Error processing disciplinary PDF:', error instanceof Error ? error.message : error);
    res.status(response.status).json({ error: response.message });
  }
});

router.post('/process-disciplinary-pdf/confirm', async (req, res) => {
  try {
    if (!assertRateLimit(req)) {
      res.status(429).json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
      return;
    }

    const body = req.body as AuthedRequestBody;
    const tenantId = getTenantId(body);
    if (!tenantId || !body.bucket || !body.storagePath || !body.fileName || !body.fileHash || !body.studentId) {
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
    console.error('Error confirming disciplinary process:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error interno al confirmar el proceso' });
  }
});

export default router;
