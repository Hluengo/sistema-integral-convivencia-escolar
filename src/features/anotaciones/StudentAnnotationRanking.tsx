/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRound } from 'lucide-react';
import type { StudentAnnotationRankingItem } from '../../shared/lib/domain/annotationRankings';
import RankingCard, { type RankingCardItem } from './RankingCard';

interface StudentAnnotationRankingProps {
  ranking: StudentAnnotationRankingItem[];
  isLoading?: boolean;
  error?: Error | null;
}

function toCardItems(ranking: StudentAnnotationRankingItem[]): RankingCardItem[] {
  return ranking.map((item) => ({
    key: item.student_id,
    label: item.student_name,
    sublabel: item.course_name,
    count: item.negative_count,
  }));
}

export default function StudentAnnotationRanking({
  ranking,
  isLoading,
  error,
}: StudentAnnotationRankingProps) {
  return (
    <RankingCard
      title="Estudiantes con más anotaciones negativas"
      titleId="student-annotation-ranking-title"
      icon={UserRound}
      emptyMessage="Aún no hay anotaciones negativas registradas"
      errorMessage="No se pudo cargar el ranking de estudiantes."
      isLoading={isLoading}
      error={error}
      items={toCardItems(ranking)}
      barColorClass="bg-blue-500"
    />
  );
}
