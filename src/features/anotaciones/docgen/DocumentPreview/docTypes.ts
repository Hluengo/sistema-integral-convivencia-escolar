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
  docObservations: string;
  selectedAnnsObjects: Annotation[];
  letterContent: LetterContent;
}

export const TITLE_MAP: Record<DocType, string> = {
  amonestacion: 'Amonestación Escrita',
  compromiso_conductual: 'Carta de Compromiso Conductual',
  derivacion: 'Derivación Equipo de Convivencia Escolar',
};

export const DEFAULT_COMMITMENTS = [
  'Asistir a todas las clases según horario establecido.',
  'Mantener una conducta respetuosa y acorde a las normas del establecimiento.',
  'Cumplir con las tareas y trabajos académicos asignados.',
  'Participar en las actividades formativas y de orientación programadas por Convivencia Escolar.',
];

export const DEFAULT_LETTER_CONTENT: Record<DocType, LetterContent> = {
  amonestacion: {
    motivo: 'Acumulación de anotaciones negativas registradas en la hoja de vida escolar.',
    descripcion:
      'El/La estudiante registra conductas contrarias a las normas de convivencia escolar, de acuerdo con los antecedentes disponibles en el sistema de anotaciones del establecimiento.',
    medida:
      'Se aplica la medida de Amonestación Escrita, consistente en la notificación formal al estudiante, apoderado y profesor jefe, quedando registro en la hoja de vida escolar.',
    acuerdos:
      'El apoderado toma conocimiento y se compromete a reforzar en el hogar las normas de conducta, respeto y responsabilidad escolar.',
    cierre:
      'La reincidencia posterior a esta comunicación podrá activar medidas disciplinarias superiores según el Reglamento Interno RICE 2026.',
    observaciones: '',
  },
  compromiso_conductual: {
    motivo: 'Reiteración de anotaciones negativas que supera el umbral institucional para compromiso conductual.',
    descripcion:
      'El/La estudiante ha acumulado anotaciones negativas que evidencian conductas reiteradas contrarias a las normas de convivencia escolar.',
    medida:
      'Se establece una Carta de Compromiso Conductual orientada a mejorar la conducta, reparar eventuales daños y sostener un seguimiento formativo.',
    acuerdos:
      DEFAULT_COMMITMENTS.join('\n'),
    cierre:
      'El incumplimiento de los acuerdos establecidos podrá derivar en una escalada disciplinaria y derivación al equipo de Convivencia Escolar.',
    observaciones: '',
  },
  derivacion: {
    motivo: 'Acumulación de anotaciones negativas que activa derivación al equipo de Convivencia Escolar.',
    descripcion:
      'Los antecedentes registrados dan cuenta de conductas reiteradas que afectan la sana convivencia y requieren intervención especializada.',
    medida:
      'Se deriva el caso al Equipo de Convivencia Escolar para evaluación, acompañamiento y definición de acciones formativas o de apoyo.',
    acuerdos:
      'Evaluación socioemocional, plan de acompañamiento conductual, entrevista con apoderado y seguimiento periódico por el equipo correspondiente.',
    cierre:
      'La derivación se realiza conforme al Reglamento Interno RICE 2026, Circular 482/2018 y normativa vigente sobre convivencia escolar.',
    observaciones: '',
  },
};
