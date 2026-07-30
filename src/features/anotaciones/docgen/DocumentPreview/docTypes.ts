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

const DEFAULT_COMMITMENTS = [
  'Establecimiento de objetivos de mejora conductual claros, observables y medibles, orientados al cese de las conductas que originan anotaciones negativas y al fortalecimiento de conductas positivas; ejecución de un seguimiento periódico, con evaluación formal del cumplimiento de dichos objetivos; y notificación explícita al estudiante y a su apoderado de que la inobservancia o el incumplimiento reiterado de estos acuerdos configurará una escalada directa a falta muy grave, con la consecuente aplicación de las medidas estipuladas en el Reglamento Interno de Convivencia Escolar (RICE).',
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
      'Activación de intervención técnica especializada por agotamiento de instancias pedagógicas iniciales y/o acumulación crítica de registros (Art. 24 BIS), requiriendo un análisis psicosocial antes de la escalada a medidas de alta complejidad administrativa.',
    descripcion:
      'El historial del estudiante registra una persistencia de conductas disruptivas que no han sido modificadas tras la aplicación de medidas previas (Amonestación Escrita o Carta de Compromiso). Se observa una dificultad en la autorregulación y una falta de adhesión a los acuerdos institucionales, lo que evidencia que la situación ha superado el manejo exclusivamente pedagógico del aula y requiere una evaluación de factores subyacentes.',
    medida:
      'Derivación formal al Equipo de Convivencia Escolar (Psicólogo/a de Ciclo o Trabajadora Social) para la realización de una entrevista reflexiva profunda y la orientación estratégica para la modificación efectiva de conductas. Esta medida busca garantizar el debido proceso y agotar el apoyo profesional antes de considerar sanciones que afecten la permanencia del estudiante.',
    acuerdos:
      'Realización de una entrevista reflexiva estructurada con el estudiante para confrontar la falta de modificación conductual, la cual quedará formalizada en una hoja de entrevista oficial; ejecución de un seguimiento quincenal respecto a su evolución; y la notificación explícita de que la persistencia de estas conductas tras esta instancia técnica derivará en medidas gravosas, como la suspensión temporal prolongada o la condicionalidad de matrícula.',
    cierre:
      'Este procedimiento se fundamenta en los Artículos 12, 19, 20 (Paso 8) y 24 BIS del Reglamento Interno de Convivencia Escolar 2026, asegurando el enfoque formativo y restaurativo mandatado por la normativa educacional vigente.',
    observaciones: '',
  },
};
