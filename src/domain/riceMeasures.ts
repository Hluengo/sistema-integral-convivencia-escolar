/** @license SPDX-License-Identifier: Apache-2.0 */

export type RiceMeasureClassification = {
  measure: string;
  description: string;
  basis: string;
  canRegister: boolean;
  color: string;
  bgColor: string;
  borderColor: string;
  stageName: string;
  stepNumber: number;
};

/**
 * Clasifica la medida disciplinaria según acumulación de anotaciones negativas (RICE Art. 24.BIS).
 */
export function classifyByNegativeCount(count: number): RiceMeasureClassification {
  if (count <= 4) {
    return {
      measure: 'Medidas Formativas de Aula',
      description:
        'El estudiante posee un nivel de conducta dentro del margen ordinario (0-4 anotaciones). Corresponden medidas formativas y diálogos individuales preventivos dirigidos por el docente de asignatura o inspectoría.',
      basis:
        'Artículo 24 del Reglamento Interno de Convivencia Escolar (RICE) - Medidas formativas para faltas leves.',
      canRegister: false,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50/60',
      borderColor: 'border-emerald-200',
      stageName: 'Sin proceso formal',
      stepNumber: 1,
    };
  }

  if (count <= 9) {
    return {
      measure: 'Amonestación Escrita Formal',
      description:
        '1ra acumulación (5-9 anotaciones negativas). Corresponde citación al apoderado y formalización de amonestación escrita dirigida por el Profesor Jefe / Inspectoría.',
      basis: 'Artículo 24. BIS del RICE 2026 (1ra Acumulación - 5-9 anotaciones)',
      canRegister: true,
      color: 'text-amber-700',
      bgColor: 'bg-amber-50/60',
      borderColor: 'border-amber-200',
      stageName: 'Carta de Amonestación',
      stepNumber: 2,
    };
  }

  if (count <= 14) {
    return {
      measure: 'Carta de Compromiso Conductual',
      description:
        '2da acumulación (10-14 anotaciones negativas). Aplica citación del apoderado por Inspectoría para firmar Compromiso Conductual con seguimiento quincenal.',
      basis: 'Artículo 24. BIS del RICE 2026 (2da Acumulación - 10-14 anotaciones)',
      canRegister: true,
      color: 'text-orange-700',
      bgColor: 'bg-orange-50/60',
      borderColor: 'border-orange-200',
      stageName: 'Carta de Compromiso Conductual',
      stepNumber: 3,
    };
  }

  return {
    measure: 'Evaluación por Equipo de Convivencia',
    description:
      '3ra acumulación (15+ anotaciones negativas). Escala a falta grave según Art. 24. BIS. Corresponde derivación urgente al Equipo de Convivencia y Coordinación de Ciclo.',
    basis: 'Artículo 24. BIS del RICE 2026 (3ra Acumulación - 15+ anotaciones)',
    canRegister: true,
    color: 'text-rose-700',
    bgColor: 'bg-rose-50/60',
    borderColor: 'border-rose-200',
    stageName: 'Derivación a Convivencia Escolar',
    stepNumber: 4,
  };
}
