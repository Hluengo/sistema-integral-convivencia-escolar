/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Info, Users } from 'lucide-react';
import type { TeacherAnnotationRankingItem } from '../../shared/lib/domain/annotationRankings';
import { maskName } from '../../shared/lib/anotacionesUtils';

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
  const maxNegativeCount =
    ranking.length > 0 ? Math.max(...ranking.map((item) => item.negative_count)) : 0;

  return (
    <article className="card p-5" aria-labelledby="teacher-annotation-ranking-title">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="rounded-lg bg-brand-50 p-2">
            <Users className="h-4 w-4 text-brand-700" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3
              id="teacher-annotation-ranking-title"
              className="font-semibold text-neutral-700 text-sm"
            >
              Panorama de anotaciones docentes
            </h3>
            <p className="mt-1 text-neutral-500 text-xs">
              Todas las anotaciones por docente, ordenadas por negativas.
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-1 font-semibold text-neutral-500 text-[10px] uppercase tracking-wide">
          Top 5
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-neutral-500">
        <LegendDot color="bg-grave-500" label="Negativas" />
        <LegendDot color="bg-leve-500" label="Positivas" />
        <LegendDot color="bg-sky-500" label="Informativas" />
      </div>

      {isLoading ? (
        <div className="space-y-4" aria-hidden="true">
          {[0, 1, 2].map((item) => (
            <div key={item} className="animate-pulse space-y-2">
              <div className="h-4 w-3/5 rounded bg-neutral-100" />
              <div className="h-3 w-2/5 rounded bg-neutral-100" />
              <div className="h-2.5 rounded-full bg-neutral-100" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-gravisima-600 text-sm" role="alert">
          No se pudo cargar el ranking de docentes.
        </p>
      ) : ranking.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <Info className="h-8 w-8 text-neutral-300" aria-hidden="true" />
          <p className="font-medium text-neutral-400 text-sm">
            Aún no hay anotaciones docentes registradas
          </p>
        </div>
      ) : (
        <ol className="space-y-4">
          {ranking.map((item, index) => {
            const total = Math.max(
              item.total_count,
              item.negative_count + item.positive_count + item.informative_count,
            );
            const negativeWidth = total > 0 ? (item.negative_count / total) * 100 : 0;
            const positiveWidth = total > 0 ? (item.positive_count / total) * 100 : 0;
            const informativeWidth = total > 0 ? (item.informative_count / total) * 100 : 0;
            const negativeRankWidth =
              maxNegativeCount > 0 ? (item.negative_count / maxNegativeCount) * 100 : 0;

            return (
              <li
                key={item.teacher_name}
                className="border-neutral-100 border-b pb-4 last:border-b-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 font-semibold text-neutral-500 text-xs">
                      {index + 1}
                    </span>
                    <p className="truncate font-medium text-neutral-800 text-sm">
                      {maskName(item.teacher_name, privacyMode)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-neutral-900 text-lg leading-none tabular-nums">
                      {total}
                    </p>
                    <p className="mt-1 text-neutral-400 text-[10px] uppercase tracking-wide">
                      total
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-medium text-grave-700">
                    {item.negative_count} negativas
                  </span>
                  <span className="text-neutral-400">prioridad del ranking</span>
                </div>

                <div
                  className="mt-1.5 flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-100"
                  role="img"
                  aria-label={`${total} anotaciones: ${item.negative_count} negativas, ${item.positive_count} positivas y ${item.informative_count} informativas`}
                >
                  <span className="bg-grave-500" style={{ width: `${negativeWidth}%` }} />
                  <span className="bg-leve-500" style={{ width: `${positiveWidth}%` }} />
                  <span className="bg-sky-500" style={{ width: `${informativeWidth}%` }} />
                </div>

                <div
                  className="mt-2 flex h-1 overflow-hidden rounded-full bg-neutral-100"
                  aria-hidden="true"
                >
                  <span
                    className="rounded-full bg-grave-300"
                    style={{ width: `${negativeRankWidth}%` }}
                  />
                </div>

                <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px] tabular-nums">
                  <Count
                    label="Neg."
                    value={item.negative_count}
                    tone="text-grave-700 bg-grave-50"
                  />
                  <Count label="Pos." value={item.positive_count} tone="text-leve-700 bg-leve-50" />
                  <Count
                    label="Inf."
                    value={item.informative_count}
                    tone="text-sky-700 bg-sky-50"
                  />
                  <Count label="Total" value={total} tone="text-neutral-600 bg-neutral-100" />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </article>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <span className={`rounded px-1.5 py-1 font-medium ${tone}`}>
      <span className="mr-1 opacity-70">{label}</span>
      {value}
    </span>
  );
}
