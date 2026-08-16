/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

export interface Student {
  id: string;
  full_name: string;
  course_id: string;
  teacher_id: string;
  annotations_count?: number;
  positive_annotations_count?: number;
  informative_annotations_count?: number;
  disciplinary_status?: string;
  rut?: string;
  course_name?: string;
}

export const CLASSIFICATION_OPTIONS = [
  {
    value: 'amonestacion',
    label: 'Amonestación Escrita',
    desc: 'Para estudiantes con 5-9 anotaciones negativas. Medida formativa.',
    legal: 'Art. 24 RICE 2026 - Circular 482',
  },
  {
    value: 'compromiso',
    label: 'Carta de Compromiso Conductual',
    desc: 'Para estudiantes con 10-14 anotaciones. Acuerdo formal.',
    legal: 'Art. 25 RICE 2026 - Ley 21.809',
  },
  {
    value: 'derivacion',
    label: 'Derivación a Convivencia Escolar',
    desc: 'Para estudiantes con 15+ anotaciones. Intervención especializada.',
    legal: 'Art. 26-27 RICE 2026 - Circular 482',
  },
];

export function statusStyle(status?: string): string {
  switch (status) {
    case 'Verde':
      return 'bg-leve-100 text-leve-700';
    case 'Amarillo':
      return 'bg-grave-100 text-grave-700';
    case 'Naranja':
      return 'bg-muygrave-100 text-muygrave-700';
    default:
      return 'bg-gravisima-100 text-gravisima-700';
  }
}
