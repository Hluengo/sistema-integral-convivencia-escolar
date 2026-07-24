/** @license SPDX-License-Identifier: Apache-2.0 */

import { describe, it } from 'node:test';
import { equal, ok } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const srcDir = resolve(import.meta.dirname!, '../../../../..');

describe('letter-document — Formato Carta (216x279mm)', () => {
  const cssPath = resolve(import.meta.dirname!, '../letter-document.css');
  let css: string;

  it('debe cargar el CSS', () => {
    css = readFileSync(cssPath, 'utf-8');
    ok(css.length > 0, 'el archivo CSS existe y no esta vacio');
  });

  it('debe definir dimensiones 216mm x 279mm', () => {
    ok(css.includes('width: 216mm'), 'width debe ser 216mm');
    ok(css.includes('height: 279mm'), 'height debe ser 279mm');
    ok(css.includes('min-width: 216mm'), 'min-width debe ser 216mm');
    ok(css.includes('min-height: 279mm'), 'min-height debe ser 279mm');
  });

  it('debe usar padding uniforme de 15mm', () => {
    ok(css.includes('padding: 15mm'), 'padding debe ser 15mm');
    ok(css.includes('padding: 15mm;'), 'padding en .letter-document debe ser 15mm');
  });

  it('debe definir @page size 216mm 279mm', () => {
    ok(css.includes('216mm 279mm'), '@page debe especificar 216mm 279mm');
    ok(css.includes('@page'), '@page rule debe existir');
  });

  it('NO debe referenciar dimensiones antiguas de Oficio (330mm)', () => {
    ok(!css.includes('330mm'), 'NO debe contener 330mm (Oficio)');
    ok(!css.includes('20mm 25mm'), 'NO debe contener margenes antiguos 20mm 25mm');
  });

  it('print media query debe usar dimensiones Carta', () => {
    ok(css.includes('height: 279mm'), '@media print debe usar 279mm');
  });
});

describe('Servicios eliminados — sin dependencias obsoletas', () => {
  async function checkNoImports(pkg: string): Promise<void> {
    try {
      await import(pkg);
    } catch {
      return;
    }
    const files = globImportRefs(pkg);
    equal(files.length, 0, `${pkg} aun se importa en: ${files.join(', ')}`);
  }

  it('pdf-lib NO debe importarse en el proyecto', async () => checkNoImports('pdf-lib'));
  it('html-to-image NO debe importarse en el proyecto', async () =>
    checkNoImports('html-to-image'));
  it('file-saver NO debe importarse en el proyecto', async () => checkNoImports('file-saver'));
  it('docx NO debe importarse en el proyecto', async () => checkNoImports('docx'));
});

describe('DocumentPreview — solo boton Imprimir', () => {
  const previewPath = resolve(import.meta.dirname!, '../DocumentPreview.tsx');
  let content: string;

  it('debe cargar el componente', () => {
    content = readFileSync(previewPath, 'utf-8');
    ok(content.length > 0, 'el archivo existe y no esta vacio');
  });

  it('debe tener boton Imprimir', () => {
    ok(content.includes('Imprimir'), 'debe contener el texto Imprimir');
  });

  it('NO debe tener referencias a PDF', () => {
    ok(!content.includes('onExportPDF'), 'no debe tener onExportPDF');
    ok(!content.includes('Descargar PDF'), 'no debe tener Descargar PDF');
    ok(!content.includes('FileDown'), 'no debe importar FileDown icon');
  });

  it('NO debe tener referencias a Word', () => {
    ok(!content.includes('onExportWord'), 'no debe tener onExportWord');
    ok(!content.includes('Descargar Word'), 'no debe tener Descargar Word');
  });

  it('NO debe tener prop isExportingPdf', () => {
    ok(!content.includes('isExportingPdf'), 'no debe tener isExportingPdf');
  });

  it('NO debe tener prop docObservations', () => {
    ok(!content.includes('docObservations'), 'no debe tener docObservations');
  });
});

describe('LetterA4Document — sin docObservations', () => {
  const docPath = resolve(import.meta.dirname!, '../LetterA4Document.tsx');
  let content: string;

  it('debe cargar el componente', () => {
    content = readFileSync(docPath, 'utf-8');
    ok(content.length > 0, 'el archivo existe y no esta vacio');
  });

  it('NO debe tener prop docObservations en sharedProps', () => {
    ok(!content.includes('docObservations'), 'LetterA4Document no debe tener docObservations');
  });
});

describe('PrintHintDialog — texto Carta', () => {
  const dialogPath = resolve(import.meta.dirname!, '../components/PrintHintDialog.tsx');
  let content: string;

  it('debe cargar el componente', () => {
    content = readFileSync(dialogPath, 'utf-8');
    ok(content.length > 0, 'el archivo existe y no esta vacio');
  });

  it('debe mencionar Carta 216x279mm', () => {
    ok(content.includes('Carta (216 x 279 mm)'), 'debe especificar Carta 216x279mm');
  });

  it('NO debe mencionar Oficio', () => {
    ok(!content.includes('Oficio'), 'NO debe mencionar Oficio');
  });
});

function globImportRefs(pkg: string): string[] {
  try {
    const result = execSync(
      `rg --no-heading -l "from ['\\"]${pkg}['\\"]" "${srcDir}" --include "*.ts" --include "*.tsx" 2>NUL`,
      { encoding: 'utf-8', cwd: srcDir }
    ).trim();
    return result ? result.split('\n').filter(Boolean) : [];
  } catch {
    return [];
  }
}
