/** @license SPDX-License-Identifier: Apache-2.0 */

import type { AnotacionDocumentType } from '../types/documentHub.types';

const LETTER_TYPE_LABEL_MAP: Record<string, string> = {
  'Amonestaci\u00f3n Escrita': 'Carta de Amonestaci\u00f3n',
  'Carta de Compromiso Conductual': 'Carta de Compromiso Conductual',
};

export function getLetterTypeLabel(letterType: string): string {
  return LETTER_TYPE_LABEL_MAP[letterType] || letterType;
}

export function mapLetterTypeToDocType(letterType: string): AnotacionDocumentType {
  if (letterType.includes('Amonestaci\u00f3n')) return 'amonestacion';
  if (letterType.includes('Compromiso')) return 'compromiso_conductual';
  return 'derivacion';
}

export function formatDateES(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
