/** @license SPDX-License-Identifier: Apache-2.0 */

import { describe, it } from 'node:test';
import { equal, ok } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { DEFAULT_LETTER_CONTENT } from '../DocumentPreview/docTypes';
import {
  getCartaProcessingBlockReason,
  getEffectiveDisciplinaryStage,
  getHighestPriorityLetterType,
  getNextLetterAfterPhysicalCarta,
  getPhysicalCartaBaselineType,
  resolveStudentCartaTableState,
} from '../../../../shared/lib/domain/disciplinaryStage';

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

describe('DocumentPreview — acciones del trámite', () => {
  const previewPath = resolve(import.meta.dirname!, '../DocumentPreview.tsx');
  let content: string;

  it('debe cargar el componente', () => {
    content = readFileSync(previewPath, 'utf-8');
    ok(content.length > 0, 'el archivo existe y no esta vacio');
  });

  it('debe tener boton Imprimir', () => {
    ok(content.includes('Imprimir'), 'debe contener el texto Imprimir');
  });

  it('debe mostrar Marcar como procesada junto a Imprimir', () => {
    ok(content.includes('Marcar como procesada'), 'debe permitir confirmar el trámite');
    ok(
      content.indexOf('Imprimir') < content.indexOf('Marcar como procesada'),
      'Marcar como procesada debe aparecer después de Imprimir',
    );
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

  it('debe indicar que el trámite se confirma manualmente', () => {
    ok(
      content.includes('Marcar como procesada'),
      'debe instruir al usuario a confirmar el trámite después de imprimir',
    );
  });
});

describe('Generador de cartas — sin registro y emisión duplicados', () => {
  const generatorPath = resolve(import.meta.dirname!, '../../AnotacionesDocumentGenerator.tsx');
  const formPath = resolve(import.meta.dirname!, '../DocumentForm.tsx');
  let generator: string;
  let form: string;

  it('debe cargar los componentes', () => {
    generator = readFileSync(generatorPath, 'utf-8');
    form = readFileSync(formPath, 'utf-8');
    ok(generator.length > 0);
    ok(form.length > 0);
  });

  it('NO debe ofrecer Registrar y Emitir Carta', () => {
    ok(!form.includes('Registrar y Emitir Carta'));
    ok(!form.includes('onRegisterCommitment'));
  });

  it('NO debe conservar el flujo automático de emisión', () => {
    ok(!generator.includes('EmissionConfirmDialog'));
    ok(!generator.includes('useRegisterCommitment'));
    ok(!generator.includes('onRegistered'));
    ok(!generator.includes('onLetterAction'));
  });
});

describe('Cierre de cartas — validación de etapa registrada', () => {
  const generatorPath = resolve(import.meta.dirname!, '../../AnotacionesDocumentGenerator.tsx');
  const cartasTabPath = resolve(
    import.meta.dirname!,
    '../../AnotacionesStudentDetailModal/CartasTab.tsx',
  );
  const tablePath = resolve(import.meta.dirname!, '../../AnotacionesStudentTable.tsx');

  it('bloquea una derivación cuando Supabase registra menos de 15 negativas', () => {
    equal(
      getCartaProcessingBlockReason('derivacion', 'compromiso_conductual', 14),
      'derivacion_requires_15_registered',
    );
  });

  it('permite procesar la derivación desde 15 negativas registradas', () => {
    equal(getCartaProcessingBlockReason('derivacion', 'derivacion', 15), null);
  });

  it('permite derivación bajo 15 cuando existe Compromiso físico del año', () => {
    equal(
      getCartaProcessingBlockReason('derivacion', 'derivacion', 8, {
        allowDerivacionFromPhysicalCompromiso: true,
      }),
      null,
    );
  });

  it('bloquea un tipo de documento distinto a la etapa registrada', () => {
    equal(
      getCartaProcessingBlockReason('amonestacion', 'compromiso_conductual', 12),
      'letter_type_mismatch',
    );
  });

  it('envía el tipo seleccionado al confirmar y aclara el propósito de la observación', () => {
    const generator = readFileSync(generatorPath, 'utf-8');
    const cartasTab = readFileSync(cartasTabPath, 'utf-8');

    ok(generator.includes('onMarkProcessed(contentSnapshot, docType)'));
    ok(cartasTab.includes('Este texto no cambia el tipo de carta.'));
    ok(cartasTab.includes('Confirme primero la anotación número 15'));
  });

  it('abrir el generador no registra una carta en el historial', () => {
    const cartasTab = readFileSync(cartasTabPath, 'utf-8');
    const historyTab = readFileSync(
      resolve(import.meta.dirname!, '../../AnotacionesStudentDetailModal/HistoryTab.tsx'),
      'utf-8',
    );

    ok(!cartasTab.includes("createCartaEvent("));
    ok(!cartasTab.includes("'created'"));
    ok(historyTab.includes("event.event_type !== 'created'"));
    ok(historyTab.includes("event.event_type !== 'suggested'"));
    ok(!historyTab.includes('Carta creada:'));
    ok(!historyTab.includes('Carta sugerida:'));
  });

  it('muestra el nombre del estado y no la clase CSS en la tabla', () => {
    const table = readFileSync(tablePath, 'utf-8');

    ok(table.includes('{s}'));
    ok(table.includes('badge.textClass'));
    ok(!table.includes('{badge.text}'));
  });
});

describe('Constancias físicas — progresión anual', () => {
  const cartas = [
    {
      origin: 'physical',
      school_year: 2026,
      emission_date: '2026-06-20',
      status: 'Vigente',
      letter_type: 'Amonestación Escrita',
    },
    {
      origin: 'physical',
      school_year: 2025,
      emission_date: '2025-11-20',
      status: 'Vigente',
      letter_type: 'Carta de Compromiso Conductual',
    },
  ];

  it('usa solamente la constancia física del año consultado', () => {
    equal(getPhysicalCartaBaselineType(cartas, 2026), 'Amonestación Escrita');
    equal(getPhysicalCartaBaselineType(cartas, 2027), null);
  });

  it('una Amonestación física habilita Compromiso', () => {
    equal(getNextLetterAfterPhysicalCarta('Amonestación Escrita'), 'compromiso_conductual');
  });

  it('un Compromiso físico habilita Derivación', () => {
    equal(getNextLetterAfterPhysicalCarta('Carta de Compromiso Conductual'), 'derivacion');
  });

  it('la progresión física prevalece sobre una sugerencia inferior por conteo', () => {
    equal(
      getHighestPriorityLetterType('amonestacion', 'derivacion', 'compromiso_conductual'),
      'derivacion',
    );
  });
});

describe('Estado efectivo de cartas en la tabla', () => {
  it('muestra Derivación procesada aunque existan solo 14 negativas', () => {
    const cartaState = resolveStudentCartaTableState(
      [
        {
          letter_type: 'Carta de Compromiso Conductual',
          emission_date: '2026-07-28',
          created_at: '2026-07-28T20:54:55.000Z',
          origin: 'physical',
          school_year: 2026,
          status: 'Vigente',
          workflow_status: 'completed',
        },
        {
          letter_type: 'Ficha de Derivación',
          emission_date: '2026-07-28',
          created_at: '2026-07-28T20:54:58.000Z',
          origin: 'platform',
          school_year: 2026,
          status: 'Vigente',
          workflow_status: 'completed',
          processed_manually_at: '2026-07-28T20:59:32.000Z',
        },
      ],
      2026,
    );

    equal(cartaState.completedLetterType, 'Ficha de Derivación');
    equal(cartaState.currentLetterType, 'Ficha de Derivación');
    equal(cartaState.workflowStatus, 'completed');
    equal(getEffectiveDisciplinaryStage(14, cartaState.completedLetterType).key, 'derivacion');
  });

  it('no deja que una carta de un año anterior altere la progresión vigente', () => {
    const cartaState = resolveStudentCartaTableState(
      [
        {
          letter_type: 'Ficha de Derivación',
          emission_date: '2025-11-20',
          origin: 'platform',
          school_year: 2025,
          status: 'Vigente',
          workflow_status: 'completed',
        },
      ],
      2026,
    );

    equal(cartaState.completedLetterType, null);
    equal(getEffectiveDisciplinaryStage(7, cartaState.completedLetterType).key, 'amonestacion');
  });

  it('mantiene pendiente una Derivación creada pero todavía no procesada', () => {
    const cartaState = resolveStudentCartaTableState(
      [
        {
          letter_type: 'Ficha de Derivación',
          emission_date: '2026-07-28',
          origin: 'platform',
          school_year: 2026,
          status: 'Vigente',
          workflow_status: 'pending',
        },
        {
          letter_type: 'Carta de Compromiso Conductual',
          emission_date: '2026-07-20',
          origin: 'physical',
          school_year: 2026,
          status: 'Vigente',
          workflow_status: 'completed',
        },
      ],
      2026,
    );

    equal(cartaState.currentLetterType, 'Ficha de Derivación');
    equal(cartaState.workflowStatus, 'pending');
    equal(cartaState.completedLetterType, 'Carta de Compromiso Conductual');
  });
});

describe('Carta de derivación — texto institucional', () => {
  it('mantiene el contenido base actualizado', () => {
    const derivacion = DEFAULT_LETTER_CONTENT.derivacion;

    ok(derivacion.motivo.includes('intervención técnica especializada'));
    ok(derivacion.motivo.includes('Art. 24 BIS'));
    ok(derivacion.descripcion.includes('evaluación de factores subyacentes'));
    ok(derivacion.medida.includes('Psicólogo/a de Ciclo o Trabajadora Social'));
    ok(derivacion.medida.includes('garantizar el debido proceso'));
    ok(derivacion.acuerdos.includes('seguimiento quincenal'));
    ok(derivacion.acuerdos.includes('condicionalidad de matrícula'));
    ok(derivacion.cierre.includes('Artículos 12, 19, 20 (Paso 8) y 24 BIS'));
  });
});

describe('Carta de amonestación — texto institucional', () => {
  it('mantiene el contenido base actualizado', () => {
    const amonestacion = DEFAULT_LETTER_CONTENT.amonestacion;

    ok(amonestacion.motivo.includes('primera acumulación crítica de 5 o más anotaciones leves'));
    ok(amonestacion.descripcion.includes('faltas leves (Art. 24)'));
    ok(amonestacion.medida.includes('Amonestación Escrita Formal'));
    ok(amonestacion.acuerdos.includes('Medida 4 (Carta de Compromiso)'));
    ok(amonestacion.cierre.includes('artículos 18 (Medida 3) y 24 BIS'));
  });
});

describe('Carta de compromiso — texto institucional', () => {
  it('mantiene el contenido base actualizado', () => {
    const compromiso = DEFAULT_LETTER_CONTENT.compromiso_conductual;

    ok(compromiso.motivo.includes('10 o más anotaciones leves'));
    ok(compromiso.descripcion.includes('medidas pedagógicas previas'));
    ok(compromiso.medida.includes('Carta de Compromiso Conductual'));
    ok(compromiso.medida.includes('Medida 5'));
    ok(compromiso.acuerdos.includes('objetivos de mejora conductual claros'));
    ok(compromiso.acuerdos.includes('conductas que originan anotaciones negativas'));
    ok(compromiso.acuerdos.includes('evaluación formal del cumplimiento'));
    ok(compromiso.acuerdos.includes('escalada directa a falta muy grave'));
    ok(compromiso.acuerdos.includes('Reglamento Interno de Convivencia Escolar (RICE)'));
    ok(compromiso.cierre.includes('artículos 18 y 24 BIS'));
  });
});

function globImportRefs(pkg: string): string[] {
  try {
    const result = execSync(
      `rg --no-heading -l "from ['\\"]${pkg}['\\"]" "${srcDir}" --include "*.ts" --include "*.tsx" 2>NUL`,
      { encoding: 'utf-8', cwd: srcDir },
    ).trim();
    return result ? result.split('\n').filter(Boolean) : [];
  } catch {
    return [];
  }
}
