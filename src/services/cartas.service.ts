/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import type { CartaDisciplinaria } from '../types';
import { mapCauseRowToCarta } from '../lib/mappers';

export async function fetchCartas(studentId: string): Promise<CartaDisciplinaria[]> {
  const { data, error } = await supabase
    .from('cartas_disciplinarias')
    .select('*')
    .eq('student_id', studentId)
    .order('emission_date', { ascending: false });

  if (error) {
    console.error('Error fetching cartas:', error);
    return [];
  }
  return (data || []).map(mapCauseRowToCarta);
}

export async function saveCarta(carta: {
  student_id: string;
  letter_type: string;
  emitted_by: string;
  supervisor_name?: string;
  apoderado_name: string;
  annotations_count: number;
  student_name: string;
  course: string;
  regulation_basis: string;
  observations?: string;
}): Promise<string | false> {
  const id = crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { error } = await supabase.from('cartas_disciplinarias').insert({
    id,
    student_id: carta.student_id,
    letter_type: carta.letter_type,
    emitted_by: carta.emitted_by,
    supervisor_name: carta.supervisor_name || null,
    apoderado_name: carta.apoderado_name,
    annotations_count: carta.annotations_count,
    student_name: carta.student_name,
    course: carta.course,
    regulation_basis: carta.regulation_basis,
    observations: carta.observations || null,
  });

  if (error) {
    console.error('Error saving carta:', error);
    return false;
  }
  return id;
}
