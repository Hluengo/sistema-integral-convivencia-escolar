/** @license SPDX-License-Identifier: Apache-2.0 */

import { getYearFromDateOnly } from '@/shared/lib/dateUtils';

type DisciplinaryStageKey = 'none' | 'amonestacion' | 'compromiso_conductual' | 'derivacion';

export type LetterDocType = 'amonestacion' | 'compromiso_conductual' | 'derivacion';

export type CartaProcessingBlockReason =
  'derivacion_requires_15_registered' | 'letter_type_mismatch';

export type LetterType =
  'Amonestación Escrita' | 'Carta de Compromiso Conductual' | 'Ficha de Derivación';

export interface DisciplinaryStage {
  key: DisciplinaryStageKey;
  label: string;
  min: number;
  max: number | null;
  color: 'neutral' | 'yellow' | 'orange' | 'red';
}

export interface CartaTableCandidate {
  letter_type: string;
  emission_date: string;
  created_at?: string;
  origin?: string;
  school_year?: number;
  status: string;
  workflow_status?: 'pending' | 'completed' | 'archived' | 'annulled';
  registered_at?: string | null;
  printed_at?: string | null;
  processed_manually_at?: string | null;
  archived_at?: string | null;
}

export interface StudentCartaTableState {
  completedLetterType: LetterType | null;
  currentLetterType: LetterType | null;
  workflowStatus: 'pending' | 'completed' | 'archived' | 'none';
}

const DISCIPLINARY_STAGES: readonly DisciplinaryStage[] = [
  { key: 'none', label: 'Sin medida activa', min: 0, max: 4, color: 'neutral' },
  { key: 'amonestacion', label: 'Amonestación Escrita', min: 5, max: 9, color: 'yellow' },
  {
    key: 'compromiso_conductual',
    label: 'Carta de Compromiso Conductual',
    min: 10,
    max: 14,
    color: 'orange',
  },
  {
    key: 'derivacion',
    label: 'Derivación a Convivencia Escolar',
    min: 15,
    max: null,
    color: 'red',
  },
];

const STAGE_RANK: Readonly<Record<DisciplinaryStageKey, number>> = {
  none: 0,
  amonestacion: 1,
  compromiso_conductual: 2,
  derivacion: 3,
};

export function getDisciplinaryStage(negativeCount: number): DisciplinaryStage {
  const count = Math.max(0, Number(negativeCount) || 0);
  return (
    DISCIPLINARY_STAGES.find(
      (stage) => count >= stage.min && (stage.max === null || count <= stage.max),
    ) || DISCIPLINARY_STAGES[0]
  );
}

export function mapDocTypeToLetterType(docType: string | null | undefined): LetterType | null {
  if (!docType || docType === 'none') return null;
  if (docType === 'amonestacion') return 'Amonestación Escrita';
  if (docType === 'compromiso' || docType === 'compromiso_conductual') {
    return 'Carta de Compromiso Conductual';
  }
  if (docType === 'derivacion') return 'Ficha de Derivación';
  return null;
}

export function mapLetterTypeToDocType(
  letterType: string | null | undefined,
): LetterDocType | null {
  if (!letterType) return null;
  if (letterType === 'Amonestación Escrita') return 'amonestacion';
  if (letterType === 'Carta de Compromiso Conductual') return 'compromiso_conductual';
  if (letterType === 'Ficha de Derivación' || letterType === 'Derivación a Convivencia Escolar') {
    return 'derivacion';
  }
  return null;
}

export function getSuggestedLetterType(
  negativeCount: number,
  currentLetterType?: string | null,
): LetterDocType | null {
  const stage = getDisciplinaryStage(negativeCount);
  if (stage.key === 'none') return null;

  const suggested = stage.key as LetterDocType;
  const currentDocType = mapLetterTypeToDocType(currentLetterType);
  if (!currentDocType) return suggested;
  return STAGE_RANK[suggested] > STAGE_RANK[currentDocType] ? suggested : null;
}

export function getNextLetterAfterPhysicalCarta(
  physicalLetterType: string | null | undefined,
): LetterDocType | null {
  if (physicalLetterType === 'Amonestación Escrita') return 'compromiso_conductual';
  if (physicalLetterType === 'Carta de Compromiso Conductual') return 'derivacion';
  return null;
}

export function getPhysicalCartaBaselineType(
  cartas: Array<{
    origin?: string;
    school_year?: number;
    emission_date: string;
    status: string;
    letter_type: string;
  }>,
  schoolYear: number,
): LetterType | null {
  const currentYearPhysicalTypes = new Set(
    cartas
      .filter((carta) => {
        const cartaYear = carta.school_year ?? getYearFromDateOnly(carta.emission_date);
        return (
          carta.origin === 'physical' && carta.status !== 'Anulada' && cartaYear === schoolYear
        );
      })
      .map((carta) => carta.letter_type),
  );

  if (currentYearPhysicalTypes.has('Carta de Compromiso Conductual')) {
    return 'Carta de Compromiso Conductual';
  }
  if (currentYearPhysicalTypes.has('Amonestación Escrita')) {
    return 'Amonestación Escrita';
  }
  return null;
}

export function getHighestPriorityLetterType(
  ...types: Array<LetterDocType | null | undefined>
): LetterDocType | null {
  return types.reduce<LetterDocType | null>((highest, candidate) => {
    if (!candidate) return highest;
    if (!highest || STAGE_RANK[candidate] > STAGE_RANK[highest]) return candidate;
    return highest;
  }, null);
}

export function getOutstandingLetterType(
  completedLetterType: string | null | undefined,
  ...candidates: Array<LetterDocType | null | undefined>
): LetterDocType | null {
  const candidate = getHighestPriorityLetterType(...candidates);
  if (!candidate) return null;

  const completedDocType = mapLetterTypeToDocType(completedLetterType);
  if (completedDocType && STAGE_RANK[completedDocType] >= STAGE_RANK[candidate]) {
    return null;
  }
  return candidate;
}

function getCartaYear(carta: CartaTableCandidate): number {
  return carta.school_year ?? getYearFromDateOnly(carta.emission_date);
}

function isCompletedCarta(carta: CartaTableCandidate): boolean {
  return (
    carta.origin === 'physical' ||
    carta.workflow_status === 'archived' ||
    carta.workflow_status === 'completed' ||
    Boolean(
      carta.registered_at || carta.printed_at || carta.processed_manually_at || carta.archived_at,
    )
  );
}

function getCartaTimestamp(carta: CartaTableCandidate): number {
  const value = carta.created_at || carta.emission_date;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortCartaCandidates(left: CartaTableCandidate, right: CartaTableCandidate): number {
  const leftType = mapLetterTypeToDocType(left.letter_type);
  const rightType = mapLetterTypeToDocType(right.letter_type);
  const rankDifference = STAGE_RANK[rightType ?? 'none'] - STAGE_RANK[leftType ?? 'none'];
  if (rankDifference !== 0) return rankDifference;

  const completionDifference = Number(isCompletedCarta(right)) - Number(isCompletedCarta(left));
  if (completionDifference !== 0) return completionDifference;
  return getCartaTimestamp(right) - getCartaTimestamp(left);
}

export function resolveStudentCartaTableState(
  cartas: CartaTableCandidate[],
  schoolYear: number,
): StudentCartaTableState {
  const currentYearCartas = cartas
    .filter(
      (carta) =>
        carta.status !== 'Anulada' &&
        carta.workflow_status !== 'annulled' &&
        getCartaYear(carta) === schoolYear &&
        mapLetterTypeToDocType(carta.letter_type),
    )
    .sort(sortCartaCandidates);
  const currentCarta = currentYearCartas[0];
  const completedCarta = currentYearCartas.find(isCompletedCarta);

  return {
    completedLetterType: completedCarta
      ? mapDocTypeToLetterType(mapLetterTypeToDocType(completedCarta.letter_type))
      : null,
    currentLetterType: currentCarta
      ? mapDocTypeToLetterType(mapLetterTypeToDocType(currentCarta.letter_type))
      : null,
    workflowStatus: currentCarta
      ? currentCarta.workflow_status === 'archived' || currentCarta.archived_at
        ? 'archived'
        : isCompletedCarta(currentCarta)
          ? 'completed'
          : 'pending'
      : 'none',
  };
}

export function getEffectiveDisciplinaryStage(
  negativeCount: number,
  completedLetterType?: string | null,
): DisciplinaryStage {
  const countStage = getDisciplinaryStage(negativeCount);
  const completedStage = mapLetterTypeToDocType(completedLetterType);
  if (!completedStage || STAGE_RANK[completedStage] <= STAGE_RANK[countStage.key]) {
    return countStage;
  }
  return DISCIPLINARY_STAGES.find((stage) => stage.key === completedStage) ?? countStage;
}

export function getStudentCartaWorkflowLabel(
  negativeCount: number,
  state: StudentCartaTableState | null | undefined,
): 'Archivada' | 'Procesada' | 'Pendiente' | null {
  if (!state) return null;

  const effectiveStage = getEffectiveDisciplinaryStage(negativeCount, state.completedLetterType);
  const completedStage = mapLetterTypeToDocType(state.completedLetterType);
  if (
    state.workflowStatus === 'archived' &&
    completedStage &&
    completedStage === effectiveStage.key
  ) {
    return 'Archivada';
  }
  if (completedStage && completedStage === effectiveStage.key) return 'Procesada';
  if (state.workflowStatus === 'pending') return 'Pendiente';
  if (state.workflowStatus === 'archived') return 'Archivada';
  if (state.workflowStatus === 'completed') return 'Procesada';
  return null;
}

export function getCartaProcessingBlockReason(
  selectedDocType: LetterDocType,
  expectedDocType: LetterDocType | null,
  registeredNegativeCount: number,
): CartaProcessingBlockReason | null {
  const count = Math.max(0, Number(registeredNegativeCount) || 0);
  if (selectedDocType === 'derivacion' && count < 15) {
    return 'derivacion_requires_15_registered';
  }
  if (expectedDocType && selectedDocType !== expectedDocType) {
    return 'letter_type_mismatch';
  }
  return null;
}

export function getNextThreshold(negativeCount: number): number | null {
  const count = Math.max(0, Number(negativeCount) || 0);
  if (count < 5) return 5;
  if (count < 10) return 10;
  if (count < 15) return 15;
  return null;
}

export function getStageProgress(negativeCount: number): {
  current: number;
  nextThreshold: number | null;
  previousThreshold: number;
  percent: number;
  remaining: number;
} {
  const count = Math.max(0, Number(negativeCount) || 0);
  const nextThreshold = getNextThreshold(count);
  const previousThreshold = count < 5 ? 0 : count < 10 ? 5 : count < 15 ? 10 : 15;
  if (nextThreshold === null) {
    return { current: count, nextThreshold, previousThreshold, percent: 100, remaining: 0 };
  }
  const span = Math.max(1, nextThreshold - previousThreshold);
  const percent = Math.min(100, Math.max(0, ((count - previousThreshold) / span) * 100));
  return {
    current: count,
    nextThreshold,
    previousThreshold,
    percent,
    remaining: Math.max(0, nextThreshold - count),
  };
}
