/** @license SPDX-License-Identifier: Apache-2.0 */

import type { NotificationContent } from './types';

export const NOTIFICACION_TITLE = 'Notificación de Inicio de Indagación';

/** Títulos de las 8 secciones numeradas del documento. */
export const NOTIFICATION_SECTIONS: Array<{ key: keyof NotificationContent; title: string }> = [
  { key: 'fundamentoProcedimiento', title: 'Fundamento del procedimiento' },
  { key: 'hallazgoIncidente', title: 'Hechos que motivan la indagación' },
  { key: 'evidenciaTestimonios', title: 'Evidencias y testimonios' },
  { key: 'atenuantesAgravantes', title: 'Circunstancias atenuantes y agravantes' },
  { key: 'calificacionFalta', title: 'Calificación preliminar de la falta' },
  { key: 'medidasEnEvaluacion', title: 'Medidas en evaluación' },
  { key: 'garantiasDebidoProceso', title: 'Garantías del debido proceso' },
  { key: 'confidencialidad', title: 'Confidencialidad' },
];

/**
 * Texto base editable de la notificación, alineado al Paso 1 (Detección) y
 * Paso 2 (Acopio de Información) de la Circular 482 (2018) y al RICE vigente.
 *
 * Párrafos deliberadamente concisos: el documento debe caber en una sola hoja
 * Carta (216x279mm) con la variante tipográfica `letter-document--compact`.
 * Evitar expandir estos párrafos sin verificar el desbordamiento.
 */
export const DEFAULT_NOTIFICATION_CONTENT: NotificationContent = {
  fundamentoProcedimiento:
    'Conforme al Paso 1 (Detección) y Paso 2 (Acopio de Información) de la Circular N° 482 (2018) y al RICE vigente, se inicia la indagación para verificar los hechos antes de adoptar medida alguna.',
  hallazgoIncidente:
    'Los hechos corresponden a lo reportado y registrado en el expediente de la causa, en particular la recepción de la denuncia y la revisión inicial de antecedentes.',
  evidenciaTestimonios:
    'Se recopilarán los antecedentes, testimonios y evidencias pertinentes, los que quedarán registrados en el expediente del caso.',
  atenuantesAgravantes:
    'Se considerarán los antecedentes personales y contextuales del estudiante, incluyendo atenuantes o agravantes que surjan de la información recopilada.',
  calificacionFalta:
    'La calificación definitiva se realizará al concluir el acopio de información, conforme a la tipificación del RICE vigente.',
  medidasEnEvaluacion:
    'Las medidas se evaluarán conforme a los principios de gradualidad, proporcionalidad y enfoque formativo de la normativa vigente.',
  advertenciaEspecial: '',
  garantiasDebidoProceso:
    'Se advierte que esta indagación no constituye una sanción anticipada; el estudiante conserva su derecho a ser informado, derecho a ser escuchado, derecho a presentar antecedentes y descargos, derecho a conocer los resultados y derecho a solicitar la reconsideración de la decisión final.',
  confidencialidad:
    'Se solicita mantener la confidencialidad de esta notificación y sus antecedentes, en resguardo de la intimidad y honra del estudiante y su familia.',
};
