/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const uiDir = dirname(fileURLToPath(import.meta.url));

describe('ErrorBoundary', () => {
  it('recupera una vez los chunks obsoletos antes de dejar el fallback manual', async () => {
    const content = await readFile(join(uiDir, 'ErrorBoundary.tsx'), 'utf8');

    assert.match(content, /Failed to fetch dynamically imported module/);
    assert.match(content, /sice:chunk-reload:/);
    assert.match(content, /sessionStorage\.setItem\(reloadKey, '1'\)/);
    assert.match(content, /window\.location\.reload\(\)/);
    assert.match(content, /Recargar aplicación/);
  });
});
