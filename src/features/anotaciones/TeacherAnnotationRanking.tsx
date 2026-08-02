/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Users } from 'lucide-react';
import type { TeacherAnnotationRankingItem } from '../../shared/lib/domain/annotationRankings';
import RankingCard from './RankingCard';
import { toTeacherCardItems } from './annotationRankingCardItems';

interface TeacherAnnotationRankingProps {
  ranking: TeacherAnnotationRankingItem[];
  isLoading?: boolean;
  error?: Error | null;
  privacyMode?: boolean;
}

export default function TeacherAnnotationRanking({
  ranking,
  isLoading,
  error,
  privacyMode = false,
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
      items={toTeacherCardItems(ranking, privacyMode)}
      barColorClass="bg-grave-500"
    />
  );
}
