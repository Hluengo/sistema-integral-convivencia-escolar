/** @license SPDX-License-Identifier: Apache-2.0 */
import { PDFDocument, StandardFonts, rgb, PDFImage, PageSizes } from 'pdf-lib';
import { getLogoBytes } from './logo';

// ── Constants ───────────────────────────────────────────────────
const PAGE_W = PageSizes.A4[0]; // 595.28
const PAGE_H = PageSizes.A4[1]; // 841.89
const MARGIN_L = 72;
const MARGIN_R = 72;
const MARGIN_T = 72;
const MARGIN_B = 72;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

const NAVY = rgb(0.118, 0.227, 0.541);
const AMBER = rgb(0.706, 0.325, 0.024);
const SLATE_900 = rgb(0.059, 0.090, 0.165);
const SLATE_700 = rgb(0.200, 0.255, 0.333);
const SLATE_500 = rgb(0.392, 0.455, 0.553);
const WHITE = rgb(1, 1, 1);
const LIGHT_GRAY = rgb(0.937, 0.949, 0.965);
const BORDER_GRAY = rgb(0.800, 0.835, 0.867);
const SIG_LINE = rgb(0.580, 0.639, 0.722);

// ── PDF Context ─────────────────────────────────────────────────
class PdfCtx {
  doc!: PDFDocument;
  helvetica!: typeof StandardFonts extends infer T ? Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>> : never;
  helveticaBold!: typeof StandardFonts extends infer T ? Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>> : never;
  times!: typeof StandardFonts extends infer T ? Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>> : never;
  timesBold!: typeof StandardFonts extends infer T ? Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>> : never;
  logo!: PDFImage;
  page!: ReturnType<PDFDocument['addPage']>;
  y = 0;
  page_NUM = 0;

  async init(logoBytes: Uint8Array) {
    this.doc = await PDFDocument.create();
    this.helvetica = await this.doc.embedFont(StandardFonts.Helvetica);
    this.helveticaBold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    this.times = await this.doc.embedFont(StandardFonts.TimesRoman);
    this.timesBold = await this.doc.embedFont(StandardFonts.TimesRomanBold);
    this.logo = await this.doc.embedPng(logoBytes);
    this.newPage();
  }

  newPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.page_NUM++;
    this.y = PAGE_H - MARGIN_T;
    this.drawHeader();
    this.y -= 10;
  }

  drawHeader() {
    const logoW = 32;
    const logoH = 39;
    const cx = PAGE_W / 2;

    // Logo centered
    this.page.drawImage(this.logo, {
      x: cx - logoW / 2,
      y: this.y - logoH,
      width: logoW,
      height: logoH,
    });
    this.y -= logoH + 6;

    // School name
    const schoolName = 'COLEGIO CARMELA ROMERO DE ESPINOSA';
    const sw = this.helveticaBold.widthOfTextAtSize(schoolName, 8);
    this.page.drawText(schoolName, {
      x: cx - sw / 2,
      y: this.y,
      size: 8,
      font: this.helveticaBold,
      color: NAVY,
    });
    this.y -= 12;

    // Subtitle
    const sub = 'MADRES DOMINICAS DE CONCEPCIÓN';
    const suw = this.helvetica.widthOfTextAtSize(sub, 7);
    this.page.drawText(sub, {
      x: cx - suw / 2,
      y: this.y,
      size: 7,
      font: this.helvetica,
      color: SLATE_500,
    });
    this.y -= 10;

    // Department
    const dept = 'DIRECCIÓN DE CONVIVENCIA ESCOLAR';
    const dw = this.helveticaBold.widthOfTextAtSize(dept, 7);
    this.page.drawText(dept, {
      x: cx - dw / 2,
      y: this.y,
      size: 7,
      font: this.helveticaBold,
      color: AMBER,
    });
    this.y -= 6;

    // Separator line
    this.page.drawRectangle({
      x: cx - 50,
      y: this.y,
      width: 100,
      height: 1.5,
      color: AMBER,
    });
    this.y -= 14;
  }

  checkPage(needed: number) {
    if (this.y - needed < MARGIN_B) {
      this.drawFooterOnCurrent();
      this.newPage();
    }
  }

  drawFooterOnCurrent() {
    const footerY = MARGIN_B - 10;
    // Separator
    this.page.drawRectangle({
      x: MARGIN_L,
      y: footerY + 14,
      width: CONTENT_W,
      height: 0.5,
      color: BORDER_GRAY,
    });
    const footerText = `Colegio Carmela Romero de Espinosa — Año 2026     |     Página ${this.page_NUM}`;
    const fw = this.helvetica.widthOfTextAtSize(footerText, 7);
    this.page.drawText(footerText, {
      x: PAGE_W / 2 - fw / 2,
      y: footerY,
      size: 7,
      font: this.helvetica,
      color: SLATE_500,
    });
  }

  drawFooter() {
    this.drawFooterOnCurrent();
  }

  // ── Drawing primitives ────────────────────────────────────────
  text(content: string, x: number, size: number, font: typeof this.helvetica, color: typeof SLATE_700, opts?: { maxWidth?: number }) {
    if (opts?.maxWidth) {
      const lines = this.wrapText(content, font, size, opts.maxWidth);
      for (const line of lines) {
        this.checkPage(size + 4);
        this.page.drawText(line, { x, y: this.y, size, font, color });
        this.y -= size + 4;
      }
    } else {
      this.checkPage(size + 4);
      this.page.drawText(content, { x, y: this.y, size, font, color });
      this.y -= size + 4;
    }
  }

  textCenter(content: string, size: number, font: typeof this.helvetica, color: typeof SLATE_700) {
    const w = font.widthOfTextAtSize(content, size);
    this.checkPage(size + 4);
    this.page.drawText(content, {
      x: PAGE_W / 2 - w / 2,
      y: this.y,
      size,
      font,
      color,
    });
    this.y -= size + 4;
  }

  heading(title: string) {
    this.y -= 10;
    this.checkPage(30);
    // Underline
    this.page.drawRectangle({
      x: MARGIN_L,
      y: this.y + 2,
      width: CONTENT_W,
      height: 0.5,
      color: BORDER_GRAY,
    });
    this.text(title, MARGIN_L, 9, this.helveticaBold, NAVY);
    this.y -= 2;
  }

  body(text: string, opts?: { bold?: boolean; italic?: boolean }) {
    const font = opts?.bold ? this.helveticaBold : this.helvetica;
    this.text(text, MARGIN_L, 10, font, SLATE_700, { maxWidth: CONTENT_W });
  }

  bodyJustified(text: string) {
    // Simple justified: just draw with maxWidth for wrapping
    this.body(text);
  }

  boldLabel(label: string, description: string) {
    const labelW = this.helveticaBold.widthOfTextAtSize(label, 10);
    this.checkPage(14);
    this.page.drawText(label, { x: MARGIN_L, y: this.y, size: 10, font: this.helveticaBold, color: SLATE_900 });
    // Wrap description
    const descMaxW = CONTENT_W - labelW;
    const lines = this.wrapText(description, this.helvetica, 10, descMaxW);
    if (lines.length === 0) {
      this.y -= 14;
      return;
    }
    this.page.drawText(lines[0], { x: MARGIN_L + labelW, y: this.y, size: 10, font: this.helvetica, color: SLATE_700 });
    this.y -= 14;
    for (let i = 1; i < lines.length; i++) {
      this.checkPage(14);
      this.page.drawText(lines[i], { x: MARGIN_L, y: this.y, size: 10, font: this.helvetica, color: SLATE_700 });
      this.y -= 14;
    }
  }

  bullet(label: string, description: string) {
    this.checkPage(14);
    this.page.drawText('•', { x: MARGIN_L, y: this.y, size: 10, font: this.helvetica, color: SLATE_700 });
    const labelW = this.helveticaBold.widthOfTextAtSize(label, 10);
    this.page.drawText(label, { x: MARGIN_L + 10, y: this.y, size: 10, font: this.helveticaBold, color: SLATE_900 });
    const descMaxW = CONTENT_W - 10 - labelW;
    const lines = this.wrapText(description, this.helvetica, 10, descMaxW);
    if (lines.length > 0) {
      this.page.drawText(lines[0], { x: MARGIN_L + 10 + labelW, y: this.y, size: 10, font: this.helvetica, color: SLATE_700 });
    }
    this.y -= 14;
    for (let i = 1; i < lines.length; i++) {
      this.checkPage(14);
      this.page.drawText(lines[i], { x: MARGIN_L + 10, y: this.y, size: 10, font: this.helvetica, color: SLATE_700 });
      this.y -= 14;
    }
  }

  fieldRow(label: string, value: string) {
    this.checkPage(16);
    const labelW = this.helveticaBold.widthOfTextAtSize(label, 10);
    // Draw label
    this.page.drawText(label, { x: MARGIN_L, y: this.y, size: 10, font: this.helveticaBold, color: SLATE_900 });
    // Draw value with wrapping
    const valMaxW = CONTENT_W - labelW - 10;
    const lines = this.wrapText(value, this.helvetica, 10, valMaxW);
    if (lines.length > 0) {
      this.page.drawText(lines[0], { x: MARGIN_L + labelW + 10, y: this.y, size: 10, font: this.helvetica, color: SLATE_700 });
    }
    this.y -= 16;
    for (let i = 1; i < lines.length; i++) {
      this.checkPage(16);
      this.page.drawText(lines[i], { x: MARGIN_L + labelW + 10, y: this.y, size: 10, font: this.helvetica, color: SLATE_700 });
      this.y -= 16;
    }
    // Light separator
    this.page.drawRectangle({
      x: MARGIN_L,
      y: this.y + 4,
      width: CONTENT_W,
      height: 0.3,
      color: rgb(0.95, 0.96, 0.97),
    });
  }

  fieldTable(rows: [string, string][]) {
    for (const [label, value] of rows) {
      this.fieldRow(label, value);
    }
  }

  signatureRow(cols: { label: string; name: string }[]) {
    this.y -= 30;
    this.checkPage(60);
    const colW = CONTENT_W / cols.length;
    for (let i = 0; i < cols.length; i++) {
      const x = MARGIN_L + i * colW;
      const cx = x + colW / 2;

      // Separator line
      this.page.drawRectangle({
        x: x + 10,
        y: this.y,
        width: colW - 20,
        height: 0.8,
        color: SIG_LINE,
      });

      // Label
      const lw = this.helveticaBold.widthOfTextAtSize(cols[i].label, 7);
      this.page.drawText(cols[i].label, {
        x: cx - lw / 2,
        y: this.y - 10,
        size: 7,
        font: this.helveticaBold,
        color: SLATE_700,
      });

      // Name
      const nw = this.helvetica.widthOfTextAtSize(cols[i].name, 7);
      this.page.drawText(cols[i].name, {
        x: cx - nw / 2,
        y: this.y - 20,
        size: 7,
        font: this.helvetica,
        color: SLATE_500,
      });
    }
    this.y -= 30;
  }

  titleBox(text: string) {
    this.y -= 8;
    this.checkPage(30);
    const tw = this.helveticaBold.widthOfTextAtSize(text, 10);

    // Background
    this.page.drawRectangle({
      x: MARGIN_L,
      y: this.y - 6,
      width: CONTENT_W,
      height: 22,
      color: LIGHT_GRAY,
      borderColor: BORDER_GRAY,
      borderWidth: 0.5,
    });

    // Text
    this.page.drawText(text, {
      x: PAGE_W / 2 - tw / 2,
      y: this.y,
      size: 10,
      font: this.helveticaBold,
      color: SLATE_900,
    });
    this.y -= 20;
  }

  spacer(h: number) {
    this.y -= h;
  }

  wrapText(text: string, font: typeof this.helvetica, size: number, maxWidth: number): string[] {
    if (maxWidth <= 0) return [text];
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      const w = font.widthOfTextAtSize(test, size);
      if (w > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.length > 0 ? lines : [''];
  }
}

// ── Document builders ───────────────────────────────────────────
interface PdfParams {
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

async function buildAmonestacionPdf(ctx: PdfCtx, p: PdfParams) {
  ctx.titleBox('CARTA DE AMONESTACIÓN AÑO 2026');

  ctx.heading('I. IDENTIFICACIÓN');
  ctx.fieldTable([
    ['Estudiante:', p.studentName],
    ['Curso:', p.course],
    ['Autoridad que Notifica:', p.coordinatorName],
  ]);

  ctx.heading('II. ANTECEDENTES Y FUNDAMENTACIÓN');
  ctx.bodyJustified(
    `Se informa al apoderado que el estudiante registra a la fecha una acumulación de ${p.negativeCount} anotaciones en su hoja de vida por conductas y/o responsabilidad.`,
  );
  ctx.bodyJustified(
    'De acuerdo con lo estipulado en el Artículo 24 BIS del Reglamento Interno de Convivencia Escolar (RICE) 2026, al haber alcanzado y superado el umbral de la Primera acumulación (5 anotaciones leves acumuladas), corresponde aplicar la medida regulada para este tramo.',
  );

  ctx.heading('III. MEDIDA DISCIPLINARIA APLICADA');
  ctx.bodyJustified(
    'En coherencia con el carácter formativo de nuestra disciplina (Art. 5 y Art. 15), se procede a aplicar la Medida N° 3: Amonestación Escrita Formal (según el Art. 18 y el Art. 24 BIS del RICE 2026).',
  );
  ctx.bodyJustified(
    'El propósito es promover la autorregulación inmediata y la reflexión formativa en el estudiante para evitar que su conducta continúe escalando en el registro de observaciones.',
  );

  ctx.heading('IV. COMPROMISOS ESPECÍFICOS DEL ESTUDIANTE Y APODERADO');
  ctx.bodyJustified(
    'El estudiante, en conjunto con su familia, se compromete formalmente a cumplir con los siguientes objetivos de mejora:',
  );
  ctx.boldLabel('Desarrollo de Actitudes Positivas: ', 'Estimular el esfuerzo personal del alumno para desarrollar conductas constructivas y fortalecer habilidades sociales en beneficio de una sana convivencia escolar.');
  ctx.boldLabel('Respeto y Resguardo del Clima Escolar: ', 'Velar activamente por la sana convivencia de la comunidad, evitando de forma estricta participar en juegos, bromas, disturbios o desórdenes que puedan generar daño físico o emocional a terceros.');
  ctx.boldLabel('Supervisión Familiar Directa: ', 'El apoderado se compromete a supervisar de forma regular el comportamiento de su pupilo, entregándole directrices claras alineadas con la línea educativa y los valores de nuestro Colegio.');
  ctx.boldLabel('Comunicación Activa Casa-Colegio: ', 'El apoderado mantendrá un contacto fluido con la institución, a través de la Profesora Jefe, para informarse oportunamente sobre el desempeño, avances y logros del alumno.');

  if (p.customCommitments && p.customCommitments.length > 0) {
    ctx.boldLabel('Compromisos Adicionales Personalizados:', '');
    for (const c of p.customCommitments) {
      ctx.bullet('', c);
    }
  }

  ctx.heading('V. SEGUIMIENTO, MONITOREO Y VIGENCIA');
  ctx.fieldTable([
    ['Vigencia:', 'Este proceso de acompañamiento y la presente amonestación se mantendrán vigentes durante el transcurso del año escolar 2026.'],
    ['Seguimiento:', 'El estudiante será acompañado en su proceso formativo-educativo a través de un seguimiento constante y comunicación directa entre el apoderado, la Profesora Jefe y la Inspectora de Ciclo.'],
    ['Advertencia:', 'Se advierte al apoderado que, de continuar acumulando observaciones negativas y alcanzar las diez (10) anotaciones, el Colegio se verá en la necesidad de aplicar la Segunda acumulación contemplada en el Art. 24 BIS, correspondiente a la Medida N° 4: Carta de Compromiso Conductual.'],
  ]);

  ctx.signatureRow([
    { label: 'FIRMA INSPECTOR/A', name: p.coordinatorName },
    { label: 'FIRMA PROFESOR/A JEFE', name: p.teacherName },
    { label: 'FIRMA APODERADO/A', name: p.apoderadoName || '________________' },
  ]);

  ctx.spacer(10);

  // Student signature (full width)
  ctx.checkPage(40);
  const cx = PAGE_W / 2;
  ctx.page.drawRectangle({
    x: MARGIN_L + 30,
    y: ctx.y,
    width: CONTENT_W - 60,
    height: 0.8,
    color: SIG_LINE,
  });
  const sLabel = 'FIRMA ESTUDIANTE';
  const slw = ctx.helveticaBold.widthOfTextAtSize(sLabel, 7);
  ctx.page.drawText(sLabel, { x: cx - slw / 2, y: ctx.y - 10, size: 7, font: ctx.helveticaBold, color: SLATE_700 });
  const sName = `${p.studentName} — RUT: ${p.rut}`;
  const snw = ctx.helvetica.widthOfTextAtSize(sName, 7);
  ctx.page.drawText(sName, { x: cx - snw / 2, y: ctx.y - 20, size: 7, font: ctx.helvetica, color: SLATE_500 });
}

async function buildCompromisoConductualPdf(ctx: PdfCtx, p: PdfParams) {
  ctx.titleBox('CARTA DE COMPROMISO CONDUCTUAL 2026');

  ctx.heading('I. IDENTIFICACIÓN');
  ctx.fieldTable([
    ['Estudiante:', p.studentName],
    ['Curso:', p.course],
    ['RUT:', p.rut],
    ['Profesor/a Jefe:', p.teacherName],
    ['Autoridad que Notifica:', p.coordinatorName],
  ]);

  ctx.heading('II. ANTECEDENTES Y FUNDAMENTACIÓN');
  ctx.bodyJustified(
    `Se informa al apoderado/a que el/la estudiante individualizado/a presenta una acumulación de ${p.negativeCount} anotaciones negativas en su hoja de vida escolar.`,
  );
  ctx.bodyJustified(
    'De acuerdo con el Artículo 24 BIS del RICE 2026, al haber alcanzado la Segunda acumulación (10 anotaciones negativas), se emite la presente Carta de Compromiso Conductual como medida disciplinaria y formativa de carácter obligatorio.',
  );

  ctx.heading('III. COMPROMISOS DEL ESTUDIANTE');
  ctx.body('El estudiante se compromete a:');
  ctx.bullet('Respeto Normativo Estricto:', 'Evitar incurrir en cualquier conducta que amerite una nueva anotación negativa.');
  ctx.bullet('Relaciones Prosociales:', 'Mantener un trato digno, empático y respetuoso con toda la comunidad educativa.');
  ctx.bullet('Responsabilidad Personal:', 'Asumir un rol activo en la mejora del clima del curso.');
  ctx.bullet('Uso Responsable de Tecnología:', 'Cumplir estrictamente las normas de uso de celulares y dispositivos.');

  if (p.customCommitments && p.customCommitments.length > 0) {
    for (const c of p.customCommitments) {
      ctx.bullet('', c);
    }
  }

  ctx.heading('IV. COMPROMISOS DEL APODERADO/A');
  ctx.bullet('Supervisión Directa:', 'Supervisar regularmente la conducta del estudiante.');
  ctx.bullet('Comunicación Activa:', 'Mantener contacto fluido con el profesor/a jefe.');
  ctx.bullet('Apoyo en Casa:', 'Reforzar en el hogar los valores de respeto y responsabilidad.');
  ctx.bullet('Seguimiento Permanente:', 'Participar activamente en reuniones de seguimiento.');

  ctx.heading('V. VIGENCIA Y SEGUIMIENTO');
  ctx.fieldTable([
    ['Vigencia:', 'Todo el año escolar 2026.'],
    ['Seguimiento:', 'Reuniones mensuales con profesor/a jefe.'],
    ['Incumplimiento:', 'Escalar a Medida N° 5 (Suspensión) según Art. 24 BIS del RICE 2026.'],
  ]);

  ctx.signatureRow([
    { label: 'FIRMA ESTUDIANTE', name: p.studentName },
    { label: 'FIRMA APODERADO/A', name: p.apoderadoName || '________________' },
    { label: 'FIRMA COORDINADOR/A', name: p.coordinatorName },
  ]);
}

async function buildDerivacionPdf(ctx: PdfCtx, p: PdfParams) {
  ctx.titleBox('DERIVACIÓN EQUIPO DE CONVIVENCIA ESCOLAR — AÑO 2026');

  ctx.heading('I. IDENTIFICACIÓN');
  ctx.fieldTable([
    ['Estudiante:', p.studentName],
    ['Curso:', p.course],
    ['Autoridad que Notifica:', p.coordinatorName],
  ]);

  ctx.heading('II. ANTECEDENTES DEL PROCESO FORMATIVO PREVIO');
  ctx.boldLabel('1. Fecha de Suscripción de la Carta de Compromiso: ', p.compromisoDate || '________________');
  ctx.boldLabel('2. Objeto del Compromiso Firmado: ', 'Adherencia estricta a las pautas normativas del aula, cese definitivo de conductas disruptivas, respeto a los profesionales de la educación y cumplimiento de la responsabilidad escolar.');
  ctx.boldLabel('3. Estado de Cumplimiento actual: ', `${p.cumplimientoStatus || 'INCUMPLIDO / NO RESPETADO'}. El o la estudiante no ha modificado su comportamiento a pesar de los compromisos firmados. Muestra una actitud de desinterés y rechazo frente a las normas de la sala de clases y no sigue las indicaciones de apoyo que el colegio le ha entregado para ayudarle a mejorar.`);

  ctx.heading('III. SUSTENTO NORMATIVO SEGÚN EL RICE 2026');
  ctx.boldLabel('1. Configuración del Carácter de la Falta (Art. 24 BIS): ', 'De acuerdo al Artículo 24 BIS del RICE, acumular de forma constante anotaciones negativas daña la sana convivencia dentro del colegio. Esta situación hace que el comportamiento del estudiante pase a ser una Falta Grave por Acumulación y Desobediencia. Esto permite que la Coordinación de Ciclo y el Equipo de Convivencia Escolar intervenogan de inmediato con un plan de apoyo intensivo y evalúen medidas más estrictas (como la Condicionalidad de la Matrícula).');
  ctx.boldLabel('2. Evaluación Longitudinal de la Hoja de Vida (Art. 15.5): ', 'La determinación de las medidas correctivas exige ponderar la receptividad y la trayectoria conductual del menor a lo largo del año académico. En este caso, concurre la circunstancia Agravante de Reiteración Sistemática (Art. 17), invalidando los compromisos previos debido a su comportamiento posterior en el aula.');

  ctx.heading('IV. OBJETIVOS ESPECÍFICOS DE LA DERIVACIÓN ACTUAL');
  ctx.boldLabel('1. Intervención y Soporte Psicosocial Intensivo: ', 'Ejecutar el programa de acompañamiento psicosocial diseñado para estudiantes que presentan resistencia severa al cambio conductual y normativo (Art. 12, Rol del Área de Apoyo).');
  ctx.boldLabel('2. Diagnóstico Formativo Interno: ', 'Evaluar si las constantes transgresiones a las reglas de comportamiento responden a dificultades emocionales latentes o a dinámicas de interrelación específicas dentro del grupo curso.');
  ctx.boldLabel('3. Preparación de Antecedentes Directivos: ', 'Levantar un informe técnico que sirva de insumo formativo prioritario ante el Consejo de Profesores y la Dirección del establecimiento en caso de requerirse una resolución disciplinaria formal de condicionalidad o no renovación de matrícula.');

  ctx.heading('V. DOCUMENTACIÓN OBLIGATORIA ADJUNTA AL EXPEDIENTE');
  const checklist = [
    'Copia digitalizada de la Carta de Compromiso Institucional firmada por el apoderado, el alumno y la coordinación.',
    'Reporte digital completo y firmado de la Hoja de Vida del Estudiante (Libro de clases).',
    'Bitácora de entrevistas previas sostenidas por el Profesor Jefe con el apoderado.',
  ];
  for (const item of checklist) {
    ctx.checkPage(16);
    ctx.page.drawText('☐', { x: MARGIN_L, y: ctx.y, size: 10, font: ctx.helvetica, color: SLATE_700 });
    const lines = ctx.wrapText(item, ctx.helvetica, 10, CONTENT_W - 16);
    if (lines.length > 0) {
      ctx.page.drawText(lines[0], { x: MARGIN_L + 16, y: ctx.y, size: 10, font: ctx.helvetica, color: SLATE_700 });
    }
    ctx.y -= 14;
    for (let i = 1; i < lines.length; i++) {
      ctx.checkPage(14);
      ctx.page.drawText(lines[i], { x: MARGIN_L + 16, y: ctx.y, size: 10, font: ctx.helvetica, color: SLATE_700 });
      ctx.y -= 14;
    }
  }

  ctx.signatureRow([
    { label: 'FIRMA COORDINADOR/A', name: p.coordinatorName },
    { label: '', name: '' },
    { label: 'FIRMA APODERADO/A', name: p.apoderadoName || '________________' },
  ]);

  ctx.spacer(10);

  // Student signature (full width)
  ctx.checkPage(40);
  const cx = PAGE_W / 2;
  ctx.page.drawRectangle({
    x: MARGIN_L + 30,
    y: ctx.y,
    width: CONTENT_W - 60,
    height: 0.8,
    color: SIG_LINE,
  });
  const sLabel = 'FIRMA ESTUDIANTE';
  const slw = ctx.helveticaBold.widthOfTextAtSize(sLabel, 7);
  ctx.page.drawText(sLabel, { x: cx - slw / 2, y: ctx.y - 10, size: 7, font: ctx.helveticaBold, color: SLATE_700 });
  const sName = `${p.studentName} — RUT: ${p.rut}`;
  const snw = ctx.helvetica.widthOfTextAtSize(sName, 7);
  ctx.page.drawText(sName, { x: cx - snw / 2, y: ctx.y - 20, size: 7, font: ctx.helvetica, color: SLATE_500 });
}

// ── Main export ─────────────────────────────────────────────────
export type PdfDocType = 'amonestacion' | 'compromiso_conductual' | 'derivacion';

export interface BuildPdfParams {
  docType: PdfDocType;
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

export async function buildPdf(params: BuildPdfParams): Promise<Uint8Array> {
  const logoBytes = await getLogoBytes();
  const ctx = new PdfCtx();
  await ctx.init(logoBytes);

  switch (params.docType) {
    case 'amonestacion':
      await buildAmonestacionPdf(ctx, params);
      break;
    case 'compromiso_conductual':
      await buildCompromisoConductualPdf(ctx, params);
      break;
    case 'derivacion':
      await buildDerivacionPdf(ctx, params);
      break;
  }

  ctx.drawFooter();
  return ctx.doc.save();
}
