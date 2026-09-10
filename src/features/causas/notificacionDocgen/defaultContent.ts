/** @license SPDX-License-Identifier: Apache-2.0 */

import type { NotificationContent } from "./types";

export const NOTIFICACION_TITLE = "Notificación de Inicio de Indagación";

/** Títulos de las 8 secciones numeradas del documento. */
export const NOTIFICATION_SECTIONS: Array<{
  key: keyof NotificationContent;
  title: string;
}> = [
  { key: "fundamentoProcedimiento", title: "Fundamento del procedimiento" },
  { key: "hallazgoIncidente", title: "Hechos que motivan la indagación" },
  { key: "calificacionFalta", title: "Calificación preliminar de la falta" },
  { key: "evidenciaTestimonios", title: "Evidencias y testimonios" },
  {
    key: "atenuantesAgravantes",
    title: "Circunstancias atenuantes y agravantes",
  },
  { key: "medidasEnEvaluacion", title: "Medidas en evaluación" },
  { key: "garantiasDebidoProceso", title: "Garantías del debido proceso" },
  { key: "confidencialidad", title: "Confidencialidad" },
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
    "Estimado/a apoderado/a: junto con saludar, informamos el inicio de una indagación del expediente indicado, conforme a la Circular N° 482 y al RICE vigente, para recopilar antecedentes antes de decidir.",
  hallazgoIncidente:
    "Los hechos corresponden a lo reportado y registrado inicialmente en el expediente, incluyendo la recepción de la denuncia y la revisión preliminar de antecedentes disponibles.",
  evidenciaTestimonios:
    "Durante la indagación se podrán incorporar antecedentes, testimonios y evidencias pertinentes.",
  atenuantesAgravantes:
    "También se considerarán los antecedentes personales y contextuales del estudiante, incluyendo eventuales atenuantes o agravantes que surjan de la información recopilada.",
  calificacionFalta:
    "La calificación preliminar de la falta se determina según la conducta tipificada en el RICE vigente y podrá revisarse al concluir la indagación.",
  medidasEnEvaluacion:
    "Las medidas que eventualmente correspondan se evaluarán conforme a los principios de gradualidad, proporcionalidad y enfoque formativo de la normativa vigente.",
  advertenciaEspecial:
    "Para aportar antecedentes o solicitar entrevista, comuníquese con el establecimiento por los canales institucionales.",
  garantiasDebidoProceso:
    "La indagación no constituye una sanción anticipada. El estudiante mantiene derecho a ser informado, derecho a ser escuchado, a presentar antecedentes y descargos, conocer resultados y solicitar reconsideración cuando corresponda.",
  confidencialidad:
    "Se solicita mantener la confidencialidad de esta notificación y sus antecedentes, en resguardo de la intimidad y honra del estudiante y su familia.",
};
