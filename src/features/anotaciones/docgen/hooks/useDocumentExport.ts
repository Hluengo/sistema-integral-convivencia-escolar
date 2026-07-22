import { useCallback, useRef } from 'react';
import { saveAs } from 'file-saver';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, PageBreak, Table, TableRow, TableCell, WidthType } from 'docx';

interface PreviewContent {
  title: string;
  content: string;
  metadata: Record<string, string>;
}

export function useDocumentExport() {
  const pdfBlobRef = useRef<Blob | null>(null);
  const docxBlobRef = useRef<Blob | null>(null);

  const generatePDF = useCallback(async (preview: PreviewContent) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const [font, fontBold] = await Promise.all([
      pdfDoc.embedFont(StandardFonts.Helvetica),
      pdfDoc.embedFont(StandardFonts.HelveticaBold),
    ]);
    const margin = 50;
    let y = height - margin;

    const drawText = (text: string, fontRef: typeof font, size: number, isBold = false) => {
      const f = isBold ? fontBold : fontRef;
      page.drawText(text, {
        x: margin,
        y,
        size,
        font: f,
        color: rgb(0, 0, 0),
        maxWidth: width - 2 * margin,
      });
      y -= size + 4;
    };

    // Title
    drawText(preview.title, font, 18, true);
    y -= 10;

    // Metadata
    Object.entries(preview.metadata).forEach(([key, value]) => {
      drawText(`${key}: ${value}`, font, 10, true);
      drawText(value, font, 10);
    });

    y -= 10;
    drawText('CONTENIDO', font, 12, true);
    y -= 4;

    // Content
    const lines = preview.content.split('\n');
    lines.forEach((line) => {
      if (y < margin + 20) {
        pdfDoc.addPage();
        y = height - margin;
      }
      drawText(line, font, 10);
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    pdfBlobRef.current = blob;
    return blob;
  }, []);

  const generateWord = useCallback(async (preview: PreviewContent) => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: preview.title,
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: '', spacing: { after: 200 } }),
            ...Object.entries(preview.metadata).map(
              ([key, value]) =>
                new Paragraph({
                  children: [
                    new TextRun({ text: `${key}: `, bold: true }),
                    new TextRun({ text: value }),
                  ],
                })
            ),
            new Paragraph({ text: '', spacing: { after: 200 } }),
            new Paragraph({
              text: 'CONTENIDO',
              heading: HeadingLevel.HEADING_1,
            }),
            ...preview.content.split('\n').map(
              (line) =>
                new Paragraph({
                  children: [new TextRun({ text: line, size: 22 })],
                })
            ),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    docxBlobRef.current = blob;
    return blob;
  }, []);

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    saveAs(blob, filename);
  }, []);

  const printDocument = useCallback(async (htmlContent: string) => {
    const fullHtml = `<!DOCTYPE html><html><head><title>Imprimir Documento</title><style>body{font-family:Arial,sans-serif;padding:20px}@media print{body{padding:0}}</style></head><body>${htmlContent}</body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (!printWindow) return;
    const timer = setInterval(() => {
      try {
        if (printWindow.document.readyState === 'complete') {
          clearInterval(timer);
          printWindow.print();
          URL.revokeObjectURL(url);
        }
      } catch { /* cross-origin */ }
    }, 100);
    setTimeout(() => { clearInterval(timer); URL.revokeObjectURL(url); }, 10000);
  }, []);

  return {
    generatePDF,
    generateWord,
    downloadBlob,
    printDocument,
    pdfBlobRef,
    docxBlobRef,
  };
}