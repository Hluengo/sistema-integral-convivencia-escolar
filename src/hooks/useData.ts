/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { type Course, type Student, fetchCourses as fetchCoursesApi, fetchStudentsByCourse } from '../lib/supabase';

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const data = await fetchCoursesApi();
      if (!cancelled) {
        setCourses(data);
        setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { courses, isLoading };
}

export function useStudents(courseId: string) {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!courseId) {
      setStudents([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    async function load() {
      const data = await fetchStudentsByCourse(courseId);
      if (!cancelled) {
        setStudents(data);
        setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [courseId]);

  return { students, isLoading };
}
