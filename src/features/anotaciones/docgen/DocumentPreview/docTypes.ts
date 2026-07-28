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
  'Asistir a todas las clases según horario establecido.',
  'Mantener una conducta respetuosa y acorde a las normas del establecimiento.',
  'Cumplir con las tareas y trabajos académicos asignados.',
  'Participar en las actividades formativas y de orientación programadas por Convivencia Escolar.',
];

export const DEFAULT_LETTER_CONTENT: Record<DocType, LetterContent> = {
  amonestacion: {
    motivo:
      'Activación de la Medida 3 debido a la primera acumulación crítica de 5 anotaciones leves en la hoja de vida del estudiante, conforme a lo establecido en el sistema de progresión disciplinaria institucional.',
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
      'Reiteración de anotaciones negativas que supera el umbral institucional para compromiso conductual.',
    descripcion:
      'El/La estudiante ha acumulado anotaciones negativas que evidencian conductas reiteradas contrarias a las normas de convivencia escolar.',
    medida:
      'Se establece una Carta de Compromiso Conductual orientada a mejorar la conducta, reparar eventuales daños y sostener un seguimiento formativo.',
    acuerdos: DEFAULT_COMMITMENTS.join('\n'),
    cierre:
      'El incumplimiento de los acuerdos establecidos podrá derivar en una escalada disciplinaria y derivación al equipo de Convivencia Escolar.',
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
