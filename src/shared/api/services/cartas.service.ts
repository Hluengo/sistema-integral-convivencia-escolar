/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import type { CartaDisciplinaria } from '../../../types';
import { mapCauseRowToCarta } from '../../../lib/mappers';

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


