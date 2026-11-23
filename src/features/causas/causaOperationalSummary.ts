/** @license SPDX-License-Identifier: Apache-2.0 */

import { getPhaseProgress } from "../../shared/lib/data";
import type {
  Causa,
  ChecklistItem,
  FaseProcedimental,
} from "../../shared/lib/types";
import {
  getApplicableChecklistItems,
  getNextInvestigationChecklistItem,
} from "../../shared/lib/domain/investigationChecklist";
import { getCausaPhase, getCausaStatus } from "./causaPresentation";

const CAUSA_PHASES: FaseProcedimental[] = [
  "Recepción",
  "Investigación",
  "Resolución",
  "Apelación",
  "Seguimiento",
];

function isAppealComplete(causa: Causa): boolean {
  // El total aplicable ya distingue la vía: con recurso (imp_2 e imp_4) o sin
  // recurso (imp_6), y ambas terminan con imp_7.
  const appealProgress = getPhaseProgress(causa, "Apelación");
  return (
    appealProgress.total > 0 &&
    appealProgress.completed === appealProgress.total
  );
}

function isPhaseCompleteForAdvance(
  causa: Causa,
  phase: FaseProcedimental,
): boolean {
  if (phase === "Apelación") return isAppealComplete(causa);
  if (phase === "Seguimiento") return false;

  const items = getApplicableChecklistItems(causa, phase);
  return items.length > 0 && items.every((item) => item.completado);
}

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
  totalHitos: number;
  documentsCount: number;
  historyCount: number;
}

function getNextChecklistItem(
  causa: Causa,
  currentPhase: FaseProcedimental,
): { item: ChecklistItem | null; phase: FaseProcedimental | null } {
  // Solo una causa cerrada deja de proponer hitos: en apelación y ejecutoriada
  // todavía hay actuaciones pendientes (recurso, plazo vencido o seguimiento).
  if (getCausaStatus(causa) === "Cerrada") {
    return { item: null, phase: null };
  }

  if (currentPhase === "Investigación") {
    const nextInvestigationItem = getNextInvestigationChecklistItem(causa);
    if (nextInvestigationItem)
      return { item: nextInvestigationItem, phase: currentPhase };
  }

  const currentItem = getApplicableChecklistItems(causa, currentPhase).find(
    (item) => !item.completado,
  );
  if (currentItem) return { item: currentItem, phase: currentPhase };

  const currentIndex = CAUSA_PHASES.indexOf(currentPhase);
  for (const phase of CAUSA_PHASES.slice(currentIndex + 1)) {
    const nextItem = getApplicableChecklistItems(causa, phase).find(
      (item) => !item.completado,
    );
    if (nextItem) return { item: nextItem, phase };
  }

  return { item: null, phase: null };
}

export function getCausaOperationalPhase(causa: Causa): FaseProcedimental {
  const persistedPhase = getCausaPhase(causa);
  const persistedIndex = CAUSA_PHASES.indexOf(persistedPhase);
  const latestActivityIndex = CAUSA_PHASES.reduce((latest, phase, index) => {
    const progress = getPhaseProgress(causa, phase);
    return progress.completed > 0 ? index : latest;
  }, -1);
  let phaseIndex = Math.max(persistedIndex, latestActivityIndex);
  // ponytail: informe de cierre subido (chk_res_2 con evidencia) ya es Resolución aunque el estado aún diga Recepción
  const closeItem = causa.checklistDebidoProceso.find(
    (item) => item.id === "chk_res_2",
  );
  const hasClosureEvidence = Boolean(
    closeItem &&
    (closeItem.completado ||
      closeItem.fechaCompletado ||
      closeItem.documentoNombre ||
      closeItem.documentoUrl),
  );
  if (hasClosureEvidence && phaseIndex < CAUSA_PHASES.indexOf("Resolución")) {
    phaseIndex = CAUSA_PHASES.indexOf("Resolución");
  }

  while (
    phaseIndex < CAUSA_PHASES.length - 1 &&
    isPhaseCompleteForAdvance(causa, CAUSA_PHASES[phaseIndex])
  ) {
    phaseIndex += 1;
  }

  return CAUSA_PHASES[phaseIndex] ?? persistedPhase;
}

export function getCausaOperationalSummary(
  causa: Causa,
): CausaOperationalSummary {
  const currentPhase = getCausaOperationalPhase(causa);
  const phaseProgress = CAUSA_PHASES.map((phase) => ({
    phase,
    ...getPhaseProgress(causa, phase),
  }));
  const currentPhaseProgress = phaseProgress.find(
    (progress) => progress.phase === currentPhase,
  );
  const currentIndex = CAUSA_PHASES.indexOf(currentPhase);
  const nextChecklist = getNextChecklistItem(causa, currentPhase);
  const laterActivityPhase =
    phaseProgress
      .slice(currentIndex + 1)
      .find((progress) => progress.completed > 0)?.phase ?? null;
  const completedHitos = phaseProgress.reduce(
    (count, progress) => count + progress.completed,
    0,
  );
  const totalHitos = phaseProgress.reduce(
    (count, progress) => count + progress.total,
    0,
  );
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
    totalHitos,
    documentsCount,
    historyCount: causa.bitacora.length,
  };
}
