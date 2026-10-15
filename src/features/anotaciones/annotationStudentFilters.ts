/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getEffectiveDisciplinaryStage,
  type LetterType,
} from "../../shared/lib/domain/disciplinaryStage";

interface AnnotationFilterStudent {
  annotations_count: number;
  effective_letter_type?: LetterType | null;
}

interface CourseFilterStudent {
  course_id?: string | null;
}

interface CartaStatusFilterStudent {
  cartaStatuses?: string[] | null;
}

export const WITHOUT_COURSE_FILTER = "__without_course__";

function courseOrder(label: string): number {
  const normalized = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const match = normalized.match(/^(\d+)\s*°?\s*(basico|medio)\s*([ab])?$/);
  if (!match) return normalized === "sin curso asignado" ? 10000 : 9000;
  const grade = Number(match[1]);
  const cycleOffset = match[2] === "medio" ? 16 : 0;
  return cycleOffset + (grade - 1) * 2 + (match[3] === "b" ? 1 : 0);
}

export function compareCourseLabels(left: string, right: string): number {
  const orderDifference = courseOrder(left) - courseOrder(right);
  return (
    orderDifference ||
    left.localeCompare(right, "es-CL", { sensitivity: "base" })
  );
}

export function getAnnotationRange(filter: string): [number, number] | null {
  switch (filter) {
    case "con_registro":
      return [1, Number.POSITIVE_INFINITY];
    case "sin_carta":
      return [1, 4];
    case "amonestacion":
      return [5, 9];
    case "compromiso":
      return [10, 14];
    case "derivacion":
      return [15, Number.POSITIVE_INFINITY];
    default:
      return null;
  }
}

export function matchesAnnotationFilter(
  student: AnnotationFilterStudent,
  filter: string,
): boolean {
  const negativeCount = Math.max(0, Number(student.annotations_count) || 0);
  const stage = getEffectiveDisciplinaryStage(
    negativeCount,
    student.effective_letter_type,
  );

  if (filter === "con_registro") {
    return negativeCount >= 1 || Boolean(student.effective_letter_type);
  }
  if (filter === "sin_carta") {
    return negativeCount >= 1 && negativeCount <= 4 && stage.key === "none";
  }
  if (filter === "amonestacion") return stage.key === "amonestacion";
  if (filter === "compromiso") return stage.key === "compromiso_conductual";
  if (filter === "derivacion") return stage.key === "derivacion";
  return true;
}

export function matchesCourseFilter(
  student: CourseFilterStudent,
  selectedCourseId: string,
): boolean {
  if (!selectedCourseId) return true;
  if (selectedCourseId === WITHOUT_COURSE_FILTER) return !student.course_id;
  return student.course_id === selectedCourseId;
}

export function matchesCartaStatusFilter(
  student: CartaStatusFilterStudent,
  selectedStatus: string,
): boolean {
  if (!selectedStatus) return true;
  return student.cartaStatuses?.includes(selectedStatus) ?? false;
}
