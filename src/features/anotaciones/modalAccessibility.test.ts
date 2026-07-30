/** @license SPDX-License-Identifier: Apache-2.0 */

import { ok } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

const featureDir = import.meta.dirname!;
const source = (relativePath: string) => readFileSync(resolve(featureDir, relativePath), 'utf-8');

describe('Modales disciplinarios accesibles', () => {
  it('la ficha individual usa el diálogo compartido y no un fondo nativo transparente', () => {
    const content = source('AnotacionesStudentDetailModal.tsx');
    const detailModal = source('../../shared/ui/DetailModal.tsx');

    ok(content.includes('<Dialog open'));
    ok(content.includes('<DialogTitle'));
    ok(content.includes('<DialogDescription'));
    ok(content.includes('<DetailModalContent'));
    ok(content.includes('<DetailModalHeader'));
    ok(content.includes('<DetailModalTabs'));
    ok(detailModal.includes('h-[min(92vh,900px)]'));
    ok(detailModal.includes('flex-1 min-h-0 overflow-y-auto'));
    ok(detailModal.includes('bg-gradient-to-br from-slate-700 via-slate-700 to-slate-900'));
    ok(!content.includes('<dialog'));
    ok(!content.includes('bg-transparent'));
  });

  it('el nuevo proceso conserva foco y muestra el error de reglas con reintento', () => {
    const content = source('NewDisciplinaryProcessModal.tsx');

    ok(content.includes('<Dialog open'));
    ok(content.includes("queryKey: ['disciplinary-rules']"));
    ok(content.includes('rulesLoadFailed'));
    ok(content.includes('Reintentar'));
    ok(!content.includes('.catch(() => setRules([]))'));
  });

  it('las acciones de cartas no usan cuadros nativos del navegador', () => {
    const content = source('AnotacionesStudentDetailModal/CartasTab.tsx');

    ok(content.includes('<TextInputDialog'));
    ok(!content.includes('window.prompt'));
    ok(!content.includes('window.alert'));
  });

  it('los diálogos de atajos e impresión usan la primitiva compartida', () => {
    const shortcuts = source('../../components/ShortcutsModal.tsx');
    const printHint = source('docgen/components/PrintHintDialog.tsx');

    ok(shortcuts.includes('<Dialog open'));
    ok(printHint.includes('<Dialog open={isOpen}'));
    ok(shortcuts.includes('<DialogDescription'));
    ok(printHint.includes('<DialogDescription'));
  });
});
