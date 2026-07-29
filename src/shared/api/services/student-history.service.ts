/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';
import {
  studentHistoryEntrySchema,
  type StudentHistoryEntryInput,
} from '../../lib/schemas/studentHistoryEntry';

const HISTORY_ENTRY_COLUMNS = 'id,student_id,title,description,created_by,created_at';

export interface StudentHistoryEntry {
  id: string;
  student_id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
}

export async function fetchStudentHistoryEntries(
  studentId: string,
): Promise<StudentHistoryEntry[]> {
  const parsedStudentId = studentHistoryEntrySchema.shape.studentId.safeParse(studentId);
  if (!parsedStudentId.success) return [];

  const { data, error } = await supabase
    .from('student_history_entries')
    .select(HISTORY_ENTRY_COLUMNS)
    .eq('student_id', parsedStudentId.data)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`No se pudo cargar el historial manual: ${error.message}`);
  }

  return (data || []) as StudentHistoryEntry[];
}

export async function createStudentHistoryEntry(
  input: StudentHistoryEntryInput,
): Promise<StudentHistoryEntry> {
  const parsed = studentHistoryEntrySchema.parse(input);
  const { data, error } = await supabase
    .from('student_history_entries')
    .insert({
      student_id: parsed.studentId,
      title: parsed.title,
      description: parsed.description,
    })
    .select(HISTORY_ENTRY_COLUMNS)
    .single();

  if (error) {
    throw new Error(`No se pudo guardar la entrada en el historial: ${error.message}`);
  }

  return data as StudentHistoryEntry;
}
