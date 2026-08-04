/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TeacherAnnotationRankingItem {
  teacher_name: string;
  negative_count: number;
  positive_count: number;
  informative_count: number;
  total_count: number;
}

export interface StudentAnnotationRankingItem {
  student_id: string;
  student_name: string;
  course_name: string;
  negative_count: number;
}

export interface DetectedAnnotationRow {
  teacher_name?: string | null;
  annotation_type?: string | null;
}

/**
 * Aggregates detected annotations by normalized teacher name (lowercase trim),
 * counting only negative annotations as the primary metric. Used as a fallback
 * when the RPC is unavailable.
 */
export function aggregateTeacherAnnotationRanking(
  annotations: DetectedAnnotationRow[],
  limit = 5,
): TeacherAnnotationRankingItem[] {
  const counts = new Map<string, TeacherAnnotationRankingItem>();

  for (const annotation of annotations) {
    const teacherName = annotation.teacher_name?.trim() || 'Sin profesor';
    const key = teacherName.toLowerCase();
    const existing = counts.get(key) ?? {
      teacher_name: teacherName,
      negative_count: 0,
      positive_count: 0,
      informative_count: 0,
      total_count: 0,
    };

    existing.total_count += 1;
    if (annotation.annotation_type === 'Negativa') existing.negative_count += 1;
    if (annotation.annotation_type === 'Positiva') existing.positive_count += 1;
    if (annotation.annotation_type === 'Información') existing.informative_count += 1;

    counts.set(key, existing);
  }

  return Array.from(counts.values())
    .filter((item) => item.negative_count > 0)
    .sort(
      (a, b) => b.negative_count - a.negative_count || a.teacher_name.localeCompare(b.teacher_name),
    )
    .slice(0, limit);
}

export interface StudentAnnotationCount {
  id: string;
  full_name: string;
  course_name?: string | null;
  annotations_count: number;
}

/**
 * Aggregates student negative annotation counts into a ranking.
 * Used as a fallback when the dedicated RPC is unavailable.
 */
export function aggregateStudentAnnotationRanking(
  students: StudentAnnotationCount[],
  limit = 5,
): StudentAnnotationRankingItem[] {
  return students
    .filter((student) => student.annotations_count > 0)
    .map((student) => ({
      student_id: student.id,
      student_name: student.full_name,
      course_name: student.course_name?.trim() || 'Sin curso',
      negative_count: student.annotations_count,
    }))
    .sort(
      (a, b) => b.negative_count - a.negative_count || a.student_name.localeCompare(b.student_name),
    )
    .slice(0, limit);
}
