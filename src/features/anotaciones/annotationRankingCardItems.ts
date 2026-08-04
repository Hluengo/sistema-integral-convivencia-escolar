/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type {
  StudentAnnotationRankingItem,
  TeacherAnnotationRankingItem,
} from '../../shared/lib/domain/annotationRankings';
import { createElement } from 'react';
import { maskName } from '../../shared/lib/anotacionesUtils';
import type { RankingCardItem } from './RankingCard';

/**
 * Mapea el ranking de docentes a items de RankingCard.
 * Con privacyMode activado se enmascaran los nombres de docentes.
 */
export function toTeacherCardItems(
  ranking: TeacherAnnotationRankingItem[],
  privacyMode: boolean,
): RankingCardItem[] {
  return ranking.map((item) => ({
    key: item.teacher_name,
    label: maskName(item.teacher_name, privacyMode),
    count: item.negative_count,
    badges: [
      createElement(
        'span',
        { key: 'negative', className: 'rounded bg-grave-50 px-1.5 py-0.5 text-grave-700' },
        `Neg. ${item.negative_count}`,
      ),
      createElement(
        'span',
        { key: 'positive', className: 'rounded bg-leve-50 px-1.5 py-0.5 text-leve-700' },
        `Pos. ${item.positive_count}`,
      ),
      createElement(
        'span',
        { key: 'informative', className: 'rounded bg-sky-50 px-1.5 py-0.5 text-sky-700' },
        `Inf. ${item.informative_count}`,
      ),
      createElement(
        'span',
        { key: 'total', className: 'rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-600' },
        `Total ${item.total_count}`,
      ),
    ],
  }));
}

/**
 * Mapea el ranking de estudiantes a items de RankingCard.
 * Con privacyMode activado se enmascaran los nombres de estudiantes;
 * el curso se conserva porque no es dato personal de NNA.
 */
export function toStudentCardItems(
  ranking: StudentAnnotationRankingItem[],
  privacyMode: boolean,
): RankingCardItem[] {
  return ranking.map((item) => ({
    key: item.student_id,
    label: maskName(item.student_name, privacyMode),
    sublabel: item.course_name,
    count: item.negative_count,
  }));
}
