/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, type ComponentType } from "react";
import {
  AlertTriangle,
  BarChart3,
  FileQuestion,
  FileText,
  FileWarning,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  AnnotationStageBreakdown,
  AnnotationStageCounts,
} from "../../shared/lib/domain/annotationStageCounts";
import CourseCartaRanking from "./CourseCartaRanking";
import type { CourseCartaRankingItem } from "../../shared/lib/domain/courseCartaRanking";
import TeacherAnnotationRanking from "./TeacherAnnotationRanking";
import type { TeacherAnnotationRankingItem } from "../../shared/lib/domain/annotationRankings";
import StudentAnnotationRanking from "./StudentAnnotationRanking";
import type { StudentAnnotationRankingItem } from "../../shared/lib/domain/annotationRankings";

interface AnotacionesDashboardStatsProps {
  counts: AnnotationStageCounts;
  showStage?: boolean;
  courseCartaRanking?: CourseCartaRankingItem[];
  courseCartaRankingLoading?: boolean;
  courseCartaRankingError?: Error | null;
  teacherAnnotationRanking?: TeacherAnnotationRankingItem[];
  teacherAnnotationRankingLoading?: boolean;
  teacherAnnotationRankingError?: Error | null;
  studentAnnotationRanking?: StudentAnnotationRankingItem[];
  studentAnnotationRankingLoading?: boolean;
  studentAnnotationRankingError?: Error | null;
  privacyMode?: boolean;
}

interface AnnotationStageCardProps {
  label: string;
  threshold: string;
  counts: AnnotationStageBreakdown;
  icon: ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  accentColor: string;
}

export function AnnotationStageCard({
  label,
  threshold,
  counts,
  icon: Icon,
  iconColor,
  accentColor,
}: AnnotationStageCardProps) {
  return (
    <article
      className="flex min-h-[190px] flex-col justify-between rounded-xl border border-slate-200/70 bg-slate-50 p-3"
      style={{ borderTopColor: `${accentColor}66` }}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-bold text-neutral-800 text-xs">{label}</h4>
          <Icon className={`size-4 ${iconColor}`} aria-hidden="true" />
        </div>
        <p className="mt-1 text-neutral-500 text-[10px]">{threshold}</p>
        <div className="mt-2.5 flex items-baseline gap-1.5">
          <p className="font-extrabold text-2xl text-neutral-900 leading-none tabular-nums">
            {counts.total}
          </p>
          <p className="text-neutral-500 text-[11px]">alumnos</p>
        </div>
      </div>
      <dl className="mt-2.5 grid grid-cols-3 gap-1 border-slate-200/70 border-t pt-2.5 text-center text-[10px]">
        <div>
          <dt className="text-neutral-400">Pend.</dt>
          <dd className="font-bold text-gravisima-600 tabular-nums">
            {counts.pending}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-400">Proc.</dt>
          <dd className="font-bold text-brand-700 tabular-nums">
            {counts.processed}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-400">Arch.</dt>
          <dd className="font-bold text-neutral-700 tabular-nums">
            {counts.archived}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export default function AnotacionesDashboardStats({
  counts,
  showStage = true,
  courseCartaRanking = [],
  courseCartaRankingLoading,
  courseCartaRankingError,
  teacherAnnotationRanking = [],
  teacherAnnotationRankingLoading,
  teacherAnnotationRankingError,
  studentAnnotationRanking = [],
  studentAnnotationRankingLoading,
  studentAnnotationRankingError,
  privacyMode = false,
}: AnotacionesDashboardStatsProps) {
  const [priorityOpen, setPriorityOpen] = useState(true);

  return (
    <div className="space-y-6">
      {showStage ? (
        <section
          aria-labelledby="annotation-dashboard-title"
          className="card p-5"
        >
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-neutral-100 p-1.5">
              <BarChart3
                className="h-3.5 w-3.5 text-neutral-500"
                aria-hidden="true"
              />
            </div>
            <h2
              id="annotation-dashboard-title"
              className="font-semibold text-neutral-800 text-sm"
            >
              Estado de medidas y cartas disciplinarias
            </h2>
          </div>
          <div className="mt-4 grid grid-cols-1 divide-y divide-neutral-200 border border-neutral-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            <AnnotationStageCard
              label="Sin Carta"
              counts={counts.sinCarta}
              threshold="1-4 anotaciones"
              icon={FileQuestion}
              iconBg="bg-neutral-50"
              iconColor="text-neutral-600"
              accentColor="#64748b"
            />
            <AnnotationStageCard
              label="Carta de Amonestación"
              counts={counts.amonestacion}
              threshold="5-9 anotaciones"
              icon={FileText}
              iconBg="bg-grave-50"
              iconColor="text-grave-600"
              accentColor="#f59e0b"
            />
            <AnnotationStageCard
              label="Carta de Compromiso"
              counts={counts.compromiso}
              threshold="10-14 anotaciones"
              icon={FileWarning}
              iconBg="bg-muygrave-50"
              iconColor="text-muygrave-600"
              accentColor="#f97316"
            />
            <AnnotationStageCard
              label="Derivación a Convivencia"
              counts={counts.derivacion}
              threshold="15+ anotaciones"
              icon={AlertTriangle}
              iconBg="bg-gravisima-50"
              iconColor="text-gravisima-600"
              accentColor="#ef4444"
            />
          </div>
          <p className="mt-3 text-neutral-500 text-xs leading-relaxed">
            <span className="font-semibold text-grave-700">Pendientes:</span>{" "}
            requieren gestionar la carta o derivación.
            <span className="mx-2 text-neutral-200" aria-hidden="true">
              ·
            </span>
            <span className="font-semibold text-leve-700">Procesadas:</span>{" "}
            carta impresa y disponible para firma.
            <span className="mx-2 text-neutral-200" aria-hidden="true">
              ·
            </span>
            <span className="font-semibold text-neutral-700">Archivadas:</span>{" "}
            carta firmada por apoderado.
          </p>
        </section>
      ) : null}

      <section aria-labelledby="dashboard-priority-title">
        <button
          type="button"
          aria-expanded={priorityOpen}
          aria-controls="dashboard-priority-content"
          onClick={() => setPriorityOpen((open) => !open)}
          className="flex min-h-8 w-full items-center justify-between gap-3 bg-transparent px-0 text-left transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <span className="flex items-center gap-2">
            <BarChart3 className="size-4 text-brand-600" aria-hidden="true" />
            <span
              id="dashboard-priority-title"
              className="font-bold text-neutral-900 text-base"
            >
              Focos de Intervención Prioritaria
            </span>
          </span>
          <span className="text-neutral-500 text-xs">
            Actualizado con el libro de clases digital
          </span>
          {priorityOpen ? (
            <ChevronUp
              className="size-4 shrink-0 text-neutral-500"
              aria-hidden="true"
            />
          ) : (
            <ChevronDown
              className="size-4 shrink-0 text-neutral-500"
              aria-hidden="true"
            />
          )}
        </button>
        {priorityOpen ? (
          <div
            id="dashboard-priority-content"
            className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            <CourseCartaRanking
              ranking={courseCartaRanking.slice(0, 6)}
              isLoading={courseCartaRankingLoading}
              error={courseCartaRankingError}
            />
            <TeacherAnnotationRanking
              ranking={teacherAnnotationRanking}
              isLoading={teacherAnnotationRankingLoading}
              error={teacherAnnotationRankingError}
              privacyMode={privacyMode}
            />
            <StudentAnnotationRanking
              ranking={studentAnnotationRanking.slice(0, 6)}
              isLoading={studentAnnotationRankingLoading}
              error={studentAnnotationRankingError}
              privacyMode={privacyMode}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
