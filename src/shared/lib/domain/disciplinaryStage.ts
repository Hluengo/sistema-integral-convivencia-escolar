/** @license SPDX-License-Identifier: Apache-2.0 */

export type DisciplinaryStageKey = 'none' | 'amonestacion' | 'compromiso_conductual' | 'derivacion';

export type LetterDocType = 'amonestacion' | 'compromiso_conductual' | 'derivacion';

export type LetterType =
  | 'Amonestación Escrita'
  | 'Carta de Compromiso Conductual'
  | 'Ficha de Derivación';

export interface DisciplinaryStage {
  key: DisciplinaryStageKey;
  label: string;
  min: number;
  max: number | null;
  color: 'neutral' | 'yellow' | 'orange' | 'red';
}

export const DISCIPLINARY_STAGES: DisciplinaryStage[] = [
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

const STAGE_RANK: Record<DisciplinaryStageKey, number> = {
  none: 0,
  amonestacion: 1,
  compromiso_conductual: 2,
  derivacion: 3,
};

export function getDisciplinaryStage(negativeCount: number): DisciplinaryStage {
  const count = Math.max(0, Number(negativeCount) || 0);
  return (
    DISCIPLINARY_STAGES.find((stage) => count >= stage.min && (stage.max === null || count <= stage.max)) ||
    DISCIPLINARY_STAGES[0]
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

export function mapLetterTypeToDocType(letterType: string | null | undefined): LetterDocType | null {
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
  currentLetterType?: string | null
): LetterDocType | null {
  const stage = getDisciplinaryStage(negativeCount);
  if (stage.key === 'none') return null;

  const suggested = stage.key as LetterDocType;
  const currentDocType = mapLetterTypeToDocType(currentLetterType);
  if (!currentDocType) return suggested;
  return STAGE_RANK[suggested] > STAGE_RANK[currentDocType] ? suggested : null;
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