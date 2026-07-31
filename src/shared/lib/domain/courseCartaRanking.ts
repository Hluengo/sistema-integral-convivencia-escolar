/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CourseCartaCount {
  course_name?: string | null;
  letter_type?: string | null;
  status?: string | null;
}

export interface CourseCartaRankingItem {
  course_name: string;
  amonestacion_count: number;
  compromiso_count: number;
  derivacion_count: number;
  total_count: number;
}

const LETTER_TYPE_MAP: Record<
  string,
  keyof Omit<CourseCartaRankingItem, 'course_name' | 'total_count'>
> = {
  'Amonestación Escrita': 'amonestacion_count',
  'Carta de Compromiso Conductual': 'compromiso_count',
  'Ficha de Derivación': 'derivacion_count',
};

/**
 * Aggregates disciplinary letters by normalized course name (lowercase trim)
 * and returns the top N. Used as a fallback when the dedicated RPC is
 * unavailable.
 */
export function aggregateCourseCartaRanking(
  cartas: CourseCartaCount[],
  limit = 5,
): CourseCartaRankingItem[] {
  const countsByCourse = new Map<string, CourseCartaRankingItem>();

  for (const carta of cartas) {
    if (carta.status === 'Anulada') continue;
    const courseName = carta.course_name?.trim() || 'Sin curso';
    const key = courseName.toLowerCase();
    const existing = countsByCourse.get(key) ?? {
      course_name: courseName,
      amonestacion_count: 0,
      compromiso_count: 0,
      derivacion_count: 0,
      total_count: 0,
    };

    const letterKey = carta.letter_type ? LETTER_TYPE_MAP[carta.letter_type] : undefined;
    if (letterKey) {
      existing[letterKey] += 1;
    }
    existing.total_count += 1;

    countsByCourse.set(key, existing);
  }

  return Array.from(countsByCourse.values())
    .sort((a, b) => b.total_count - a.total_count || a.course_name.localeCompare(b.course_name))
    .slice(0, limit);
}
