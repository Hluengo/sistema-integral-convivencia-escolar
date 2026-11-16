/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AnnotationStageCounts } from "../../shared/lib/domain/annotationStageCounts";
import type { CourseCartaRankingItem } from "../../shared/lib/domain/courseCartaRanking";
import type { TeacherAnnotationRankingItem } from "../../shared/lib/domain/annotationRankings";
import type { StudentAnnotationRankingItem } from "../../shared/lib/domain/annotationRankings";
import DashboardPriorityFocus from "./DashboardPriorityFocus";
import DashboardStageOverview from "./DashboardStageOverview";

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
  return (
    <div className="space-y-6">
      {showStage ? <DashboardStageOverview counts={counts} /> : null}

      <DashboardPriorityFocus
        courseCartaRanking={courseCartaRanking}
        courseCartaRankingLoading={courseCartaRankingLoading}
        courseCartaRankingError={courseCartaRankingError}
        teacherAnnotationRanking={teacherAnnotationRanking}
        teacherAnnotationRankingLoading={teacherAnnotationRankingLoading}
        teacherAnnotationRankingError={teacherAnnotationRankingError}
        studentAnnotationRanking={studentAnnotationRanking}
        studentAnnotationRankingLoading={studentAnnotationRankingLoading}
        studentAnnotationRankingError={studentAnnotationRankingError}
        privacyMode={privacyMode}
      />
    </div>
  );
}
