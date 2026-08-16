/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ComponentType } from 'react';
import { AlertTriangle, BarChart3, FileQuestion, FileText, FileWarning } from 'lucide-react';
import type {
  AnnotationStageBreakdown,
  AnnotationStageCounts,
} from '../../shared/lib/domain/annotationStageCounts';
import CourseCartaRanking from './CourseCartaRanking';
import type { CourseCartaRankingItem } from '../../shared/lib/domain/courseCartaRanking';
import TeacherAnnotationRanking from './TeacherAnnotationRanking';
import type { TeacherAnnotationRankingItem } from '../../shared/lib/domain/annotationRankings';
import StudentAnnotationRanking from './StudentAnnotationRanking';
import type { StudentAnnotationRankingItem } from '../../shared/lib/domain/annotationRankings';

interface AnotacionesDashboardStatsProps {
  counts: AnnotationStageCounts;
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

function AnnotationStageCard({
  label,
  threshold,
  counts,
  icon: Icon,
  iconBg,
  iconColor,
  accentColor,
}: AnnotationStageCardProps) {
  return (
    <article className="card relative overflow-hidden p-5">
      <div
        className="absolute top-0 right-3 left-3 h-[3px] rounded-full"
        style={{ backgroundColor: accentColor }}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-neutral-700 text-sm">{label}</h4>
          <p className="mt-0.5 text-neutral-400 text-xs">{threshold}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-bold text-3xl text-neutral-900 tabular-nums">{counts.total}</p>
          <p className="font-medium text-neutral-400 text-xs">Total</p>
        </div>
        <dl className="grid min-w-0 flex-1 grid-cols-3 gap-1.5 text-center">
          <div className="min-w-0 rounded-lg bg-grave-50 px-1.5 py-1.5 sm:px-2">
            <dt className="whitespace-nowrap font-medium text-[9px] text-grave-700 leading-tight tracking-tight sm:text-[10px]">
              Pendientes
            </dt>
            <dd className="font-bold text-grave-700 text-lg tabular-nums">{counts.pending}</dd>
          </div>
          <div className="min-w-0 rounded-lg bg-leve-50 px-1.5 py-1.5 sm:px-2">
            <dt className="whitespace-nowrap font-medium text-[9px] text-leve-700 leading-tight tracking-tight sm:text-[10px]">
              Procesadas
            </dt>
            <dd className="font-bold text-leve-700 text-lg tabular-nums">{counts.processed}</dd>
          </div>
          <div className="min-w-0 rounded-lg bg-neutral-100 px-1.5 py-1.5 sm:px-2">
            <dt className="whitespace-nowrap font-medium text-[9px] text-neutral-700 leading-tight tracking-tight sm:text-[10px]">
              Archivadas
            </dt>
            <dd className="font-bold text-neutral-700 text-lg tabular-nums">{counts.archived}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

export default function AnotacionesDashboardStats({
  counts,
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
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-neutral-100 p-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
          </div>
          <h3 className="font-semibold text-neutral-500 text-xs uppercase tracking-[0.06em]">
            Anotaciones
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AnnotationStageCard
            label="Sin Carta"
            counts={counts.sinCarta}
            threshold="1-4 anotaciones negativas"
            icon={FileQuestion}
            iconBg="bg-neutral-50"
            iconColor="text-neutral-600"
            accentColor="#64748b"
          />
          <AnnotationStageCard
            label="Carta de Amonestación"
            counts={counts.amonestacion}
            threshold="5-9 anotaciones negativas"
            icon={FileText}
            iconBg="bg-grave-50"
            iconColor="text-grave-600"
            accentColor="#f59e0b"
          />
          <AnnotationStageCard
            label="Carta de Compromiso"
            counts={counts.compromiso}
            threshold="10-14 anotaciones negativas"
            icon={FileWarning}
            iconBg="bg-muygrave-50"
            iconColor="text-muygrave-600"
            accentColor="#f97316"
          />
          <AnnotationStageCard
            label="Derivación a Convivencia"
            counts={counts.derivacion}
            threshold="15+ anotaciones negativas"
            icon={AlertTriangle}
            iconBg="bg-gravisima-50"
            iconColor="text-gravisima-600"
            accentColor="#ef4444"
          />
        </div>
        <p className="mt-3 text-neutral-500 text-xs leading-relaxed">
          <span className="font-semibold text-grave-700">Pendientes:</span> requieren gestionar la
          carta o derivación.
          <span className="mx-2 text-neutral-300" aria-hidden="true">
            ·
          </span>
          <span className="font-semibold text-leve-700">Procesadas:</span> carta impresa y
          disponible para firma.
          <span className="mx-2 text-neutral-300" aria-hidden="true">
            ·
          </span>
          <span className="font-semibold text-neutral-700">Archivadas:</span> carta firmada por
          apoderado.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CourseCartaRanking
          ranking={courseCartaRanking}
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
          ranking={studentAnnotationRanking}
          isLoading={studentAnnotationRankingLoading}
          error={studentAnnotationRankingError}
          privacyMode={privacyMode}
        />
      </div>
    </div>
  );
}
