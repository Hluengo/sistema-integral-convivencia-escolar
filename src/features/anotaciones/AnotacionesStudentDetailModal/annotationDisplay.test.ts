import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatAnnotationDisplayText } from './annotationDisplay';

describe('formatAnnotationDisplayText', () => {
  it('extrae la anotación legible desde el texto repetido del PDF', () => {
    assert.equal(
      formatAnnotationDisplayText(
        '10/07/2026 Tipo: Negativa Anotación: ESTUDIANTE EMITE COMENTARIOS DESUBICADOS. Profesor: VANNIA',
      ),
      'ESTUDIANTE EMITE COMENTARIOS DESUBICADOS.',
    );
  });

  it('conserva y normaliza una anotación manual', () => {
    assert.equal(formatAnnotationDisplayText('  Llega tarde\n a clases.  '), 'Llega tarde a clases.');
  });
});
