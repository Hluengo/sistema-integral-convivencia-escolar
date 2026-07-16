/** @license SPDX-License-Identifier: Apache-2.0 */

import { useQuery } from '@tanstack/react-query';
import { fetchStudentsByCourse } from '../services/courses.service';

export function useStudentsQuery(courseId: string) {
  return useQuery({
    queryKey: ['students', courseId],
    queryFn: () => fetchStudentsByCourse(courseId),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 10,
  });
}
