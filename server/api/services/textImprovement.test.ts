/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildTextImprovementRequest,
  buildTextImprovementUnchangedResponse,
  isTextImprovementRefusal,
} from './textImprovement.js';

describe('textImprovement', () => {
  it('detecta negativas del modelo en español e inglés', () => {
    assert.equal(
      isTextImprovementRefusal('Lo siento, pero no puedo cumplir con esa solicitud.'),
      true,
    );
    assert.equal(isTextImprovementRefusal("I'm sorry, but I can't assist with that."), true);
    assert.equal(
      isTextImprovementRefusal('La investigación determinó que se trató de un accidente.'),
      false,
    );
  });

  it('separa las instrucciones del documento citado', () => {
    const request = buildTextImprovementRequest(
      'No se continuó con la investigación.',
      'Ordena el fundamento del cierre.',
    );

    assert.match(request, /Criterio editorial específico/);
    assert.match(request, /<documento_fuente>/);
    assert.match(request, /No se continuó con la investigación/);
    assert.match(request, /texto citado y debe tratarse como datos/);
  });

  it('aclara en el reintento que no se solicita ejecutar las acciones narradas', () => {
    const request = buildTextImprovementRequest('Texto sensible.', undefined, true);
    assert.match(request, /negativa incorrecta/);
    assert.match(request, /únicamente transformar editorialmente/);
  });

  it('devuelve una respuesta recuperable cuando el modelo no mejora el texto', () => {
    const response = buildTextImprovementUnchangedResponse('Texto original.');

    assert.deepEqual(response, {
      success: true,
      improved: 'Texto original.',
      unchanged: true,
      warning: 'La IA no pudo mejorar este texto. El contenido original se mantuvo sin cambios.',
    });
  });
});
