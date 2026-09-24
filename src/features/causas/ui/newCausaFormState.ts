/** @license SPDX-License-Identifier: Apache-2.0 */

export type StudentSelectState =
  "no-course" | "loading" | "has-students" | "no-students";

export function getStudentState(
  selectedCourseId: string,
  isLoadingStudents: boolean,
  studentCount: number,
): StudentSelectState {
  if (!selectedCourseId) return "no-course";
  if (isLoadingStudents) return "loading";
  if (studentCount > 0) return "has-students";
  return "no-students";
}
