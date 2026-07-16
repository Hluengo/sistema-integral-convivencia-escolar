/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { School, Users } from 'lucide-react';

export interface Student {
  id: string;
  full_name: string;
  course_id: string;
  teacher_id: string;
  annotations_count?: number;
  disciplinary_status?: string;
  rut?: string;
  course_name?: string;
}

export interface CourseInfo {
  n: string;
  c: number;
}

export const STEPS = [
  'Curso',
  'Alumno',
  'Documentos',
  'Análisis',
  'Resolución',
  'Revisión',
  'Éxito',
];

export const LEVELS = [
  { key: 'BASICA', label: 'Educación Básica', icon: School },
  { key: 'MEDIA', label: 'Educación Media', icon: Users },
];

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

export function levelFromCourse(name: string): string {
  if (!name) return 'BASICA';
  return name.includes('Medio') ? 'MEDIA' : 'BASICA';
}

export function statusStyle(status?: string): string {
  switch (status) {
    case 'Verde': return 'bg-emerald-100 text-emerald-700';
    case 'Amarillo': return 'bg-yellow-100 text-yellow-700';
    case 'Naranja': return 'bg-orange-100 text-orange-700';
    default: return 'bg-rose-100 text-rose-700';
  }
}
