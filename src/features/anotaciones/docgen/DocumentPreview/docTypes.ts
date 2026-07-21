/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Annotation } from '../../../../types';

export type DocType = 'amonestacion' | 'compromiso_conductual' | 'derivacion';

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
