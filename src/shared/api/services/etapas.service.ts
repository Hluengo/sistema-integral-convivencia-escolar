/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import type { EtapaDisciplinaria } from '../../../types';
import { mapStageRowToEtapa } from '../../../lib/mappers';

export async function fetchEtapas(studentId: string): Promise<EtapaDisciplinaria[]> {
  const { data, error } = await supabase
    .from('etapas_disciplinarias')
    .select('*')
    .eq('student_id', studentId)
    .order('step_number', { ascending: true });

  if (error) {
    console.error('Error fetching etapas:', error);
    return [];
  }
  return (data || []).map(mapStageRowToEtapa);
}


