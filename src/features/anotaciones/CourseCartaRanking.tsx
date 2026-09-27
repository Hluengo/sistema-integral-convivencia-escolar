/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GraduationCap } from "lucide-react";
import type { CourseCartaRankingItem } from "../../shared/lib/domain/courseCartaRanking";
import RankingCard, { type RankingCardItem } from "./RankingCard";

interface CourseCartaRankingProps {
  ranking: CourseCartaRankingItem[];
  isLoading?: boolean;
  error?: Error | null;
}

function LetterBadge({
  count,
  label,
  colorClass,
}: {
  count: number;
  label: string;
  colorClass: string;
}) {
  if (count <= 0) return null;

  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 font-semibold text-10px ${colorClass}`}
    >
      {count} {label}
    </span>
  );
}

function toCardItems(ranking: CourseCartaRankingItem[]): RankingCardItem[] {
  return ranking.map((item) => ({
    key: item.course_name,
    label: item.course_name,
    count: item.total_count,
    badges: (
      <>
        <LetterBadge
          count={item.amonestacion_count}
          label="Amonestación"
          colorClass="bg-slate-100 text-slate-700"
        />
        <LetterBadge
          count={item.compromiso_count}
          label="Compromiso"
          colorClass="bg-orange-50 text-orange-700"
        />
        <LetterBadge
          count={item.derivacion_count}
          label="Derivación"
          colorClass="bg-indigo-50 text-indigo-700"
        />
      </>
    ),
  }));
}

export default function CourseCartaRanking({
  ranking,
  isLoading,
  error,
}: CourseCartaRankingProps) {
  return (
    <RankingCard
      title="Cursos con más cartas"
      titleId="course-carta-ranking-title"
      icon={GraduationCap}
      emptyMessage="Aún no hay cartas disciplinarias registradas"
      errorMessage="No se pudo cargar el ranking de cursos."
      isLoading={isLoading}
      error={error}
      items={toCardItems(ranking)}
      barColorClass="bg-gravisima-500"
      headerBadge="Top Cursos"
      description="Distribución según medidas formalizadas por Jefatura y Convivencia."
    />
  );
}
