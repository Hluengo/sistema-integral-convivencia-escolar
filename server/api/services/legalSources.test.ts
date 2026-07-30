/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { getRelevantLegalSources } from './legalSources.js';

test('selecciona fuentes jurídicas versionadas sin consultar Supabase', async () => {
  const sources = await getRelevantLegalSources('fiscalización 2026 derechos educacionales');

  assert.match(sources, /REX-0799-plan-anual-fiscalizacion-2026\.md/);
  assert.match(sources, /Plan Anual de Fiscalización 2026/);
});

test('limita el contexto legal enviado al modelo para cada consulta', async () => {
  const sources = await getRelevantLegalSources('debido proceso convivencia escolar', 12_000);

  assert.ok(sources.length <= 12_100);
  assert.match(sources, /^### /);
});

test('recupera pasajes pertinentes de fuentes extensas, no solo su encabezado', async () => {
  const sources = await getRelevantLegalSources('expulsión cancelación matrícula', 16_000);

  assert.match(sources, /cancelación de matrícula/i);
  assert.match(sources, /\[…\]/);
});
