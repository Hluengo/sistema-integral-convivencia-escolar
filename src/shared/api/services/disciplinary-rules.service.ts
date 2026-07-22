/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';

export interface DisciplinaryRule {
  id: string;
  rule_type: string;
  rule_name: string;
  description: string | null;
  min_negativas: number | null;
  max_negativas: number | null;
  min_positivas: number | null;
  max_positivas: number | null;
  min_informativas: number | null;
  max_informativas: number | null;
  suggested_letter_type: string;
  priority: number;
  is_active: boolean;
}

export async function fetchDisciplinaryRules(): Promise<DisciplinaryRule[]> {
  const tenantId = useAuthStore.getState().tenantId;
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('disciplinary_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (error) {
    console.error('Error fetching disciplinary rules:', error);
    return [];
  }

  return data || [];
}
