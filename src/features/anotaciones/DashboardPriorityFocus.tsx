/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import CourseCartaRanking from "./CourseCartaRanking";
import type { CourseCartaRankingItem } from "../../shared/lib/domain/courseCartaRanking";
import TeacherAnnotationRanking from "./TeacherAnnotationRanking";
import type { TeacherAnnotationRankingItem } from "../../shared/lib/domain/annotationRankings";
import StudentAnnotationRanking from "./StudentAnnotationRanking";
import type { StudentAnnotationRankingItem } from "../../shared/lib/domain/annotationRankings";

export default function DashboardPriorityFocus({
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
}: {
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
}) {
  const [priorityOpen, setPriorityOpen] = useState(true);

  return (
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
  );
}
