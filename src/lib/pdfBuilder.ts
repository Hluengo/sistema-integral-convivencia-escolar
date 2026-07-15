/** @license SPDX-License-Identifier: Apache-2.0 */

import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';

const MARGIN = 50;
const FONT_SIZE = 10;
const TITLE_SIZE = 14;
const HEADER_SIZE = 12;
const LINE_HEIGHT = 14;

function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (font.widthOfTextAtSize(test, fontSize) > maxWidth) {
      if (line) { lines.push(line); line = word; }
      else { lines.push(test); line = ''; }
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function buildSections(
  docType: 'amonestacion' | 'compromiso_conductual' | 'derivacion',
  params: {
    studentName: string; studentRut: string; course: string; teacher: string;
    apoderadoName: string; dateStr: string; negativeCount: number;
    observations: string; customCommitments?: string[];
  },
): Array<{ title: string; body: string[] }> {
  const base = [
    {
      title: 'I. ANTECEDENTES',
      body: [
        'Estudiante: ' + params.studentName,
        'RUT: ' + params.studentRut,
        'Curso: ' + params.course,
        'Profesor(a) Jefe: ' + params.teacher,
        'Apoderado(a): ' + params.apoderadoName,
        'Fecha: ' + params.dateStr,
        'Cantidad de anotaciones negativas: ' + params.negativeCount,
      ],
    },
  ];

  if (docType === 'amonestacion') {
    base.push(
      {
        title: 'II. HECHOS',
        body: [
          'El estudiante ha acumulado ' + params.negativeCount + ' anotaciones negativas en el presente periodo, lo que constituye un incumplimiento reiterado de las normas de convivencia escolar establecidas en el Reglamento Interno del establecimiento.',
        ],
      },
      {
        title: 'III. FUNDAMENTACION',
        body: [
          'De conformidad con lo dispuesto en el Decreto 67/2018 y la Circular 482 de la Superintendencia de Educacion, el establecimiento educacional tiene la obligacion de aplicar medidas formativas y pedagogicas que promuevan la reflexion y el cambio de conducta del estudiante, resguardando en todo momento el debido proceso y el interes superior del nino, nina o adolescente.',
        ],
      },
      {
        title: 'IV. MEDIDA',
        body: [
          'Se aplica amonestacion escrita, la cual sera registrada en la hoja de vida del estudiante. Ademas, se cita al apoderado(a) a una entrevista con la Direccion de Convivencia Escolar para coordinar estrategias de apoyo y seguimiento.',
        ],
      },
      {
        title: 'V. COMPROMISOS',
        body: [
          'El estudiante se compromete a:',
          ...(params.customCommitments ?? [
            '1. Respetar las normas de convivencia del establecimiento.',
            '2. Mejorar su comportamiento en el aula y espacios comunes.',
            '3. Asistir puntualmente a clases y cumplir con sus deberes academicos.',
            '4. Seguir las indicaciones de sus profesores y asistentes de la educacion.',
          ]),
          '',
          'El apoderado(a) se compromete a:',
          '1. Reforzar en el hogar la importancia del respeto y la disciplina.',
          '2. Mantener comunicacion periodica con el profesor jefe.',
          '3. Supervisar el cumplimiento de los compromisos adquiridos por el estudiante.',
        ],
      },
    );
  } else if (docType === 'compromiso_conductual') {
    base.push(
      {
        title: 'II. HECHOS',
        body: [
          'En virtud de las reiteradas situaciones de indisciplina registradas (' + params.negativeCount + ' anotaciones negativas), y con el objetivo de fortalecer el proceso formativo del estudiante, se procede a formalizar el presente compromiso conductual.',
        ],
      },
      {
        title: 'III. COMPROMISOS DEL ESTUDIANTE',
        body: [
          ...(params.customCommitments ?? [
            '1. Mantener una conducta respetuosa con sus pares y docentes.',
            '2. Cumplir con las normas establecidas en el Reglamento Interno.',
            '3. Asistir regular y puntualmente a clases.',
            '4. Participar en las actividades de apoyo formativo que se determinen.',
          ]),
        ],
      },
      {
        title: 'IV. COMPROMISOS DEL APODERADO',
        body: [
          '1. Acompanar y supervisar el proceso formativo del estudiante.',
          '2. Asistir a las reuniones y entrevistas citadas por el establecimiento.',
          '3. Mantener comunicacion fluida con el profesor jefe y la Direccion de Convivencia Escolar.',
          '4. Reforzar en el hogar los valores y normas de convivencia.',
        ],
      },
      {
        title: 'V. SEGUIMIENTO',
        body: [
          'El presente compromiso tendra una duracion de 30 dias habiles, periodo durante el cual se realizara un acompanamiento semanal por parte del profesor jefe y la Direccion de Convivencia Escolar. Al termino del periodo, se evaluara el cumplimiento de los compromisos adquiridos.',
        ],
      },
    );
  } else {
    base.push(
      {
        title: 'II. MOTIVO DE DERIVACION',
        body: [
          'El estudiante presenta ' + params.negativeCount + ' anotaciones negativas, lo que amerita una intervencion especializada por parte del Equipo de Convivencia Escolar, de acuerdo a lo establecido en el Reglamento Interno y la normativa vigente.',
        ],
      },
      {
        title: 'III. INTERVENCIONES REALIZADAS',
        body: [
          'Se han realizado las siguientes intervenciones previas:',
          '- Entrevistas con el estudiante y apoderado.',
          '- Registro de anotaciones en hoja de vida.',
          '- Comunicaciones con profesor jefe.',
          '- Aplicacion de medidas formativas previas.',
        ],
      },
      {
        title: 'IV. ACCIONES SUGERIDAS',
        body: [
          '1. Evaluacion psicopedagogica del estudiante.',
          '2. Incorporacion a programa de apoyo conductual.',
          '3. Derivacion a dupla psicosocial si corresponde.',
          '4. Plan de acompanamiento personalizado.',
          '5. Seguimiento quincenal del caso.',
          params.observations ? 'Observaciones adicionales: ' + params.observations : '',
        ].filter(Boolean),
      },
      {
        title: 'V. OBSERVACIONES',
        body: [
          'La presente derivacion se realiza en el marco de la Circular 482 y la Ley 21.809, que establecen la obligacion de los establecimientos educacionales de implementar medidas de apoyo y acompanamiento para los estudiantes que presentan dificultades conductuales, garantizando en todo momento el debido proceso y el interes superior del nino.',
        ],
      },
    );
  }

  return base;
}

export async function buildPdf(params: {
  docType: 'amonestacion' | 'compromiso_conductual' | 'derivacion';
  studentName: string; studentRut: string; course: string; teacher: string;
  apoderadoName: string; coordinatorName?: string; dateStr: string;
  negativeCount: number; observations: string; customCommitments?: string[];
  annotations?: Array<{ text: string; date: string; severity: string }>;
  logoBytes?: Uint8Array;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = PageSizes.A4[0];
  const pageHeight = PageSizes.A4[1];
  const maxWidth = pageWidth - 2 * MARGIN;

  let page = pdfDoc.addPage(PageSizes.A4);
  let y = pageHeight - MARGIN;

  function addPage() {
    page = pdfDoc.addPage(PageSizes.A4);
    y = pageHeight - MARGIN;
  }

  function drawText(text: string, size: number = FONT_SIZE, bold: boolean = false, indent: number = 0) {
    const f = bold ? boldFont : font;
    const lines = wrapText(text, f, size, maxWidth - indent);
    for (const line of lines) {
      if (y < MARGIN + 20) addPage();
      page.drawText(line, { x: MARGIN + indent, y, size, font: f, color: rgb(0, 0, 0) });
      y -= size * 1.4;
    }
  }

  // Header
  if (params.logoBytes) {
    try {
      const logo = await pdfDoc.embedPng(params.logoBytes);
      page.drawImage(logo, { x: MARGIN, y: pageHeight - 70, width: 40, height: 40 });
    } catch { /* ignore logo errors */ }
  }
  drawText('COLEGIO CARMELA ROMERO DE ESPINOSA', 11, true, params.logoBytes ? 50 : 0);
  drawText('DIRECCION DE CONVIVENCIA ESCOLAR', 10, false, params.logoBytes ? 50 : 0);
  y -= 10;

  // Line separator
  page.drawLine({ start: { x: MARGIN, y: y }, end: { x: pageWidth - MARGIN, y: y }, thickness: 1, color: rgb(0, 0, 0) });
  y -= 10;

  // Title
  const titles: Record<string, string> = {
    amonestacion: 'CARTA DE AMONESTACION ESCRITA - ANO ' + new Date().getFullYear(),
    compromiso_conductual: 'CARTA DE COMPROMISO CONDUCTUAL - ANO ' + new Date().getFullYear(),
    derivacion: 'DERIVACION EQUIPO DE CONVIVENCIA ESCOLAR - ANO ' + new Date().getFullYear(),
  };
  drawText(titles[params.docType] || 'DOCUMENTO DISCIPLINARIO', TITLE_SIZE, true);
  y -= 8;

  // Sections
  const sections = buildSections(params.docType, params);
  for (const section of sections) {
    if (y < MARGIN + 60) addPage();
    drawText(section.title, HEADER_SIZE, true);
    y -= 4;
    for (const line of section.body) {
      drawText(line, FONT_SIZE, false, 10);
    }
    y -= 8;
  }

  // Signatures
  y -= 10;
  if (y < MARGIN + 60) addPage();
  page.drawLine({ start: { x: MARGIN, y: y }, end: { x: pageWidth - MARGIN, y: y }, thickness: 1, color: rgb(0, 0, 0) });
  y -= 20;

  drawText('____________________________', FONT_SIZE, false);
  drawText('Coordinador(a) de Convivencia Escolar', FONT_SIZE);
  if (params.coordinatorName) drawText(params.coordinatorName, FONT_SIZE);
  y -= 20;

  drawText('____________________________', FONT_SIZE, false);
  drawText('Apoderado(a)', FONT_SIZE);
  drawText(params.apoderadoName, FONT_SIZE);

  return pdfDoc.save();
}
