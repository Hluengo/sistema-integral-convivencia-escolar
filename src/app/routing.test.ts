/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { causaToPath, routeIntentFromPath, viewToPath } from './routing';

describe('app routing', () => {
  it('mapea vistas principales a rutas públicas y autenticadas', () => {
    assert.equal(viewToPath('dashboard'), '/');
    assert.equal(viewToPath('causas'), '/expedientes');
    assert.equal(viewToPath('platform'), '/plataforma');
  });

  it('parsea deep links de expedientes sin perder el id', () => {
    assert.deepEqual(routeIntentFromPath('/expedientes/DC-2026-014'), {
      kind: 'view',
      view: 'causas',
      causaId: 'DC-2026-014',
    });
    assert.equal(causaToPath('DC-2026-014'), '/expedientes/DC-2026-014');
  });

  it('normaliza slash final y rutas desconocidas', () => {
    assert.deepEqual(routeIntentFromPath('/anotaciones/'), {
      kind: 'view',
      view: 'anotaciones',
    });
    assert.deepEqual(routeIntentFromPath('/no-existe'), { kind: 'not-found' });
  });
});
