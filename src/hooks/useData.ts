/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { type Course, type Student, fetchCourses as fetchCoursesApi, fetchStudentsByCourse } from '../lib/supabase';

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const load = useCallback(async (retryCount = 0) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCoursesApi();
      if (isMountedRef.current) {
        setCourses(data);
        setIsLoading(false);
      }
    } catch (_err) {
      if (!isMountedRef.current) { return; }
      if (retryCount < 2) {
        setTimeout(() => load(retryCount + 1), 1000 * (retryCount + 1));
      } else {
        setError('Error al cargar los cursos. Verifique su conexión.');
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { courses, isLoading, error, retry: () => load() };
}

export function useStudents(courseId: string) {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const load = useCallback(async (retryCount = 0) => {
    if (!courseId) {
      setStudents([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchStudentsByCourse(courseId);
      if (isMountedRef.current) {
        setStudents(data);
        setIsLoading(false);
      }
    } catch (_err) {
      if (!isMountedRef.current) { return; }
      if (retryCount < 2) {
        setTimeout(() => load(retryCount + 1), 1000 * (retryCount + 1));
      } else {
        setError('Error al cargar los estudiantes. Verifique su conexión.');
        setIsLoading(false);
      }
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  return { students, isLoading, error, retry: () => load() };
}
