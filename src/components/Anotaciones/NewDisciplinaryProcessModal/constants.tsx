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

const COURSE_SORT_ORDER: Record<string, number> = {
  '1° BÁSICO A': 1, '1° BÁSICO B': 2,
  '2° BÁSICO A': 3, '2° BÁSICO B': 4,
  '3° BÁSICO A': 5, '3° BÁSICO B': 6,
  '4° BÁSICO A': 7, '4° BÁSICO B': 8,
  '5° BÁSICO A': 9, '5° BÁSICO B': 10,
  '6° BÁSICO A': 11, '6° BÁSICO B': 12,
  '7° BÁSICO A': 13, '7° BÁSICO B': 14,
  '8° BÁSICO A': 15, '8° BÁSICO B': 16,
  '1° MEDIO A': 17, '1° MEDIO B': 18,
  '2° MEDIO A': 19, '2° MEDIO B': 20,
  '3° MEDIO A': 21, '3° MEDIO B': 22,
  '4° MEDIO A': 23, '4° MEDIO B': 24,
};

export function sortCourses(courses: CourseInfo[]): CourseInfo[] {
  return [...courses].sort((a, b) => {
    const orderA = COURSE_SORT_ORDER[a.n] ?? 999;
    const orderB = COURSE_SORT_ORDER[b.n] ?? 999;
    return orderA - orderB;
  });
}

export function statusStyle(status?: string): string {
  switch (status) {
    case 'Verde': return 'bg-emerald-100 text-emerald-700';
    case 'Amarillo': return 'bg-yellow-100 text-yellow-700';
    case 'Naranja': return 'bg-orange-100 text-orange-700';
    default: return 'bg-rose-100 text-rose-700';
  }
}
