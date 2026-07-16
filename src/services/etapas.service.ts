/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import type { EtapaDisciplinaria } from '../types';
import { mapStageRowToEtapa } from '../lib/mappers';

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

export async function saveEtapa(etapa: {
  student_id: string;
  step_number: number;
  stage_name: string;
  responsible: string;
  comment?: string;
}): Promise<boolean> {
  const { error } = await supabase.from('etapas_disciplinarias').insert({
    student_id: etapa.student_id,
    step_number: etapa.step_number,
    stage_name: etapa.stage_name,
    responsible: etapa.responsible,
    comment: etapa.comment || null,
  });

  if (error) {
    console.error('Error saving etapa:', error);
    return false;
  }
  return true;
}
