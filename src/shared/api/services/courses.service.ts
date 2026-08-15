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

export interface StudentsWithCoursesPage {
  students: StudentWithCourse[];
  totalCount: number;
}

/**
 * Fetch all courses ordered by position
 */
export async function fetchCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('id,name,position,level,created_at')
    .order('position', { ascending: true });

  if (error) {
    console.error('Error fetching courses:', error);
    return [];
  }

  return (data || []).map((row) => ({
    ...row,
    position: row.position ?? 0,
    level: row.level === 'MEDIA' ? 'MEDIA' : 'BASICA',
    created_at: row.created_at ?? '',
  }));
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
    .select('id,full_name,course_id,rut,created_at')
    .eq('course_id', courseId)
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Error fetching students:', error);
    return [];
  }

  return (data || []).map((row) => ({
    ...row,
    course_id: row.course_id ?? '',
    rut: row.rut ?? '',
    created_at: row.created_at ?? '',
  }));
}

/**
 * Fetch all students with their course name (join)
 */
export async function fetchStudentsWithCourses(): Promise<StudentWithCourse[]> {
  const { data, error } = await supabase
    .from('students')
    .select('id,full_name,course_id,rut,created_at,courses(name, level)')
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

export async function fetchStudentsWithCoursesPage(
  offset = 0,
  limit = 200,
): Promise<StudentsWithCoursesPage> {
  const { data, count, error } = await supabase
    .from('students')
    .select('id,full_name,course_id,rut,created_at,courses(name, level)', { count: 'exact' })
    .order('full_name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching paginated students with courses:', error);
    throw error;
  }

  const students = (data || []).map((row: Record<string, unknown>) => {
    const courses = row.courses as { name: string; level: Course['level'] } | null;
    return {
      id: row.id as string,
      full_name: row.full_name as string,
      course_id: (row.course_id as string | null) ?? '',
      rut: (row.rut as string | null) ?? '',
      created_at: (row.created_at as string | null) ?? '',
      course_name: courses?.name ?? 'Sin curso',
      course_level: courses?.level ?? null,
    };
  });

  return { students, totalCount: count ?? students.length };
}
