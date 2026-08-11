/** @license SPDX-License-Identifier: Apache-2.0 */

import { ok } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

const featureDir = import.meta.dirname!;
const source = (relativePath: string) => readFileSync(resolve(featureDir, relativePath), 'utf-8');

describe('Formulario de nuevo expediente accesible', () => {
  it('el selector RICE usa diálogo compartido en vez de confirmación nativa', () => {
    const content = source('NewCausaForm/RiceConductSelect.tsx');

    ok(content.includes('<AlertDialog'));
    ok(content.includes('Reemplazar observaciones'));
    ok(!content.includes('window.confirm'));
    ok(!content.includes('window.alert'));
    ok(!content.includes('window.prompt'));
  });
});
