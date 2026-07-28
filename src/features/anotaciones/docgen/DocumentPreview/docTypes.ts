/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Annotation } from '../../../../types';

export type DocType = 'amonestacion' | 'compromiso_conductual' | 'derivacion';

export interface LetterContent {
  motivo: string;
  descripcion: string;
  medida: string;
  acuerdos: string;
  cierre: string;
  observaciones: string;
}

export interface DocContentProps {
  currentName: string;
  currentRut: string;
  currentCourse: string;
  currentTeacher: string;
  coordinatorName: string;
  inspectorName: string;
  apoderadoName: string;
  dateStr: string;
  negativeCount: number;
  selectedAnnsObjects: Annotation[];
  letterContent: LetterContent;
}

export const TITLE_MAP: Record<DocType, string> = {
  amonestacion: 'Amonestación Escrita',
  compromiso_conductual: 'Compromiso Conductual',
  derivacion: 'Derivación a Convivencia Escolar',
};

export const DEFAULT_COMMITMENTS = [
  'Definición de objetivos de mejora claros y medibles; realización de un seguimiento quincenal por inspectoría o semanal por el profesor jefe; y evaluación del cumplimiento al finalizar el periodo. Se notifica explícitamente que el incumplimiento de estos acuerdos escalará la situación a una falta muy grave.',
];

export const DEFAULT_LETTER_CONTENT: Record<DocType, LetterContent> = {
  amonestacion: {
    motivo:
      'Activación de la Medida 3 debido a la primera acumulación crítica de 5 o más anotaciones leves en la hoja de vida del estudiante, conforme a lo establecido en el sistema de progresión disciplinaria institucional.',
    descripcion:
      'Los registros pedagógicos dan cuenta de la persistencia de conductas tipificadas como faltas leves (Art. 24) que, pese a los llamados de atención verbales previos (Medida 1), no han sido corregidas. Esta reiteración evidencia una falta de adhesión a las normas básicas de convivencia y un impacto negativo en el clima de aula.',
    medida:
      'Aplicación de una Amonestación Escrita Formal, que constituye una comunicación oficial archivada de forma permanente en la hoja de vida del estudiante. Esta medida actúa como una instancia de advertencia superior antes de escalar a una falta grave o a la firma de una Carta de Compromiso.',
    acuerdos:
      'Realización de una entrevista formal entre el apoderado, el estudiante y el profesor jefe para analizar los antecedentes; con el objeto de adoptar a un compromiso de cambio conductual inmediato por parte del alumno; y notificación explícita sobre el riesgo de escalar a la Medida 4 (Carta de Compromiso) al alcanzar las 10 anotaciones.',
    cierre:
      'Esta acción se fundamenta en los artículos 18 (Medida 3) y 24 BIS del Reglamento Interno de Convivencia Escolar 2026, cumpliendo con los principios de gradualidad y debido proceso de nuestra comunidad educativa.',
    observaciones: '',
  },
  compromiso_conductual: {
    motivo:
      'Activación de la Medida 4 debido a la acumulación de 10 o más anotaciones leves en la hoja de vida del estudiante (Art. 24 BIS).',
    descripcion:
      'Se registra que las medidas pedagógicas previas (Llamado de atención y Amonestación Escrita) no han sido suficientes para lograr la autorregulación del estudiante. La persistencia de las conductas disruptivas o la naturaleza de la falta cometida evidencian un distanciamiento del compromiso académico y de convivencia, lo que hace imperativo formalizar objetivos de mejora específicos.',
    medida:
      'Firma de una Carta de Compromiso Conductual. Esta medida es una instancia superior de apoyo pedagógico antes de transitar hacia sanciones que afecten la asistencia regular (Medida 5) o la condicionalidad de la permanencia en el establecimiento.',
    acuerdos: DEFAULT_COMMITMENTS.join('\n'),
    cierre:
      'Esta medida se aplica bajo los lineamientos de los artículos 18 y 24 BIS del Reglamento Interno de Convivencia Escolar 2026, garantizando el debido proceso y el enfoque de disciplina formativa para el desarrollo integral del estudiante.',
    observaciones: '',
  },
  derivacion: {
    motivo:
      'Activación de protocolo por acumulación crítica de registros conductuales (Art. 24 BIS), habiendo alcanzado el umbral de 15 anotaciones leves que tipifican el caso como una conducta grave que requiere intervención psicosocial.',
    descripcion:
      'El historial pedagógico del estudiante evidencia una persistencia de conductas disruptivas que han agotado las instancias formativas de aula. Esta reiteración manifiesta una dificultad en la autorregulación por convicción personal, lo que afecta el clima de aprendizaje y demanda una evaluación psicosocial para identificar factores subyacentes y evitar la escalada a sanciones mayores.',
    medida:
      'Escalamiento a intervención formal del Equipo de Convivencia Escolar (Paso 8 del Debido Proceso), debido al incumplimiento de los acuerdos de la Carta de Compromiso Conductual (Medida 4) y la acumulación crítica de anotaciones (Art. 24 BIS). Esta derivación tiene como fin transitar hacia un acompañamiento psicosocial, en donde se EVALÚA la posible aplicación de la Medida 5 (Suspensión Temporal) al configurarse la conducta como una falta muy grave por reiteración y falta de respuesta a las instancias pedagógicas previas.',
    acuerdos:
      'Realización de una evaluación socioemocional por el psicólogo de ciclo a través de una entrevista reflexiva y estructurada con el estudiante para el establecimiento de acuerdos colaborativos.',
    cierre:
      'La presente derivación se realiza bajo los principios de gradualidad y disciplina formativa estipulados en los Artículos 15, 20 y 24 BIS del RICE 2026, y los estándares de debido proceso de la Superintendencia de Educación.',
    observaciones: '',
  },
};
