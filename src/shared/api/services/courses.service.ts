/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';

/** Types matching the Supabase tables */
export interface Course {
  id: string;
  name: string;
  position: number;
  level: 'BASICA' | 'MEDIA';
  created_at: string;
}

export interface Student {
  id: string;
  full_name: string;
  course_id: string;
  rut: string;
  created_at: string;
}

export interface StudentWithCourse extends Student {
  course_name: string;
  course_level: Course['level'] | null;
}

/**
 * Fetch all courses ordered by position
 */
export async function fetchCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('position', { ascending: true });

  if (error) {
    console.error('Error fetching courses:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch students for a specific course, ordered by full_name
 */
export async function fetchStudentsByCourse(courseId: string): Promise<Student[]> {
  if (!courseId) {
    return [];
  }

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('course_id', courseId)
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Error fetching students:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch all students with their course name (join)
 */
export async function fetchStudentsWithCourses(): Promise<StudentWithCourse[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*, courses(name, level)')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Error fetching students with courses:', error);
    return [];
  }

  return (data || []).map((row: Record<string, unknown>) => {
    const courses = row.courses as { name: string; level: Course['level'] } | null;
    return {
      id: row.id as string,
      full_name: row.full_name as string,
      course_id: row.course_id as string,
      rut: row.rut as string,
      created_at: row.created_at as string,
      course_name: courses?.name ?? 'Sin curso',
      course_level: courses?.level ?? null,
    };
  });
}
