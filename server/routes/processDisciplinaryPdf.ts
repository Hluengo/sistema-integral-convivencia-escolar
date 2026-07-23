/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from 'express';
import { checkRateLimit } from '../lib/rateLimit';
import { requireAuth } from '../middleware/auth';
import { analyzeDisciplinaryPdf, confirmDisciplinaryProcess } from '../lib/disciplinaryPdfAnalysis';

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
    });
    res.json(result);
  } catch (error) {
    console.error('Error processing disciplinary PDF:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error interno al procesar el documento' });
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
    });
    res.json(result);
  } catch (error) {
    console.error('Error confirming disciplinary process:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error interno al confirmar el proceso' });
  }
});

export default router;
