/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRound } from 'lucide-react';
import type { StudentAnnotationRankingItem } from '../../shared/lib/domain/annotationRankings';
import RankingCard from './RankingCard';
import { toStudentCardItems } from './annotationRankingCardItems';

interface StudentAnnotationRankingProps {
  ranking: StudentAnnotationRankingItem[];
  isLoading?: boolean;
  error?: Error | null;
  privacyMode?: boolean;
}

export default function StudentAnnotationRanking({
  ranking,
  isLoading,
  error,
  privacyMode = false,
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
      items={toStudentCardItems(ranking, privacyMode)}
      barColorClass="bg-blue-500"
    />
  );
}
