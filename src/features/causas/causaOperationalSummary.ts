/** @license SPDX-License-Identifier: Apache-2.0 */

import { getPhaseProgress } from '../../shared/lib/data';
import type { Causa, ChecklistItem, FaseProcedimental } from '../../shared/lib/types';
import {
  getApplicableChecklistItems,
  getNextInvestigationChecklistItem,
} from '../../shared/lib/domain/investigationChecklist';
import { getCausaPhase, getCausaStatus } from './causaPresentation';

const CAUSA_PHASES: FaseProcedimental[] = [
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

  if (currentPhase === 'Investigación') {
    const nextInvestigationItem = getNextInvestigationChecklistItem(causa);
    if (nextInvestigationItem) return nextInvestigationItem;

    const nextPhase = CAUSA_PHASES[CAUSA_PHASES.indexOf(currentPhase) + 1];
    if (!nextPhase) return null;
    return getApplicableChecklistItems(causa, nextPhase).find((item) => !item.completado) ?? null;
  }

  return getApplicableChecklistItems(causa, currentPhase).find((item) => !item.completado) ?? null;
}

export function getCausaOperationalSummary(causa: Causa): CausaOperationalSummary {
  const currentPhase = getCausaPhase(causa);
  const phaseProgress = CAUSA_PHASES.map((phase) => ({
    phase,
    ...getPhaseProgress(causa, phase),
  }));
  const currentPhaseProgress = phaseProgress.find((progress) => progress.phase === currentPhase);
  const completedHitos = phaseProgress.reduce((count, progress) => count + progress.completed, 0);
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
