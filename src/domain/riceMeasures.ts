/** @license SPDX-License-Identifier: Apache-2.0 */

export interface RiceMeasure {
  id: string;
  etapa: 'amonestacion' | 'compromiso' | 'derivacion';
  medida: string;
  descripcion: string;
  baseLegal: string;
  plazo: string;
}

export const RICE_MEASURES: RiceMeasure[] = [
  {
    id: 'amonestacion-1',
    etapa: 'amonestacion',
    medida: 'Carta de Amonestación',
    descripcion: 'Notificación escrita al apoderado sobre conductas reiteradas del estudiante.',
    baseLegal: 'Art. 24.BIS',
    plazo: '5 días hábiles',
  },
  {
    id: 'compromiso-1',
    etapa: 'compromiso',
    medida: 'Carta de Compromiso',
    descripcion: 'Compromiso formal del apoderado y estudiante para mejorar conducta.',
    baseLegal: 'Art. 24.BIS',
    plazo: '10 días hábiles',
  },
  {
    id: 'derivacion-1',
    etapa: 'derivacion',
    medida: 'Derivación a Consejo Escolar',
    descripcion: 'Remisión del caso al Consejo de Evaluación para medidas especiales.',
    baseLegal: 'Art. 24.BIS, Ley 20.845',
    plazo: '15 días hábiles',
  },
] as const;

export function getRiceMeasureByCount(negativeCount: number): RiceMeasure | undefined {
  if (negativeCount >= 15) return RICE_MEASURES[2];
  if (negativeCount >= 10) return RICE_MEASURES[1];
  if (negativeCount >= 5) return RICE_MEASURES[0];
  return undefined;
}
