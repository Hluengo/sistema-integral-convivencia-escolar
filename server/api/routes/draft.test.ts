/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DRAFT_CONTEXT_LIMITS,
  getGeminiDraftErrorMessage,
  getGeminiDraftErrorStatus,
  getBoundedDraftTimeoutMs,
  getRemainingDraftBudgetMs,
  isDocType,
  isRecoverableGeminiDraftError,
  isGeminiTimeout,
} from './draft';

describe('draft document route configuration', () => {
  it('usa contexto amplio para informes de cierre', () => {
    const limits = DRAFT_CONTEXT_LIMITS.informe_cierre_indagacion;

    assert.equal(limits.documents.maxDocuments, 4);
    assert.equal(limits.legalSourceChars, 28_000);
    assert.equal(limits.generation.maxOutputTokens, 5_000);
    assert.equal(limits.generation.timeoutMs, 40_000);
  });

  it('rechaza documentos no vigentes en redacción asistida', () => {
    assert.equal(isDocType('documento_legacy'), false);
    assert.equal(isDocType('informe_cierre_indagacion'), true);
    assert.equal(isDocType('informe_concluyente'), true);
  });

  it('clasifica timeouts de Gemini para responder sin 500 genérico', () => {
    assert.equal(
      isGeminiTimeout('La solicitud a generativelanguage.googleapis.com excedió el tiempo máximo.'),
      true,
    );
    assert.equal(isGeminiTimeout('Gemini error: 404 model not found'), false);
  });

  it('clasifica fallas recuperables de Gemini sin usar otro proveedor', () => {
    assert.equal(isRecoverableGeminiDraftError('GEMINI_API_KEY no configurada'), true);
    assert.equal(isRecoverableGeminiDraftError('Gemini error: 400 API key not valid'), true);
    assert.equal(isRecoverableGeminiDraftError('Gemini error: 403 permission denied'), true);
    assert.equal(isRecoverableGeminiDraftError('Gemini error: 404 model not found'), true);
    assert.equal(
      isRecoverableGeminiDraftError(
        'La solicitud a generativelanguage.googleapis.com excedió el tiempo máximo.',
      ),
      true,
    );
    assert.equal(isRecoverableGeminiDraftError('Error SQL inesperado'), false);
  });

  it('responde errores explícitos de Gemini para documentos oficiales', () => {
    assert.equal(
      getGeminiDraftErrorStatus(
        'La solicitud a generativelanguage.googleapis.com excedió el tiempo máximo.',
      ),
      504,
    );
    assert.equal(getGeminiDraftErrorStatus('Gemini error: 403 permission denied'), 503);
    assert.match(
      getGeminiDraftErrorMessage('Gemini error: 403 permission denied'),
      /GEMINI_API_KEY y LEGAL_DRAFT_MODEL/,
    );
  });

  it('reserva margen antes del timeout de Vercel', () => {
    const startedAt = 1_000;

    assert.equal(getRemainingDraftBudgetMs(startedAt, 1_000), 59_000);
    assert.equal(getBoundedDraftTimeoutMs(12_000, startedAt, 1_000), 12_000);
    assert.equal(getBoundedDraftTimeoutMs(20_000, startedAt, 57_000), 1_500);
    assert.equal(getBoundedDraftTimeoutMs(20_000, startedAt, 60_000), 0);
  });
});
