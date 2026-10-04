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
 * Tono humanizado y neutral: la indagación no da por acreditada la falta ni
 * anticipa conclusiones (la calificación es preliminar y revisable). Como los
 * párrafos son más extensos, verificar la paginación en la vista previa del
 * generador (LetterPreviewViewport): el documento puede extenderse más allá
 * de una hoja Carta.
 */
export const DEFAULT_NOTIFICATION_CONTENT: NotificationContent = {
  fundamentoProcedimiento:
    "Informamos el inicio de una indagación de convivencia escolar, correspondiente al expediente indicado, de conformidad con la Circular N.º 482 y el Reglamento Interno de Convivencia Escolar (RICE) vigente.\n\nEl propósito de esta instancia es recopilar y analizar los antecedentes necesarios para esclarecer la situación, escuchar a las personas involucradas y determinar, posteriormente, las medidas que pudieran corresponder, resguardando el debido proceso y los derechos de los estudiantes.",
  hallazgoIncidente:
    "Los hechos corresponden a lo reportado y registrado inicialmente en el expediente, incluyendo los antecedentes aportados mediante la denuncia o comunicación recibida y la revisión preliminar de la información disponible.\n\nDurante la indagación, estos antecedentes serán revisados y contrastados con las demás fuentes de información que resulten pertinentes, con el propósito de alcanzar una comprensión adecuada de la situación.",
  evidenciaTestimonios:
    "Durante la indagación se podrán recopilar y considerar antecedentes, testimonios, registros institucionales, evidencias y demás información pertinente para esclarecer los hechos.\n\nLa información será analizada procurando considerar las distintas circunstancias y versiones relacionadas con la situación.",
  atenuantesAgravantes:
    "En el análisis se considerarán los antecedentes personales, educativos y contextuales del estudiante que resulten pertinentes, incluyendo las eventuales circunstancias atenuantes o agravantes contempladas en el RICE.\n\nLo anterior permitirá que cualquier decisión posterior sea proporcional a los hechos que efectivamente se acrediten y a las circunstancias en que estos hayan ocurrido.",
  calificacionFalta:
    "La calificación indicada en este documento corresponde a una valoración preliminar, realizada de acuerdo con la conducta tipificada en el RICE vigente.\n\nEsta calificación podrá ser revisada, modificada o descartada una vez finalizada la indagación y analizados integralmente los antecedentes recopilados.",
  medidasEnEvaluacion:
    "Una vez concluida la indagación y analizados los antecedentes, se determinarán las medidas que, de acuerdo con el RICE y la normativa vigente, pudieran corresponder.\n\nEstas medidas se evaluarán considerando los principios de gradualidad, proporcionalidad, debido proceso y enfoque formativo, procurando favorecer la reflexión, la responsabilización y la mejora de la convivencia escolar.",
  advertenciaEspecial: "",
  garantiasDebidoProceso:
    "La presente indagación no constituye una sanción ni implica una conclusión anticipada respecto de los hechos.\n\nDurante el procedimiento, el/la estudiante y su apoderado/a tienen derecho a ser informados, a ser escuchados, a presentar antecedentes y descargos, a conocer las conclusiones y medidas que correspondan y a solicitar reconsideración cuando ello se encuentre contemplado en el RICE y la normativa vigente.",
  confidencialidad:
    "Se solicita mantener la debida reserva respecto de esta notificación y de los antecedentes asociados al procedimiento, evitando su difusión innecesaria.\n\nLo anterior tiene como finalidad resguardar la intimidad, dignidad y honra del estudiante, su familia y las demás personas involucradas, favoreciendo además un adecuado desarrollo del proceso de indagación.",
};
