/** @license SPDX-License-Identifier: Apache-2.0 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Annotation, CartaDisciplinaria } from '@/src/shared/lib/types';
import { supabase } from '@/src/lib/supabase';
import LetterPrintRenderer, { type LetterPrintStudent } from './LetterPrintRenderer';

function getDocumentStyles(): string {
  return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((styleNode) => styleNode.outerHTML)
    .join('\n');
}

function buildLetterHtml(
  carta: CartaDisciplinaria,
  student?: LetterPrintStudent,
  annotations: Annotation[] = []
): string {
  const markup = renderToStaticMarkup(
    React.createElement(LetterPrintRenderer, { carta, student, annotations })
  );
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${carta.letter_type}</title>
  ${getDocumentStyles()}
  <style>
    html, body { margin: 0; background: #fff; }
    body { display: flex; justify-content: center; color: #111827; }
    @page { size: A4; margin: 0; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { width: 210mm; min-height: 297mm; }
      #document-preview-a4 { max-width: none !important; box-shadow: none !important; border: 0 !important; border-radius: 0 !important; }
    }
  </style>
</head>
<body>${markup}</body>
</html>`;
}

function openPrintWindow(html: string): boolean {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    URL.revokeObjectURL(url);
    return false;
  }
  const timer = window.setInterval(() => {
    try {
      if (win.document.readyState === 'complete') {
        window.clearInterval(timer);
        win.print();
        URL.revokeObjectURL(url);
      }
    } catch {
      window.clearInterval(timer);
      URL.revokeObjectURL(url);
    }
  }, 100);
  window.setTimeout(() => {
    window.clearInterval(timer);
    URL.revokeObjectURL(url);
  }, 10000);
  return true;
}

export async function recordLetterOutputEvent(
  carta: CartaDisciplinaria,
  action: 'print' | 'download'
): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const response = await fetch('/api/usage/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        eventName: action === 'print' ? 'letter_printed' : 'letter_downloaded',
        properties: {
          cartaId: carta.id,
          studentId: carta.student_id,
          letterType: carta.letter_type,
          status: carta.status,
        },
      }),
    });

    if (!response.ok && response.status !== 401) {
      console.warn('No se pudo registrar evento de uso de carta:', response.status);
    }
  } catch (error) {
    console.error('Error registrando evento de carta:', error);
  }
}

export async function printHistoricalCarta(
  carta: CartaDisciplinaria,
  student?: LetterPrintStudent,
  annotations: Annotation[] = []
): Promise<boolean> {
  const opened = openPrintWindow(buildLetterHtml(carta, student, annotations));
  if (opened) await recordLetterOutputEvent(carta, 'print');
  return opened;
}

export async function downloadHistoricalCartaPdf(
  carta: CartaDisciplinaria,
  student?: LetterPrintStudent,
  annotations: Annotation[] = []
): Promise<boolean> {
  const opened = openPrintWindow(buildLetterHtml(carta, student, annotations));
  if (opened) await recordLetterOutputEvent(carta, 'download');
  return opened;
}
