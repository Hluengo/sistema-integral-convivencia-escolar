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
  nextChecklistPhase: FaseProcedimental | null;
  laterActivityPhase: FaseProcedimental | null;
  completedHitos: number;
  documentsCount: number;
  historyCount: number;
}

function getNextChecklistItem(
  causa: Causa,
  currentPhase: FaseProcedimental,
): { item: ChecklistItem | null; phase: FaseProcedimental | null } {
  if (getCausaStatus(causa) !== 'Activa') return { item: null, phase: null };

  if (currentPhase === 'Investigación') {
    const nextInvestigationItem = getNextInvestigationChecklistItem(causa);
    if (nextInvestigationItem) return { item: nextInvestigationItem, phase: currentPhase };
  }

  const currentItem = getApplicableChecklistItems(causa, currentPhase).find(
    (item) => !item.completado,
  );
  if (currentItem) return { item: currentItem, phase: currentPhase };

  const currentIndex = CAUSA_PHASES.indexOf(currentPhase);
  for (const phase of CAUSA_PHASES.slice(currentIndex + 1)) {
    const nextItem = getApplicableChecklistItems(causa, phase).find((item) => !item.completado);
    if (nextItem) return { item: nextItem, phase };
  }

  return { item: null, phase: null };
}

export function getCausaOperationalSummary(causa: Causa): CausaOperationalSummary {
  const currentPhase = getCausaPhase(causa);
  const phaseProgress = CAUSA_PHASES.map((phase) => ({
    phase,
    ...getPhaseProgress(causa, phase),
  }));
  const currentPhaseProgress = phaseProgress.find((progress) => progress.phase === currentPhase);
  const currentIndex = CAUSA_PHASES.indexOf(currentPhase);
  const nextChecklist = getNextChecklistItem(causa, currentPhase);
  const laterActivityPhase =
    phaseProgress.slice(currentIndex + 1).find((progress) => progress.completed > 0)?.phase ?? null;
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
    nextChecklistItem: nextChecklist.item,
    nextChecklistPhase: nextChecklist.phase,
    laterActivityPhase,
    completedHitos,
    documentsCount,
    historyCount: causa.bitacora.length,
  };
}
