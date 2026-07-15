/** @license SPDX-License-Identifier: Apache-2.0 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  ImageRun,
  convertInchesToTwip,
} from 'docx';

// ──────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────

const SCHOOL_NAME = 'Colegio Carmela Romero de Espinosa';
const DEPT_NAME = 'DIRECCIÓN DE CONVIVENCIA ESCOLAR';
const FONT = 'Calibri';
const FONT_SIZE_TITLE = 32;    // 16pt in half-points
const FONT_SIZE_SUBTITLE = 26; // 13pt
const FONT_SIZE_SECTION = 24;  // 12pt
const FONT_SIZE_BODY = 22;     // 11pt
const FONT_SIZE_SMALL = 20;    // 10pt
const FONT_SIZE_TINY = 18;     //  9pt

const PAGE_WIDTH = 11906;  // A4 in twips
const PAGE_HEIGHT = 16838;
const MARGIN = convertInchesToTwip(1);

const COLOR_PRIMARY = '1F3864';  // dark navy
const COLOR_ACCENT = 'C00000';   // dark red

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

export interface BuildDocxParams {
  docType: 'amonestacion' | 'compromiso_conductual' | 'derivacion';
  studentName: string;
  studentRut: string;
  course: string;
  teacher: string;
  apoderadoName: string;
  coordinatorName?: string;
  dateStr: string;
  negativeCount: number;
  observations: string;
  customCommitments?: string[];
  annotations?: Array<{ text: string; date: string; severity: string }>;
  logoBytes?: Uint8Array;
}

// ──────────────────────────────────────────────────────────────────────
// Paragraph helpers
// ──────────────────────────────────────────────────────────────────────

function bodyPara(
  text: string,
  opts?: {
    bold?: boolean;
    size?: number;
    alignment?: 'left' | 'center' | 'right' | 'both' | 'both' | 'end' | 'start' | 'distribute';
    color?: string;
    spacingBefore?: number;
    spacingAfter?: number;
  },
): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: FONT,
        size: opts?.size ?? FONT_SIZE_BODY,
        bold: opts?.bold ?? false,
        color: opts?.color,
      }),
    ],
    alignment: opts?.alignment ?? 'both',
    spacing: {
      before: opts?.spacingBefore ?? 0,
      after: opts?.spacingAfter ?? 120,
      line: 276, // ~1.15 line spacing
    },
  });
}

function multiRunPara(
  runs: TextRun[],
  opts?: {
    alignment?: 'left' | 'center' | 'right' | 'both' | 'both' | 'end' | 'start' | 'distribute';
    spacingBefore?: number;
    spacingAfter?: number;
  },
): Paragraph {
  return new Paragraph({
    children: runs,
    alignment: opts?.alignment ?? 'left',
    spacing: {
      before: opts?.spacingBefore ?? 0,
      after: opts?.spacingAfter ?? 120,
      line: 276,
    },
  });
}

function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: FONT,
        size: FONT_SIZE_SECTION,
        bold: true,
        color: COLOR_PRIMARY,
      }),
    ],
    alignment: 'left',
    spacing: { before: 280, after: 120, line: 276 },
  });
}

function documentTitle(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: FONT,
        size: FONT_SIZE_TITLE,
        bold: true,
        color: COLOR_PRIMARY,
      }),
    ],
    alignment: 'center',
    spacing: { before: 200, after: 320, line: 276 },
  });
}

function emptyLine(): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: '', font: FONT, size: FONT_SIZE_BODY })],
    spacing: { before: 0, after: 0 },
  });
}

// ──────────────────────────────────────────────────────────────────────
// Table helpers
// ──────────────────────────────────────────────────────────────────────

function borderedCell(text: string, opts?: { bold?: boolean; width?: number }): TableCell {
  return new TableCell({
    width: opts?.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            font: FONT,
            size: FONT_SIZE_BODY,
            bold: opts?.bold ?? false,
          }),
        ],
        spacing: { before: 60, after: 60 },
      }),
    ],
  });
}

function dataTable(rows: Array<[string, string]>): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
    },
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            borderedCell(label, { bold: true, width: 2600 }),
            borderedCell(value, { width: 6400 }),
          ],
        }),
    ),
  });
}

// ──────────────────────────────────────────────────────────────────────
// Document-type section builders
// ──────────────────────────────────────────────────────────────────────

function buildHeaderParagraphs(logoBytes?: Uint8Array): Paragraph[] {
  const result: Paragraph[] = [];

  if (logoBytes) {
    result.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: logoBytes,
            transformation: { width: 80, height: 80 },
            type: 'png',
          }),
        ],
        alignment: 'center',
        spacing: { after: 100 },
      }),
    );
  }

  result.push(
    new Paragraph({
      children: [
        new TextRun({
          text: SCHOOL_NAME,
          font: FONT,
          size: FONT_SIZE_SUBTITLE,
          bold: true,
          color: COLOR_PRIMARY,
        }),
      ],
      alignment: 'center',
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: DEPT_NAME,
          font: FONT,
          size: FONT_SIZE_BODY,
          bold: true,
          color: COLOR_ACCENT,
        }),
      ],
      alignment: 'center',
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '_______________________________________________________________________________',
          font: FONT,
          size: FONT_SIZE_TINY,
          color: '999999',
        }),
      ],
      alignment: 'center',
      spacing: { after: 200 },
    }),
  );

  return result;
}

// ── Amonestación ────────────────────────────────────────────────────────────

function buildAmonestacionContent(p: BuildDocxParams): (Paragraph | Table)[] {
  const parts: (Paragraph | Table)[] = [];
  const blocks = getAnnotationBlocks(p.annotations);

  parts.push(sectionTitle('I.  ANTECEDENTES'));
  parts.push(bodyPara('Estimado/a Sr./Sra. ' + p.apoderadoName + ':'));
  parts.push(emptyLine());
  parts.push(
    dataTable([
      ['Nombre del Estudiante', p.studentName],
      ['RUT', p.studentRut],
      ['Curso', p.course],
      ['Profesor(a) Jefe(a)', p.teacher],
      ['Apoderado(a)', p.apoderadoName],
    ]),
  );
  parts.push(emptyLine());

  parts.push(sectionTitle('II.  HECHOS'));
  parts.push(
    bodyPara(
      'Mediante la presente, y en virtud de las atribuciones conferidas por el ' +
        'Reglamento Interno del establecimiento y la normativa educacional vigente, ' +
        'se comunica a usted que el/la estudiante ' +
        p.studentName +
        ' del curso ' +
        p.course +
        ' ha incurrido en las siguientes conductas contrarias a la sana convivencia escolar:',
    ),
  );
  parts.push(emptyLine());
  parts.push(bodyPara(p.observations, { bold: false }));
  parts.push(emptyLine());

  if (blocks.length > 0) {
    parts.push(bodyPara('Registro de observaciones anteriores:', { bold: true }));
    parts.push(emptyLine());
    for (const a of blocks) {
      parts.push(
        bodyPara(
          '\u2022  [' + a.date + '] (' + a.severity + ') ' + a.text,
          { size: FONT_SIZE_SMALL },
        ),
      );
    }
    parts.push(emptyLine());
  }

  parts.push(
    bodyPara(
      'Cantidad de observaciones negativas registradas a la fecha: ' + p.negativeCount + '.',
      { bold: true },
    ),
  );
  parts.push(emptyLine());

  parts.push(sectionTitle('III.  FUNDAMENTACI\u00D3N'));
  parts.push(
    bodyPara(
      'Lo anterior se enmarca en lo dispuesto en el Decreto N\u00B0 67/2018 sobre ' +
        'Evaluaci\u00F3n, la Ley N\u00B0 20.845 de Inclusi\u00F3n Escolar, la Ley N\u00B0 21.809 que ' +
        'modifica la Ley General de Educaci\u00F3n en materia de convivencia escolar, y la ' +
        'Circular N\u00B0 482 de la Superintendencia de Educaci\u00F3n, as\u00ED como en las ' +
        'disposiciones del Reglamento Interno del establecimiento.',
    ),
  );
  parts.push(
    bodyPara(
      'La convivencia escolar se fundamenta en el respeto mutuo, la responsabilidad ' +
        'y el compromiso de todos los actores de la comunidad educativa. Las conductas ' +
        'se\u00F1aladas afectan el normal desarrollo de las actividades acad\u00E9micas y ' +
        'el clima de respeto necesario para el proceso formativo.',
    ),
  );
  parts.push(emptyLine());

  parts.push(sectionTitle('IV.  MEDIDA'));
  parts.push(
    bodyPara(
      'En virtud de los hechos descritos y en aplicaci\u00F3n del Reglamento Interno, ' +
        'se aplica la siguiente medida disciplinaria:',
    ),
  );
  parts.push(emptyLine());
  parts.push(
    bodyPara(
      'AMONESTACI\u00D3N ESCRITA',
      { bold: true, alignment: 'center', size: FONT_SIZE_SECTION, color: COLOR_ACCENT },
    ),
  );
  parts.push(emptyLine());
  parts.push(
    bodyPara(
      'La presente medida queda registrada en el libro de clases y en la hoja de ' +
        'vida del/la estudiante. Se deja constancia que la reiteraci\u00F3n de estas ' +
        'conductas podr\u00E1 dar lugar a medidas de mayor complejidad, conforme al ' +
        'procedimiento gradual establecido en el Reglamento Interno.',
    ),
  );
  parts.push(emptyLine());

  parts.push(sectionTitle('V.  COMPROMISOS'));
  parts.push(
    bodyPara(
      'Se solicita al apoderado/a tomar conocimiento de la presente y asumir los ' +
        'siguientes compromisos:',
    ),
  );
  parts.push(emptyLine());

  const defaultCommitments = [
    'Reforzar en el hogar los valores de respeto y responsabilidad.',
    'Mantener comunicaci\u00F3n fluida con el profesor/a jefe/a y/o la Direcci\u00F3n de Convivencia Escolar.',
    'Supervisar el cumplimiento de las normas de convivencia por parte del/la estudiante.',
    'Asistir a las reuniones y citaciones que realice el establecimiento.',
  ];
  const commitments = p.customCommitments ?? defaultCommitments;

  for (const c of commitments) {
    parts.push(bodyPara('\u2022  ' + c, { size: FONT_SIZE_SMALL }));
  }
  parts.push(emptyLine());

  return parts;
}

// ── Compromiso Conductual ───────────────────────────────────────────────────

function buildCompromisoContent(p: BuildDocxParams): (Paragraph | Table)[] {
  const parts: (Paragraph | Table)[] = [];

  parts.push(sectionTitle('I.  ANTECEDENTES'));
  parts.push(bodyPara('Estimado/a Sr./Sra. ' + p.apoderadoName + ':'));
  parts.push(emptyLine());
  parts.push(
    dataTable([
      ['Nombre del Estudiante', p.studentName],
      ['RUT', p.studentRut],
      ['Curso', p.course],
      ['Profesor(a) Jefe(a)', p.teacher],
      ['Apoderado(a)', p.apoderadoName],
    ]),
  );
  parts.push(emptyLine());

  parts.push(sectionTitle('II.  HECHOS'));
  parts.push(
    bodyPara(
      'Por medio del presente documento, y en el marco del Plan de Gesti\u00F3n de la ' +
        'Convivencia Escolar, se convoca a usted y al/la estudiante ' +
        p.studentName +
        ' a suscribir un Compromiso de Convivencia Escolar, en raz\u00F3n de las ' +
        'siguientes situaciones:',
    ),
  );
  parts.push(emptyLine());
  parts.push(bodyPara(p.observations));
  parts.push(emptyLine());

  const blocks = getAnnotationBlocks(p.annotations);
  if (blocks.length > 0) {
    parts.push(bodyPara('Antecedentes previos:', { bold: true }));
    for (const a of blocks) {
      parts.push(
        bodyPara('\u2022  [' + a.date + '] (' + a.severity + ') ' + a.text, {
          size: FONT_SIZE_SMALL,
        }),
      );
    }
    parts.push(emptyLine());
  }

  parts.push(sectionTitle('III.  COMPROMISOS DEL ESTUDIANTE'));
  parts.push(
    bodyPara(
      'El/la estudiante se compromete voluntariamente a:',
    ),
  );
  parts.push(emptyLine());
  const studentDefaults = [
    'Respetar a todos los miembros de la comunidad educativa.',
    'Cumplir con las normas establecidas en el Reglamento Interno.',
    'Asistir puntualmente a clases y participar activamente en su proceso formativo.',
    'Abstenerse de realizar conductas que afecten la sana convivencia escolar.',
  ];
  const studentComms = p.customCommitments ?? studentDefaults;
  for (const c of studentComms) {
    parts.push(bodyPara('\u2022  ' + c, { size: FONT_SIZE_SMALL }));
  }
  parts.push(emptyLine());

  parts.push(sectionTitle('IV.  COMPROMISOS DEL APODERADO'));
  parts.push(
    bodyPara(
      'El/la apoderado/a se compromete a:',
    ),
  );
  parts.push(emptyLine());
  const apoderadoDefaults = [
    'Acompa\u00F1ar y supervisar el proceso formativo del/la estudiante.',
    'Asistir a las citaciones y reuniones programadas por el establecimiento.',
    'Reforzar en el hogar las normas de convivencia y respeto.',
    'Mantener una comunicaci\u00F3n permanente con el profesor/a jefe/a.',
    'Apoyar el cumplimiento de los compromisos asumidos por el/la estudiante.',
  ];
  for (const c of apoderadoDefaults) {
    parts.push(bodyPara('\u2022  ' + c, { size: FONT_SIZE_SMALL }));
  }
  parts.push(emptyLine());

  parts.push(sectionTitle('V.  SEGUIMIENTO'));
  parts.push(
    bodyPara(
      'El presente compromiso tendr\u00E1 una duraci\u00F3n de [per\u00EDodo a definir] y ser\u00E1 ' +
        'objeto de seguimiento por parte de la Direcci\u00F3n de Convivencia Escolar, ' +
        'el/la profesor/a jefe/a y el equipo de gesti\u00F3n pedag\u00F3gica. Se programar\u00E1n ' +
        'reuniones peri\u00F3dicas para evaluar el cumplimiento de los acuerdos adoptados.',
    ),
  );
  parts.push(emptyLine());
  parts.push(
    bodyPara(
      'El incumplimiento de los compromisos aqu\u00ED adquiridos podr\u00E1 derivar en la ' +
        'aplicaci\u00F3n de medidas disciplinarias de mayor entidad, conforme al ' +
        'Reglamento Interno del establecimiento.',
      { bold: true },
    ),
  );
  parts.push(emptyLine());

  return parts;
}

// ── Derivaci\u00F3n ─────────────────────────────────────────────────────────────

function buildDerivacionContent(p: BuildDocxParams): (Paragraph | Table)[] {
  const parts: (Paragraph | Table)[] = [];

  parts.push(sectionTitle('I.  ANTECEDENTES'));
  parts.push(bodyPara('A quien corresponda:'));
  parts.push(emptyLine());
  parts.push(
    dataTable([
      ['Nombre del Estudiante', p.studentName],
      ['RUT', p.studentRut],
      ['Curso', p.course],
      ['Profesor(a) Jefe(a)', p.teacher],
      ['Apoderado(a)', p.apoderadoName],
      ['Fecha de Derivaci\u00F3n', p.dateStr],
    ]),
  );
  parts.push(emptyLine());

  parts.push(sectionTitle('II.  MOTIVO DE DERIVACI\u00D3N'));
  parts.push(
    bodyPara(
      'Se deriva el caso del/la estudiante ' +
        p.studentName +
        ' del curso ' +
        p.course +
        ' por las siguientes razones:',
    ),
  );
  parts.push(emptyLine());
  parts.push(bodyPara(p.observations));
  parts.push(emptyLine());

  parts.push(sectionTitle('III.  INTERVENCIONES REALIZADAS'));
  parts.push(
    bodyPara(
      'Previo a esta derivaci\u00F3n, se han realizado las siguientes intervenciones ' +
        'desde la Direcci\u00F3n de Convivencia Escolar:',
    ),
  );
  parts.push(emptyLine());

  const intervDefaults = [
    'Di\u00E1logo formativo con el/la estudiante.',
    'Entrevista con el/la apoderado/a.',
    'Registro de observaciones en hoja de vida del estudiante.',
    'Aplicaci\u00F3n de medidas pedag\u00F3gicas y formativas seg\u00FAn corresponda.',
  ];
  for (const i of intervDefaults) {
    parts.push(bodyPara('\u2022  ' + i, { size: FONT_SIZE_SMALL }));
  }

  if (p.annotations && p.annotations.length > 0) {
    parts.push(emptyLine());
    parts.push(bodyPara('Detalle de intervenciones previas:', { bold: true }));
    for (const a of p.annotations) {
      parts.push(
        bodyPara('\u2022  [' + a.date + '] ' + a.text, { size: FONT_SIZE_SMALL }),
      );
    }
  }
  parts.push(emptyLine());

  parts.push(sectionTitle('IV.  ACCIONES SUGERIDAS'));
  parts.push(
    bodyPara(
      'Se sugiere al profesional o unidad receptora considerar las siguientes ' +
        'acciones para abordar la situaci\u00F3n presentada:',
    ),
  );
  parts.push(emptyLine());
  const sugeridas = [
    'Evaluaci\u00F3n psicopedag\u00F3gica o psicosocial del/la estudiante.',
    'Derivaci\u00F3n a redes de apoyo externas (CESFAM, COSAM, OPD, etc.).',
    'Implementaci\u00F3n de adecuaciones curriculares si correspondiere.',
    'Plan de acompa\u00F1amiento individual con enfoque formativo.',
    'Coordinaci\u00F3n con el Programa de Integraci\u00F3n Escolar (PIE) si el/la ' +
      'estudiante se encuentra inscrito.',
  ];
  for (const s of sugeridas) {
    parts.push(bodyPara('\u2022  ' + s, { size: FONT_SIZE_SMALL }));
  }
  parts.push(emptyLine());

  parts.push(sectionTitle('V.  OBSERVACIONES'));
  parts.push(
    bodyPara(
      'Se agradece la atenci\u00F3n dispensada y se solicita mantener informada a ' +
        'esta Direcci\u00F3n sobre las acciones y avances respecto del caso derivado.',
    ),
  );
  parts.push(emptyLine());
  parts.push(
    bodyPara(
      'Quedamos atentos a cualquier consulta o requerimiento adicional para ' +
        'complementar la informaci\u00F3n proporcionada.',
    ),
  );
  parts.push(emptyLine());

  return parts;
}

// ──────────────────────────────────────────────────────────────────────
// Signature area
// ──────────────────────────────────────────────────────────────────────

function buildSignatureArea(params: BuildDocxParams): (Paragraph | Table)[] {
  const parts: (Paragraph | Table)[] = [];

  parts.push(emptyLine());
  parts.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'FIRMAS',
          font: FONT,
          size: FONT_SIZE_SECTION,
          bold: true,
          color: COLOR_PRIMARY,
        }),
      ],
      alignment: 'center',
      spacing: { before: 200, after: 240 },
    }),
  );
  parts.push(emptyLine());

  // Signature table: two columns
  const coordinatorName = params.coordinatorName ?? 'Coordinador/a de Convivencia Escolar';

  const sigTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          // Left column - Coordinator
          new TableCell({
            width: { size: 4500, type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: '_________________________________',
                    font: FONT,
                    size: FONT_SIZE_BODY,
                    color: '666666',
                  }),
                ],
                alignment: 'center',
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: coordinatorName,
                    font: FONT,
                    size: FONT_SIZE_SMALL,
                    bold: true,
                  }),
                ],
                alignment: 'center',
                spacing: { after: 40 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Coordinador/a',
                    font: FONT,
                    size: FONT_SIZE_TINY,
                  }),
                ],
                alignment: 'center',
                spacing: { after: 40 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Direcci\u00F3n de Convivencia Escolar',
                    font: FONT,
                    size: FONT_SIZE_TINY,
                  }),
                ],
                alignment: 'center',
              }),
            ],
          }),
          // Right column - Apoderado
          new TableCell({
            width: { size: 4500, type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: '_________________________________',
                    font: FONT,
                    size: FONT_SIZE_BODY,
                    color: '666666',
                  }),
                ],
                alignment: 'center',
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: params.apoderadoName,
                    font: FONT,
                    size: FONT_SIZE_SMALL,
                    bold: true,
                  }),
                ],
                alignment: 'center',
                spacing: { after: 40 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Apoderado/a',
                    font: FONT,
                    size: FONT_SIZE_TINY,
                  }),
                ],
                alignment: 'center',
                spacing: { after: 40 },
              }),
            ],
          }),
        ],
      }),
    ],
  });

  parts.push(sigTable);
  parts.push(emptyLine());
  parts.push(emptyLine());

  // Place and date
  parts.push(
    multiRunPara(
      [
        new TextRun({
          text: 'Santiago, ',
          font: FONT,
          size: FONT_SIZE_SMALL,
          italics: true,
          color: '666666',
        }),
        new TextRun({
          text: params.dateStr,
          font: FONT,
          size: FONT_SIZE_SMALL,
          italics: true,
          color: '666666',
        }),
      ],
      { alignment: 'center' },
    ),
  );

  return parts;
}

// ──────────────────────────────────────────────────────────────────────
// Annotation helper
// ──────────────────────────────────────────────────────────────────────

function getAnnotationBlocks(
  annotations?: Array<{ text: string; date: string; severity: string }>,
): Array<{ text: string; date: string; severity: string }> {
  if (!annotations || annotations.length === 0) return [];
  return annotations.slice().sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

// ──────────────────────────────────────────────────────────────────────
// Main export
// ──────────────────────────────────────────────────────────────────────

export async function buildDocx(params: BuildDocxParams): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];

  // ── Header ──────────────────────────────────────────────────────
  children.push(...buildHeaderParagraphs(params.logoBytes));

  // ── Title ───────────────────────────────────────────────────────
  const titles: Record<string, string> = {
    amonestacion: 'AMONESTACI\u00D3N ESCRITA',
    compromiso_conductual: 'COMPROMISO DE CONVIVENCIA ESCOLAR',
    derivacion: 'DERIVACI\u00D3N A RED DE APOYO',
  };
  children.push(documentTitle(titles[params.docType]));

  // ── Reference line ──────────────────────────────────────────────
  children.push(
    multiRunPara(
      [
        new TextRun({
          text: 'Ref.: ',
          font: FONT,
          size: FONT_SIZE_SMALL,
          bold: true,
          color: '666666',
        }),
        new TextRun({
          text: titles[params.docType] + ' N\u00B0 ' + params.dateStr.replace(/\//g, ''),
          font: FONT,
          size: FONT_SIZE_SMALL,
          color: '666666',
        }),
      ],
      { alignment: 'left' },
    ),
  );
  children.push(emptyLine());

  // ── Conditional notice for negative count ───────────────────────
  if (params.negativeCount >= 3) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text:
              'NOTA: El/la estudiante acumula ' +
              params.negativeCount +
              ' observaciones negativas, lo que constituye un antecedente ' +
              'relevante para la aplicaci\u00F3n de la presente medida.',
            font: FONT,
            size: FONT_SIZE_SMALL,
            bold: true,
            color: COLOR_ACCENT,
          }),
        ],
        alignment: 'both',
        spacing: { before: 60, after: 200 },
      }),
    );
  }

  // ── Content by document type ────────────────────────────────────
  switch (params.docType) {
    case 'amonestacion':
      children.push(...buildAmonestacionContent(params));
      break;
    case 'compromiso_conductual':
      children.push(...buildCompromisoContent(params));
      break;
    case 'derivacion':
      children.push(...buildDerivacionContent(params));
      break;
  }

  // ── Signature ───────────────────────────────────────────────────
  children.push(...buildSignatureArea(params));

  // ── Build Document ──────────────────────────────────────────────
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: FONT_SIZE_BODY,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE_WIDTH,
              height: PAGE_HEIGHT,
            },
            margin: {
              top: MARGIN,
              bottom: MARGIN,
              left: MARGIN,
              right: MARGIN,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: SCHOOL_NAME + ' | ' + DEPT_NAME,
                    font: FONT,
                    size: FONT_SIZE_TINY,
                    color: '999999',
                  }),
                ],
                alignment: 'right',
                spacing: { after: 0 },
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'P\u00E1gina ',
                    font: FONT,
                    size: FONT_SIZE_TINY,
                    color: '999999',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: FONT,
                    size: FONT_SIZE_TINY,
                    color: '999999',
                  }),
                  new TextRun({
                    text: ' de ',
                    font: FONT,
                    size: FONT_SIZE_TINY,
                    color: '999999',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    font: FONT,
                    size: FONT_SIZE_TINY,
                    color: '999999',
                  }),
                  new TextRun({
                    text: '  |  ' + params.dateStr,
                    font: FONT,
                    size: FONT_SIZE_TINY,
                    color: '999999',
                  }),
                ],
                alignment: 'center',
                spacing: { before: 0, after: 0 },
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}
