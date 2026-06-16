/**
 * Supabase client configuration
 * Connects to the existing Supabase project with courses and students tables.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
    'Créalas en el archivo .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

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
  if (!courseId) return [];

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
 * Search students by name (across all courses)
 */
export async function searchStudents(query: string): Promise<Student[]> {
  if (!query.trim()) return [];

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .ilike('full_name', `%${query}%`)
    .order('full_name', { ascending: true })
    .limit(20);

  if (error) {
    console.error('Error searching students:', error);
    return [];
  }

  return data || [];
}