/** @license SPDX-License-Identifier: Apache-2.0 */

import { getPhaseProgress } from '../../data';
import type { Causa, ChecklistItem, FaseProcedimental } from '../../types';
import { getCausaPhase, getCausaStatus } from './causaPresentation';

export const CAUSA_PHASES: FaseProcedimental[] = [
  'Recepción',
  'Investigación',
  'Resolución',
  'Apelación',
  'Seguimiento',
];

interface PhaseProgress {
  phase: FaseProcedimental;
  completed: number;
  total: number;
}

export interface CausaOperationalSummary {
  currentPhase: FaseProcedimental;
  phaseProgress: PhaseProgress[];
  currentPhaseProgress: PhaseProgress;
  nextChecklistItem: ChecklistItem | null;
  completedHitos: number;
  documentsCount: number;
  historyCount: number;
}

function getNextChecklistItem(causa: Causa, currentPhase: FaseProcedimental): ChecklistItem | null {
  if (getCausaStatus(causa) !== 'Activa') return null;

  const phasePrefix: Record<FaseProcedimental, string> = {
    Recepción: 'chk_rec',
    Investigación: 'chk_inv',
    Resolución: 'chk_res',
    Apelación: 'chk_imp',
    Seguimiento: 'chk_seg',
  };

  return (
    causa.checklistDebidoProceso.find(
      (item) => item.id.startsWith(phasePrefix[currentPhase]) && !item.completado,
    ) ?? null
  );
}

export function getCausaOperationalSummary(causa: Causa): CausaOperationalSummary {
  const currentPhase = getCausaPhase(causa);
  const phaseProgress = CAUSA_PHASES.map((phase) => ({
    phase,
    ...getPhaseProgress(causa.checklistDebidoProceso, phase),
  }));
  const currentPhaseProgress = phaseProgress.find((progress) => progress.phase === currentPhase);
  const completedHitos = causa.checklistDebidoProceso.filter((item) => item.completado).length;
  const documentsCount =
    causa.checklistDebidoProceso.filter((item) => item.documentoNombre).length +
    causa.bitacora.filter((entry) => entry.documentoAdjunto).length;

  return {
    currentPhase,
    phaseProgress,
    currentPhaseProgress: currentPhaseProgress ?? {
      phase: currentPhase,
      completed: 0,
      total: 0,
    },
    nextChecklistItem: getNextChecklistItem(causa, currentPhase),
    completedHitos,
    documentsCount,
    historyCount: causa.bitacora.length,
  };
}
