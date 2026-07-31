/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Users } from 'lucide-react';
import type { TeacherAnnotationRankingItem } from '../../shared/lib/domain/annotationRankings';
import RankingCard, { type RankingCardItem } from './RankingCard';

interface TeacherAnnotationRankingProps {
  ranking: TeacherAnnotationRankingItem[];
  isLoading?: boolean;
  error?: Error | null;
}

function toCardItems(ranking: TeacherAnnotationRankingItem[]): RankingCardItem[] {
  return ranking.map((item) => ({
    key: item.teacher_name,
    label: item.teacher_name,
    count: item.negative_count,
  }));
}

export default function TeacherAnnotationRanking({
  ranking,
  isLoading,
  error,
}: TeacherAnnotationRankingProps) {
  return (
    <RankingCard
      title="Docentes con más anotaciones negativas"
      titleId="teacher-annotation-ranking-title"
      icon={Users}
      emptyMessage="Aún no hay anotaciones negativas registradas"
      errorMessage="No se pudo cargar el ranking de docentes."
      isLoading={isLoading}
      error={error}
      items={toCardItems(ranking)}
      barColorClass="bg-grave-500"
    />
  );
}
