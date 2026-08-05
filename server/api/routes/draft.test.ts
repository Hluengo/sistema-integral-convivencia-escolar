/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canFallbackLegalDraftToOpenRouter, DRAFT_CONTEXT_LIMITS, isGeminiTimeout } from './draft';

describe('draft document route configuration', () => {
  it('usa contexto liviano para notificaciones de apertura', () => {
    const limits = DRAFT_CONTEXT_LIMITS.notificacion_apertura;

    assert.equal(limits.documents.maxDocuments, 0);
    assert.equal(limits.legalSourceChars <= 6_000, true);
    assert.equal(limits.generation.maxOutputTokens <= 1_800, true);
  });

  it('clasifica timeouts de Gemini para responder sin 500 genérico', () => {
    assert.equal(
      isGeminiTimeout('La solicitud a generativelanguage.googleapis.com excedió el tiempo máximo.'),
      true,
    );
    assert.equal(isGeminiTimeout('Gemini error: 404 model not found'), false);
  });

  it('activa respaldo OpenRouter para fallas recuperables de Gemini', () => {
    assert.equal(canFallbackLegalDraftToOpenRouter('GEMINI_API_KEY no configurada'), true);
    assert.equal(canFallbackLegalDraftToOpenRouter('Gemini error: 400 API key not valid'), true);
    assert.equal(canFallbackLegalDraftToOpenRouter('Gemini error: 403 permission denied'), true);
    assert.equal(canFallbackLegalDraftToOpenRouter('Gemini error: 404 model not found'), true);
    assert.equal(
      canFallbackLegalDraftToOpenRouter(
        'La solicitud a generativelanguage.googleapis.com excedió el tiempo máximo.',
      ),
      true,
    );
    assert.equal(canFallbackLegalDraftToOpenRouter('Error SQL inesperado'), false);
  });
});
