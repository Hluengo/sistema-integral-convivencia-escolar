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
  HeadingLevel,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  ImageRun,
  SectionType,
  convertInchesToTwip,
  PageOrientation,
  ShadingType,
  VerticalAlign,
} from 'docx';
import { getLogoBytes } from './logo';

// ── Colors ──────────────────────────────────────────────────────
const NAVY = '1e3a8a';
const AMBER = 'b45309';
const SLATE_900 = '0f172a';
const SLATE_700 = '334155';
const SLATE_500 = '64748b';
const WHITE = 'ffffff';

// ── Helpers ─────────────────────────────────────────────────────
function heading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'cbd5e1', space: 4 },
    },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 20,
        font: 'Arial',
        color: NAVY,
        allCaps: true,
      }),
    ],
  });
}

function bodyText(text: string, opts?: { bold?: boolean; italic?: boolean }): Paragraph {
  return new Paragraph({
    spacing: { after: 120, line: 360 },
    alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({
        text,
        size: 22,
        font: 'Arial',
        color: SLATE_700,
        bold: opts?.bold,
        italics: opts?.italic,
      }),
    ],
  });
}

function bodyRuns(runs: { text: string; bold?: boolean; italic?: boolean }[]): Paragraph {
  return new Paragraph({
    spacing: { after: 120, line: 360 },
    alignment: AlignmentType.JUSTIFIED,
    children: runs.map(
      r =>
        new TextRun({
          text: r.text,
          size: 22,
          font: 'Arial',
          color: SLATE_700,
          bold: r.bold,
          italics: r.italic,
        }),
    ),
  });
}

function fieldRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 2600, type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            children: [new TextRun({ text: label, bold: true, size: 22, font: 'Arial', color: SLATE_900 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 6800, type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            children: [new TextRun({ text: value, size: 22, font: 'Arial', color: SLATE_700 })],
          }),
        ],
      }),
    ],
  });
}

function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'cbd5e1', space: 4 },
    },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 20,
        font: 'Arial',
        color: NAVY,
        allCaps: true,
      }),
    ],
  });
}

function bulletItem(label: string, description: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80, line: 360 },
    children: [
      new TextRun({ text: '• ', size: 22, font: 'Arial', color: SLATE_700 }),
      new TextRun({ text: label, bold: true, size: 22, font: 'Arial', color: SLATE_900 }),
      new TextRun({ text: ` ${description}`, size: 22, font: 'Arial', color: SLATE_700 }),
    ],
  });
}

function signatureCell(label: string, name: string): TableCell {
  return new TableCell({
    width: { size: 3133, type: WidthType.DXA },
    verticalAlign: VerticalAlign.BOTTOM,
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: WHITE },
      bottom: { style: BorderStyle.NONE, size: 0, color: WHITE },
      left: { style: BorderStyle.NONE, size: 0, color: WHITE },
      right: { style: BorderStyle.NONE, size: 0, color: WHITE },
    },
    children: [
      new Paragraph({ spacing: { after: 0 } }),
      new Paragraph({ spacing: { after: 0 } }),
      new Paragraph({ spacing: { after: 0 } }),
      new Paragraph({ spacing: { after: 0 } }),
      new Paragraph({
        spacing: { after: 40 },
        alignment: AlignmentType.CENTER,
        border: {
          top: { style: BorderStyle.SINGLE, size: 4, color: '94a3b8', space: 4 },
        },
        children: [new TextRun({ text: label, bold: true, size: 18, font: 'Arial', color: SLATE_700 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: name, size: 18, font: 'Arial', color: SLATE_500 })],
      }),
    ],
  });
}

function signatureRow(
  cols: { label: string; name: string }[],
  widthPct?: number,
): TableRow {
  return new TableRow({
    children: cols.map(
      c =>
        new TableCell({
          width: { size: Math.round((widthPct ?? 33.33) * 94.33), type: WidthType.DXA },
          verticalAlign: VerticalAlign.BOTTOM,
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: WHITE },
            bottom: { style: BorderStyle.NONE, size: 0, color: WHITE },
            left: { style: BorderStyle.NONE, size: 0, color: WHITE },
            right: { style: BorderStyle.NONE, size: 0, color: WHITE },
          },
          children: [
            new Paragraph({ spacing: { after: 0 } }),
            new Paragraph({ spacing: { after: 0 } }),
            new Paragraph({ spacing: { after: 0 } }),
            new Paragraph({
              spacing: { after: 40 },
              alignment: AlignmentType.CENTER,
              border: {
                top: { style: BorderStyle.SINGLE, size: 4, color: '94a3b8', space: 4 },
              },
              children: [new TextRun({ text: c.label, bold: true, size: 18, font: 'Arial', color: SLATE_700 })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: c.name, size: 18, font: 'Arial', color: SLATE_500 })],
            }),
          ],
        }),
    ),
  });
}

// ── Header / Footer ────────────────────────────────────────────
function buildHeader(logoBytes: Uint8Array): Header {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [
          new ImageRun({
            data: logoBytes,
            transformation: { width: 36, height: 44 },
            type: 'png',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [
          new TextRun({
            text: 'COLEGIO CARMELA ROMERO DE ESPINOSA',
            bold: true,
            size: 18,
            font: 'Georgia',
            color: NAVY,
            allCaps: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [
          new TextRun({
            text: 'MADRES DOMINICAS DE CONCEPCIÓN',
            bold: true,
            size: 14,
            font: 'Arial',
            color: SLATE_500,
            allCaps: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: 'DIRECCIÓN DE CONVIVENCIA ESCOLAR',
            bold: true,
            size: 14,
            font: 'Arial',
            color: AMBER,
            allCaps: true,
          }),
        ],
      }),
    ],
  });
}

function buildFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: {
          top: { style: BorderStyle.SINGLE, size: 2, color: 'cbd5e1', space: 4 },
        },
        children: [
          new TextRun({
            text: 'Colegio Carmela Romero de Espinosa — Año 2026',
            size: 16,
            font: 'Arial',
            color: SLATE_500,
          }),
          new TextRun({ text: '     |     Página ', size: 16, font: 'Arial', color: SLATE_500 }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, font: 'Arial', color: SLATE_500 }),
          new TextRun({ text: ' de ', size: 16, font: 'Arial', color: SLATE_500 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: 'Arial', color: SLATE_500 }),
        ],
      }),
    ],
  });
}

// ── Document Types ──────────────────────────────────────────────
type DocChild = Paragraph | Table;

interface DocParams {
  studentName: string;
  course: string;
  rut: string;
  teacherName: string;
  coordinatorName: string;
  apoderadoName: string;
  negativeCount: number;
  observations?: string;
  customCommitments?: string[];
  compromisoDate?: string;
  cumplimientoStatus?: string;
}

function buildAmonestacion(p: DocParams): DocChild[] {
  const children: DocChild[] = [];

  // Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      shading: { type: ShadingType.SOLID, color: 'f8fafc', fill: 'f8fafc' },
      border: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'cbd5e1', space: 4 },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'cbd5e1', space: 4 },
        left: { style: BorderStyle.SINGLE, size: 4, color: 'cbd5e1', space: 4 },
        right: { style: BorderStyle.SINGLE, size: 4, color: 'cbd5e1', space: 4 },
      },
      children: [
        new TextRun({
          text: 'CARTA DE AMONESTACIÓN AÑO 2026',
          bold: true,
          size: 22,
          font: 'Arial',
          color: SLATE_900,
          allCaps: true,
        }),
      ],
    }),
  );

  // Section I
  children.push(sectionTitle('I. IDENTIFICACIÓN'));
  children.push(
    new Table({
      width: { size: 9400, type: WidthType.DXA },
      rows: [
        fieldRow('Estudiante:', p.studentName),
        fieldRow('Curso:', p.course),
        fieldRow('Autoridad que Notifica:', p.coordinatorName),
      ],
    }),
  );

  // Section II
  children.push(sectionTitle('II. ANTECEDENTES Y FUNDAMENTACIÓN'));
  children.push(
    bodyRuns([
      { text: 'Se informa al apoderado que el estudiante registra a la fecha una acumulación de ' },
      { text: `${p.negativeCount} anotaciones`, bold: true },
      { text: ' en su hoja de vida por conductas y/o responsabilidad.' },
    ]),
  );
  children.push(
    bodyRuns([
      { text: 'De acuerdo con lo estipulado en el Artículo 24 BIS del Reglamento Interno de Convivencia Escolar (RICE) 2026, al haber alcanzado y superado el umbral de la ' },
      { text: 'Primera acumulación (5 anotaciones leves acumuladas)', italic: true },
      { text: ', corresponde aplicar la medida regulada para este tramo.' },
    ]),
  );

  // Section III
  children.push(sectionTitle('III. MEDIDA DISCIPLINARIA APLICADA'));
  children.push(
    bodyText(
      'En coherencia con el carácter formativo de nuestra disciplina (Art. 5 y Art. 15), se procede a aplicar la Medida N° 3: Amonestación Escrita Formal (según el Art. 18 y el Art. 24 BIS del RICE 2026).',
    ),
  );
  children.push(
    bodyText(
      'El propósito es promover la autorregulación inmediata y la reflexión formativa en el estudiante para evitar que su conducta continúe escalando en el registro de observaciones.',
    ),
  );

  // Section IV
  children.push(sectionTitle('IV. COMPROMISOS ESPECÍFICOS DEL ESTUDIANTE Y APODERADO'));
  children.push(
    bodyText(
      'El estudiante, en conjunto con su familia, se compromete formalmente a cumplir con los siguientes objetivos de mejora, los cuales serán monitoreados periódicamente:',
    ),
  );
  children.push(
    bodyRuns([
      { text: 'Desarrollo de Actitudes Positivas: ', bold: true },
      { text: 'Estimular el esfuerzo personal del alumno para desarrollar conductas constructivas y fortalecer habilidades sociales en beneficio de una sana convivencia escolar.' },
    ]),
  );
  children.push(
    bodyRuns([
      { text: 'Respeto y Resguardo del Clima Escolar: ', bold: true },
      { text: 'Velar activamente por la sana convivencia de la comunidad, evitando de forma estricta participar en juegos, bromas, disturbios o desórdenes que puedan generar daño físico o emocional a terceros.' },
    ]),
  );
  children.push(
    bodyRuns([
      { text: 'Supervisión Familiar Directa: ', bold: true },
      { text: 'El apoderado se compromete a supervisar de forma regular el comportamiento de su pupilo, entregándole directrices claras alineadas con la línea educativa y los valores de nuestro Colegio.' },
    ]),
  );
  children.push(
    bodyRuns([
      { text: 'Comunicación Activa Casa-Colegio: ', bold: true },
      { text: 'El apoderado mantendrá un contacto fluido con la institución, a través de la Profesora Jefe, para informarse oportunamente sobre el desempeño, avances y logros del alumno.' },
    ]),
  );

  // Section V
  children.push(sectionTitle('V. SEGUIMIENTO, MONITOREO Y VIGENCIA'));
  children.push(
    new Table({
      width: { size: 9400, type: WidthType.DXA },
      rows: [
        fieldRow(
          'Vigencia:',
          'Este proceso de acompañamiento y la presente amonestación se mantendrán vigentes durante el transcurso del año escolar 2026.',
        ),
        fieldRow(
          'Seguimiento:',
          'El estudiante será acompañado en su proceso formativo-educativo a través de un seguimiento constante y comunicación directa entre el apoderado, la Profesora Jefe y la Inspectora de Ciclo.',
        ),
        fieldRow(
          'Advertencia:',
          'Se advierte al apoderado que, de continuar acumulando observaciones negativas y alcanzar las diez (10) anotaciones, el Colegio se verá en la necesidad de aplicar la Segunda acumulación contemplada en el Art. 24 BIS, correspondiente a la Medida N° 4: Carta de Compromiso Conductual.',
        ),
      ],
    }),
  );

  // Signatures
  children.push(new Paragraph({ spacing: { before: 600 } }));
  children.push(
    new Table({
      width: { size: 9400, type: WidthType.DXA },
      rows: [
        signatureRow([
          { label: 'FIRMA INSPECTOR/A', name: p.coordinatorName },
          { label: 'FIRMA PROFESOR/A JEFE', name: p.teacherName },
          { label: 'FIRMA APODERADO/A', name: p.apoderadoName || '________________' },
        ]),
      ],
    }),
  );
  children.push(new Paragraph({ spacing: { before: 200 } }));
  children.push(
    new Table({
      width: { size: 9400, type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 9400, type: WidthType.DXA },
              verticalAlign: VerticalAlign.BOTTOM,
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: WHITE },
                bottom: { style: BorderStyle.NONE, size: 0, color: WHITE },
                left: { style: BorderStyle.NONE, size: 0, color: WHITE },
                right: { style: BorderStyle.NONE, size: 0, color: WHITE },
              },
              children: [
                new Paragraph({ spacing: { after: 0 } }),
                new Paragraph({ spacing: { after: 0 } }),
                new Paragraph({ spacing: { after: 0 } }),
                new Paragraph({
                  spacing: { after: 40 },
                  alignment: AlignmentType.CENTER,
                  border: {
                    top: { style: BorderStyle.SINGLE, size: 4, color: '94a3b8', space: 4 },
                  },
                  children: [
                    new TextRun({ text: 'FIRMA ESTUDIANTE', bold: true, size: 18, font: 'Arial', color: SLATE_700 }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: `${p.studentName} — RUT: ${p.rut}`,
                      size: 18,
                      font: 'Arial',
                      color: SLATE_500,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  );

  return children;
}

function buildCompromisoConductual(p: DocParams): DocChild[] {
  const children: DocChild[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      shading: { type: ShadingType.SOLID, color: 'f8fafc', fill: 'f8fafc' },
      border: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'cbd5e1', space: 4 },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'cbd5e1', space: 4 },
        left: { style: BorderStyle.SINGLE, size: 4, color: 'cbd5e1', space: 4 },
        right: { style: BorderStyle.SINGLE, size: 4, color: 'cbd5e1', space: 4 },
      },
      children: [
        new TextRun({
          text: 'CARTA DE COMPROMISO CONDUCTUAL 2026',
          bold: true,
          size: 22,
          font: 'Arial',
          color: SLATE_900,
          allCaps: true,
        }),
      ],
    }),
  );

  children.push(sectionTitle('I. IDENTIFICACIÓN'));
  children.push(
    new Table({
      width: { size: 9400, type: WidthType.DXA },
      rows: [
        fieldRow('Estudiante:', p.studentName),
        fieldRow('Curso:', p.course),
        fieldRow('RUT:', p.rut),
        fieldRow('Profesor/a Jefe:', p.teacherName),
        fieldRow('Autoridad que Notifica:', p.coordinatorName),
      ],
    }),
  );

  children.push(sectionTitle('II. ANTECEDENTES Y FUNDAMENTACIÓN'));
  children.push(
    bodyRuns([
      { text: 'Se informa al apoderado/a que el/la estudiante registra a la fecha una acumulación de ' },
      { text: `${p.negativeCount} anotaciones negativas`, bold: true },
      { text: ' en su hoja de vida escolar.' },
    ]),
  );
  children.push(
    bodyRuns([
      { text: 'De acuerdo con el Artículo 24 BIS del RICE 2026, al haber alcanzado la ' },
      { text: 'Segunda acumulación (10 anotaciones negativas)', italic: true },
      { text: ', se emite la presente Carta de Compromiso Conductual como medida disciplinaria y formativa de carácter obligatorio.' },
    ]),
  );

  children.push(sectionTitle('III. COMPROMISOS DEL ESTUDIANTE'));
  children.push(bodyText('El estudiante se compromete a:'));
  children.push(bulletItem('Respeto Normativo Estricto:', 'Evitar incurrir en cualquier conducta que amerite una nueva anotación negativa.'));
  children.push(bulletItem('Relaciones Prosociales:', 'Mantener un trato digno, empático y respetuoso con toda la comunidad educativa.'));
  children.push(bulletItem('Responsabilidad Personal:', 'Asumir un rol activo en la mejora del clima del curso.'));
  children.push(bulletItem('Uso Responsable de Tecnología:', 'Cumplir estrictamente las normas de uso de celulares y dispositivos.'));

  children.push(sectionTitle('IV. COMPROMISOS DEL APODERADO/A'));
  children.push(bulletItem('Supervisión Directa:', 'Supervisar regularmente la conducta del estudiante.'));
  children.push(bulletItem('Comunicación Activa:', 'Mantener contacto fluido con el profesor/a jefe.'));
  children.push(bulletItem('Apoyo en Casa:', 'Reforzar en el hogar los valores de respeto y responsabilidad.'));
  children.push(bulletItem('Seguimiento Permanente:', 'Participar activamente en reuniones de seguimiento.'));

  children.push(sectionTitle('V. VIGENCIA Y SEGUIMIENTO'));
  children.push(
    new Table({
      width: { size: 9400, type: WidthType.DXA },
      rows: [
        fieldRow('Vigencia:', 'Todo el año escolar 2026.'),
        fieldRow('Seguimiento:', 'Reuniones mensuales con profesor/a jefe.'),
        fieldRow('Incumplimiento:', 'Escalar a Medida N° 5 (Suspensión) según Art. 24 BIS del RICE 2026.'),
      ],
    }),
  );

  children.push(new Paragraph({ spacing: { before: 600 } }));
  children.push(
    new Table({
      width: { size: 9400, type: WidthType.DXA },
      rows: [
        signatureRow([
          { label: 'FIRMA ESTUDIANTE', name: p.studentName },
          { label: 'FIRMA APODERADO/A', name: p.apoderadoName || '________________' },
          { label: 'FIRMA COORDINADOR/A', name: p.coordinatorName },
        ]),
      ],
    }),
  );

  return children;
}

function buildDerivacion(p: DocParams): DocChild[] {
  const children: DocChild[] = [];

  // Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      shading: { type: ShadingType.SOLID, color: 'f8fafc', fill: 'f8fafc' },
      border: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'cbd5e1', space: 4 },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'cbd5e1', space: 4 },
        left: { style: BorderStyle.SINGLE, size: 4, color: 'cbd5e1', space: 4 },
        right: { style: BorderStyle.SINGLE, size: 4, color: 'cbd5e1', space: 4 },
      },
      children: [
        new TextRun({
          text: 'DERIVACIÓN EQUIPO DE CONVIVENCIA ESCOLAR — AÑO 2026',
          bold: true,
          size: 22,
          font: 'Arial',
          color: SLATE_900,
          allCaps: true,
        }),
      ],
    }),
  );

  // Section I
  children.push(sectionTitle('I. IDENTIFICACIÓN'));
  children.push(
    new Table({
      width: { size: 9400, type: WidthType.DXA },
      rows: [
        fieldRow('Estudiante:', p.studentName),
        fieldRow('Curso:', p.course),
        fieldRow('Autoridad que Notifica:', p.coordinatorName),
      ],
    }),
  );

  // Section II
  children.push(sectionTitle('II. ANTECEDENTES DEL PROCESO FORMATIVO PREVIO'));
  children.push(
    bodyRuns([
      { text: '1. Fecha de Suscripción de la Carta de Compromiso: ', bold: true },
      { text: p.compromisoDate || '________________' },
    ]),
  );
  children.push(
    bodyRuns([
      { text: '2. Objeto del Compromiso Firmado: ', bold: true },
      { text: 'Adherencia estricta a las pautas normativas del aula, cese definitivo de conductas disruptivas, respeto a los profesionales de la educación y cumplimiento de la responsabilidad escolar.' },
    ]),
  );
  children.push(
    bodyRuns([
      { text: '3. Estado de Cumplimiento actual: ', bold: true },
      { text: `${p.cumplimientoStatus || 'INCUMPLIDO / NO RESPETADO'}. ` },
      { text: 'El o la estudiante no ha modificado su comportamiento a pesar de los compromisos firmados. Muestra una actitud de desinterés y rechazo frente a las normas de la sala de clases y no sigue las indicaciones de apoyo que el colegio le ha entregado para ayudarle a mejorar.' },
    ]),
  );

  // Section III
  children.push(sectionTitle('III. SUSTENTO NORMATIVO SEGÚN EL RICE 2026'));
  children.push(
    bodyRuns([
      { text: '1. Configuración del Carácter de la Falta (Art. 24 BIS): ', bold: true },
      { text: 'De acuerdo al Artículo 24 BIS del RICE, acumular de forma constante anotaciones negativas daña la sana convivencia dentro del colegio. Esta situación hace que el comportamiento del estudiante pase a ser una ' },
      { text: 'Falta Grave por Acumulación y Desobediencia', bold: true, italic: true },
      { text: '. Esto permite que la Coordinación de Ciclo y el Equipo de Convivencia Escolar intervenogan de inmediato con un plan de apoyo intensivo y evalúen medidas más estrictas (como la Condicionalidad de la Matrícula).' },
    ]),
  );
  children.push(
    bodyRuns([
      { text: '2. Evaluación Longitudinal de la Hoja de Vida (Art. 15.5): ', bold: true },
      { text: 'La determinación de las medidas correctivas exige ponderar la receptividad y la trayectoria conductual del menor a lo largo del año académico. En este caso, concurre la circunstancia ' },
      { text: 'Agravante de Reiteración Sistemática (Art. 17)', bold: true, italic: true },
      { text: ', invalidando los compromisos previos debido a su comportamiento posterior en el aula.' },
    ]),
  );

  // Section IV
  children.push(sectionTitle('IV. OBJETIVOS ESPECÍFICOS DE LA DERIVACIÓN ACTUAL'));
  children.push(
    bodyRuns([
      { text: '1. Intervención y Soporte Psicosocial Intensivo: ', bold: true },
      { text: 'Ejecutar el programa de acompañamiento psicosocial diseñado para estudiantes que presentan resistencia severa al cambio conductual y normativo (Art. 12, Rol del Área de Apoyo).' },
    ]),
  );
  children.push(
    bodyRuns([
      { text: '2. Diagnóstico Formativo Interno: ', bold: true },
      { text: 'Evaluar si las constantes transgresiones a las reglas de comportamiento responden a dificultades emocionales latentes o a dinámicas de interrelación específicas dentro del grupo curso.' },
    ]),
  );
  children.push(
    bodyRuns([
      { text: '3. Preparación de Antecedentes Directivos: ', bold: true },
      { text: 'Levantar un informe técnico que sirva de insumo formativo prioritario ante el Consejo de Profesores y la Dirección del establecimiento en caso de requerirse una resolución disciplinaria formal de condicionalidad o no renovación de matrícula.' },
    ]),
  );

  // Section V - Checklist
  children.push(sectionTitle('V. DOCUMENTACIÓN OBLIGATORIA ADJUNTA AL EXPEDIENTE'));

  const checklistItems = [
    'Copia digitalizada de la Carta de Compromiso Institucional firmada por el apoderado, el alumno y la coordinación.',
    'Reporte digital completo y firmado de la Hoja de Vida del Estudiante (Libro de clases).',
    'Bitácora de entrevistas previas sostenidas por el Profesor Jefe con el apoderado.',
  ];

  for (const item of checklistItems) {
    children.push(
      new Paragraph({
        spacing: { after: 80, line: 360 },
        indent: { left: convertInchesToTwip(0.3) },
        children: [
          new TextRun({ text: '☐  ', size: 22, font: 'Arial', color: SLATE_700 }),
          new TextRun({ text: item, size: 22, font: 'Arial', color: SLATE_700 }),
        ],
      }),
    );
  }

  // Signatures
  children.push(new Paragraph({ spacing: { before: 600 } }));
  children.push(
    new Table({
      width: { size: 9400, type: WidthType.DXA },
      rows: [
        signatureRow([
          { label: 'FIRMA COORDINADOR/A', name: p.coordinatorName },
          { label: '', name: '' },
          { label: 'FIRMA APODERADO/A', name: p.apoderadoName || '________________' },
        ]),
      ],
    }),
  );
  children.push(new Paragraph({ spacing: { before: 200 } }));
  children.push(
    new Table({
      width: { size: 9400, type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 9400, type: WidthType.DXA },
              verticalAlign: VerticalAlign.BOTTOM,
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: WHITE },
                bottom: { style: BorderStyle.NONE, size: 0, color: WHITE },
                left: { style: BorderStyle.NONE, size: 0, color: WHITE },
                right: { style: BorderStyle.NONE, size: 0, color: WHITE },
              },
              children: [
                new Paragraph({ spacing: { after: 0 } }),
                new Paragraph({ spacing: { after: 0 } }),
                new Paragraph({ spacing: { after: 0 } }),
                new Paragraph({
                  spacing: { after: 40 },
                  alignment: AlignmentType.CENTER,
                  border: {
                    top: { style: BorderStyle.SINGLE, size: 4, color: '94a3b8', space: 4 },
                  },
                  children: [
                    new TextRun({ text: 'FIRMA ESTUDIANTE', bold: true, size: 18, font: 'Arial', color: SLATE_700 }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: `${p.studentName} — RUT: ${p.rut}`,
                      size: 18,
                      font: 'Arial',
                      color: SLATE_500,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  );

  return children;
}

// ── Main Export ─────────────────────────────────────────────────
export type DocType = 'amonestacion' | 'compromiso_conductual' | 'derivacion';

export interface BuildDocxParams {
  docType: DocType;
  studentName: string;
  course: string;
  rut: string;
  teacherName: string;
  coordinatorName: string;
  apoderadoName: string;
  negativeCount: number;
  observations?: string;
  customCommitments?: string[];
  compromisoDate?: string;
  cumplimientoStatus?: string;
}

export async function buildDocx(params: BuildDocxParams): Promise<Blob> {
  const logoBytes = await getLogoBytes();

  let children: DocChild[];
  switch (params.docType) {
    case 'amonestacion':
      children = buildAmonestacion(params);
      break;
    case 'compromiso_conductual':
      children = buildCompromisoConductual(params);
      break;
    case 'derivacion':
      children = buildDerivacion(params);
      break;
  }

  const doc = new Document({
    creator: 'Colegio Carmela Romero de Espinosa',
    title:
      params.docType === 'amonestacion'
        ? 'Carta de Amonestación'
        : params.docType === 'compromiso_conductual'
          ? 'Carta de Compromiso Conductual'
          : 'Ficha de Derivación',
    description: 'Documento generado por el Sistema de Gestión de Medidas Disciplinarias',
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 22, color: SLATE_700 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertInchesToTwip(8.27),
              height: convertInchesToTwip(11.69),
              orientation: PageOrientation.PORTRAIT,
            },
            margin: {
              top: convertInchesToTwip(1.0),
              right: convertInchesToTwip(1.0),
              bottom: convertInchesToTwip(1.0),
              left: convertInchesToTwip(1.0),
            },
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
          },
        },
        headers: {
          default: buildHeader(logoBytes),
        },
        footers: {
          default: buildFooter(),
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
