/** @license SPDX-License-Identifier: Apache-2.0 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';
import type { CartaDisciplinaria } from '@/src/shared/lib/types';

const TITLE_MAP: Record<string, string> = {
  'Amonestación Escrita': 'Amonestación Escrita',
  'Carta de Compromiso Conductual': 'Carta de Compromiso Conductual',
  'Ficha de Derivación': 'Ficha de Derivación',
};

interface StudentInfo {
  full_name: string;
  course_name?: string;
  course_id?: string;
  rut?: string;
}

export async function downloadCartaPdf(
  carta: CartaDisciplinaria,
  student?: StudentInfo
): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width } = page.getSize();
  const [font, fontBold] = await Promise.all([
    pdfDoc.embedFont(StandardFonts.Helvetica),
    pdfDoc.embedFont(StandardFonts.HelveticaBold),
  ]);
  const margin = 50;

  const courseName = student?.course_name || carta.course || '-';
  const studentName = student?.full_name || carta.student_name;
  const studentRut = student?.rut || '-';

  const lines: { text: string; bold?: boolean; size?: number; gap?: number }[] = [
    { text: 'Fundación Educacional Colegio Carmela Romero de Espinosa', bold: true, size: 10 },
    { text: 'DIRECCIÓN DE CONVIVENCIA ESCOLAR', bold: true, size: 12, gap: 6 },
    { text: '', size: 6 },
    { text: TITLE_MAP[carta.letter_type] || carta.letter_type, bold: true, size: 16, gap: 12 },
    { text: 'DATOS DEL DOCUMENTO', bold: true, size: 11, gap: 6 },
    { text: `Estudiante: ${studentName}`, size: 10 },
    { text: `Curso: ${courseName}`, size: 10 },
    { text: `RUN: ${studentRut}`, size: 10 },
    { text: `Tipo de Carta: ${carta.letter_type}`, size: 10 },
    { text: `Fecha de Emisión: ${carta.emission_date}`, size: 10 },
    { text: `Estado: ${carta.status}`, size: 10 },
    { text: `Emitido por: ${carta.emitted_by || '-'}`, size: 10, gap: 4 },
    { text: '', size: 4 },
    { text: 'FIRMANTES', bold: true, size: 11, gap: 6 },
    { text: `Apoderado: ${carta.apoderado_name || '_________________________'}`, size: 10 },
    { text: `Supervisor: ${carta.supervisor_name || '_________________________'}`, size: 10, gap: 4 },
  ];

  if (carta.observations) {
    lines.push({ text: '', size: 4 });
    lines.push({ text: 'OBSERVACIONES', bold: true, size: 11, gap: 6 });
    lines.push({ text: carta.observations, size: 10, gap: 4 });
  }

  lines.push({ text: '', size: 4 });
  lines.push({ text: 'ANOTACIONES CONSIDERADAS', bold: true, size: 11, gap: 6 });
  lines.push({ text: `N° de Anotaciones Negativas: ${carta.annotations_count}`, size: 10, gap: 6 });

  lines.push({ text: 'Base Reglamentaria: RICE 2026', size: 8, gap: 20 });
  lines.push({ text: 'Firma Apoderado/a', size: 10, gap: 30 });
  lines.push({ text: '_________________________', size: 10, gap: 20 });
  lines.push({ text: 'Firma Encargado/a Convivencia Escolar', size: 10, gap: 30 });
  lines.push({ text: '_________________________', size: 10 });

  let y = page.getHeight() - margin;
  for (const line of lines) {
    page.drawText(line.text, {
      x: margin,
      y,
      size: line.size ?? 10,
      font: line.bold ? fontBold : font,
      color: rgb(0, 0, 0),
      maxWidth: width - 2 * margin,
    });
    y -= (line.size ?? 10) + (line.gap ?? 2);
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const fileName = `${carta.letter_type.replace(/\s+/g, '_')}_${studentName.replace(/\s+/g, '_')}.pdf`;
  saveAs(blob, fileName);
}
