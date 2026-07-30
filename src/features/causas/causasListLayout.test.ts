/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const featureDir = dirname(fileURLToPath(import.meta.url));
const read = (relativePath: string) => readFileSync(resolve(featureDir, relativePath), 'utf-8');

describe('Listado de causas activas', () => {
  it('presenta las fases como pestañas compactas sobre la gestión de expedientes', () => {
    const view = read('MainContent/CausasView.tsx');
    const tabsPosition = view.indexOf('aria-label="Filtro por fase"');
    const directoryPosition = view.indexOf('Directory scroll panel');

    assert.match(view, /inline-flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1/);
    assert.match(view, /bg-white text-neutral-900 shadow-sm/);
    assert.ok(tabsPosition > 0);
    assert.ok(tabsPosition < directoryPosition);
  });

  it('evita repetir el recorrido de fases y amplía la acción Gestionar', () => {
    const card = read('ui/CausaCard.tsx');

    assert.doesNotMatch(card, /Progreso de fases|FASES_LIST|getPhaseProgress/);
    assert.match(card, /w-full items-center justify-center/);
    assert.match(card, /Gestionar expediente/);
  });
});
