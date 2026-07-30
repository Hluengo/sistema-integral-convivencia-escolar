/** @license SPDX-License-Identifier: Apache-2.0 */

import { ok } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

const featureDir = import.meta.dirname!;
const source = (relativePath: string) => readFileSync(resolve(featureDir, relativePath), 'utf-8');

describe('Resumen de anotaciones', () => {
  it('no repite la identificación del estudiante dentro de la pestaña Estado', () => {
    const summary = source('AnotacionesStudentDetailModal/StudentSummaryTab.tsx');

    ok(summary.includes('Resumen de anotaciones'));
    ok(!summary.includes('student.full_name'));
    ok(!summary.includes('student.rut'));
  });
});
