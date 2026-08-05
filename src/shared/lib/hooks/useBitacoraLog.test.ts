/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import type { buildManualBitacoraEntry as buildManualBitacoraEntryType } from './useBitacoraLog';

let buildManualBitacoraEntry: typeof buildManualBitacoraEntryType;

before(async () => {
  process.env.VITE_SUPABASE_URL ??= 'https://example.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY ??= 'anon-key-for-unit-tests';
  ({ buildManualBitacoraEntry } = await import('./useBitacoraLog'));
});

describe('buildManualBitacoraEntry', () => {
  it('crea una entrada manual con documento adjunto', () => {
    const entry = buildManualBitacoraEntry({
      title: 'Entrevista con apoderado',
      description: 'Se registran acuerdos de seguimiento.',
      type: 'Entrevista',
      participants: 'Encargada, Apoderado',
      documentoAdjunto: 'DC-2026-014/documentos/acta.pdf',
    });

    assert.ok(entry);
    assert.match(entry.id, /^b_custom_/);
    assert.equal(entry.titulo, 'Entrevista con apoderado');
    assert.deepEqual(entry.participantes, ['Encargada', 'Apoderado']);
    assert.equal(entry.documentoAdjunto, 'DC-2026-014/documentos/acta.pdf');
  });

  it('usa participante no especificado cuando el campo viene vacío', () => {
    const entry = buildManualBitacoraEntry({
      title: 'Seguimiento',
      description: 'Sin novedades relevantes.',
      type: 'Otro',
      participants: '',
    });

    assert.ok(entry);
    assert.deepEqual(entry.participantes, ['No especificados']);
  });

  it('rechaza entradas sin título o descripción', () => {
    assert.equal(
      buildManualBitacoraEntry({
        title: '',
        description: 'Texto',
        type: 'Otro',
        participants: '',
      }),
      null,
    );
    assert.equal(
      buildManualBitacoraEntry({
        title: 'Título',
        description: '',
        type: 'Otro',
        participants: '',
      }),
      null,
    );
  });
});
