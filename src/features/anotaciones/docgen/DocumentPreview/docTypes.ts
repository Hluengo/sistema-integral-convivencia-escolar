/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Annotation } from "../../../../shared/lib/types";

export type DocType = "amonestacion" | "compromiso_conductual" | "derivacion";

export interface LetterContent {
  motivo: string;
  descripcion: string;
  medida: string;
  acuerdos: string;
  cierre: string;
  observaciones: string;
}

export type LetterAnnotationRecord = Pick<
  Annotation,
  "id" | "text" | "date" | "registered_by" | "type"
>;

export interface LetterAnnotationSummary {
  negativas: LetterAnnotationRecord[];
  positivas: LetterAnnotationRecord[];
  informativas: LetterAnnotationRecord[];
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
  annotationSummary: LetterAnnotationSummary;
  letterContent: LetterContent;
}

export function buildLetterAnnotationSummary(
  annotations: Annotation[],
  selectedNegativeAnnotations: Annotation[],
): LetterAnnotationSummary {
  const toRecord = (annotation: Annotation): LetterAnnotationRecord => ({
    id: annotation.id,
    text: annotation.text,
    date: annotation.date,
    registered_by: annotation.registered_by,
    type: annotation.type,
  });

  return {
    negativas: selectedNegativeAnnotations.map(toRecord),
    positivas: annotations
      .filter((annotation) => annotation.type === "Positiva")
      .map(toRecord),
    informativas: annotations
      .filter((annotation) => annotation.type === "Información")
      .map(toRecord),
  };
}

export function isLetterAnnotationSummary(
  value: unknown,
): value is LetterAnnotationSummary {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return ["negativas", "positivas", "informativas"].every(
    (key) =>
      Array.isArray(candidate[key]) &&
      candidate[key].every(
        (item) =>
          item &&
          typeof item === "object" &&
          typeof (item as Record<string, unknown>).id === "string" &&
          typeof (item as Record<string, unknown>).text === "string" &&
          typeof (item as Record<string, unknown>).date === "string" &&
          typeof (item as Record<string, unknown>).registered_by === "string",
      ),
  );
}

export const TITLE_MAP: Record<DocType, string> = {
  amonestacion: "Amonestación Escrita",
  compromiso_conductual: "Compromiso Conductual",
  derivacion: "Derivación a Convivencia Escolar",
};

export const DEFAULT_LETTER_CONTENT: Record<DocType, LetterContent> = {
  amonestacion: {
    motivo:
      "Se activa la Medida 3 ante la primera acumulación de 5 o más anotaciones leves en la hoja de vida del estudiante, de acuerdo con lo establecido en el Art. 24 BIS del Reglamento Interno de Convivencia Escolar.",
    descripcion:
      "Los registros realizados dan cuenta de conductas tipificadas como faltas leves (Art. 24) que se han reiterado pese a los llamados de atención y orientaciones entregadas previamente. Esta medida busca favorecer la reflexión del estudiante respecto de sus acciones, promover la responsabilidad y generar una oportunidad concreta para mejorar su forma de relacionarse y desenvolverse en la comunidad educativa.",
    medida:
      "Amonestación Escrita Formal. Esta medida constituye una comunicación formal que queda registrada en la hoja de vida del estudiante y tiene como propósito advertir la reiteración de conductas que afectan la convivencia, favoreciendo un proceso de reflexión y mejora antes de avanzar a otras medidas contempladas en el Reglamento.",
    acuerdos:
      "El estudiante se compromete a favorecer una convivencia respetuosa y a evitar nuevas anotaciones leves durante los próximos 30 días.\nEl estudiante y su apoderado deberán participar en una entrevista con el profesor jefe, dejando constancia de los acuerdos adoptados.\nCuando corresponda, el estudiante deberá asumir acciones reparatorias frente a eventuales daños ocasionados, tales como ofrecer disculpas o reparar/reponer aquello que corresponda, conforme al Art. 23.\nSi durante los próximos 30 días no se registran nuevas anotaciones leves, se podrá reconocer este avance mediante una nota de mérito en su hoja de vida.\nEn caso de alcanzar las 10 anotaciones, se procederá conforme a la Medida 4 establecida en el Reglamento Interno.",
    cierre:
      "Esta medida se fundamenta en los artículos 18 (Medida 3) y 24 BIS del Reglamento Interno de Convivencia Escolar 2026, procurando una intervención gradual, formativa y orientada a la mejora de la convivencia y al desarrollo de la responsabilidad del estudiante.",
    observaciones: "",
  },
  compromiso_conductual: {
    motivo:
      "Se activa la Medida 4 ante la acumulación de 10 o más anotaciones leves, conforme al Art. 24 BIS (segunda acumulación), o ante la constatación de una falta grave, de acuerdo con las disposiciones del Reglamento Interno.",
    descripcion:
      "Considerando que las orientaciones y medidas implementadas previamente no han sido suficientes para favorecer un cambio sostenido en la conducta, se establece un espacio formal de acompañamiento y compromiso, destinado a que el estudiante pueda reconocer las situaciones que requieren mejora y asumir objetivos concretos para fortalecer su convivencia con los demás.",
    medida:
      "Carta de Compromiso Conductual. Esta medida busca establecer compromisos claros, alcanzables y verificables, promoviendo la responsabilidad del estudiante y el acompañamiento de los adultos responsables. Constituye una instancia formativa previa a la eventual aplicación de medidas de mayor intensidad contempladas en el Reglamento.",
    acuerdos:
      "El estudiante se compromete a trabajar durante los próximos 30 días en la mejora de los patrones de conducta identificados en sus registros (según conste en sus anotaciones), procurando mantener relaciones respetuosas y acordes con las normas de convivencia.\nDeberá participar en instancias de seguimiento quincenal con Inspectoría de su nivel, dejando registro de los avances, dificultades y acuerdos adoptados.\nDurante este período se favorecerá la reflexión sobre las situaciones ocurridas y la búsqueda de estrategias que permitan prevenir su reiteración.\nAl finalizar los 30 días se realizará una evaluación del cumplimiento de los compromisos. En caso de observarse avances significativos, estos podrán ser reconocidos mediante una nota de mérito en su hoja de vida.\nSi las conductas persisten, se analizarán las medidas que correspondan de acuerdo con el Reglamento Interno, considerando los antecedentes del caso, las acciones desarrolladas y el debido proceso.",
    cierre:
      "Esta medida se fundamenta en los artículos 18 (Medida 4) y 24 BIS del Reglamento Interno de Convivencia Escolar 2026 y se implementa desde un enfoque formativo, de acompañamiento y corresponsabilidad, orientado a favorecer el desarrollo de habilidades para una convivencia respetuosa.",
    observaciones: "",
  },
  derivacion: {
    motivo:
      "Se activa una instancia de intervención especializada ante la persistencia de conductas que requieren un abordaje más integral, considerando los antecedentes registrados y las medidas formativas implementadas previamente, conforme al Art. 24 BIS. Esta instancia busca comprender los factores que pueden estar influyendo en la situación y definir estrategias de apoyo y mejora.",
    descripcion:
      "Los antecedentes registrados muestran que, pese a las orientaciones, la Amonestación Escrita y la Carta de Compromiso, persisten conductas que afectan la convivencia. Por ello, se considera necesario ampliar la mirada sobre la situación y favorecer una intervención que permita comprender sus causas, fortalecer los recursos personales del estudiante y establecer estrategias que contribuyan a una mejora sostenida.",
    medida:
      "Derivación formal al Equipo de Convivencia Escolar, para una instancia de entrevista y acompañamiento especializada, de acuerdo con las características y necesidades del caso. A partir de esta intervención se podrán establecer objetivos de trabajo y acciones de seguimiento que permitan apoyar al estudiante en el desarrollo de estrategias adecuadas para una convivencia respetuosa.",
    acuerdos:
      "El estudiante deberá participar en la entrevista con el Equipo de Convivencia Escolar en la fecha acordada.\nLa instancia de entrevista podrá desarrollarse inicialmente con el estudiante, resguardando un espacio adecuado para la reflexión y expresión de sus necesidades, sin perjuicio de la participación del apoderado u otros integrantes de la comunidad educativa cuando resulte pertinente.\nEl estudiante deberá participar activamente en los acuerdos y acciones que se definan a partir de la intervención, procurando avanzar en los objetivos establecidos.\nSe realizará seguimiento quincenal por parte de la Coordinación de Convivencia, dejando registro de los avances y de las dificultades que pudieran presentarse.\nEn caso de observarse avances en el proceso, estos serán reconocidos y reforzados como parte del acompañamiento formativo.\nSi, pese a las medidas de apoyo implementadas, las conductas persisten, se evaluarán las acciones que correspondan conforme al Reglamento Interno, considerando la naturaleza de los hechos, sus antecedentes, la proporcionalidad de la medida y el debido proceso.",
    cierre:
      "Esta medida se fundamenta en los artículos 12, 19, 20 (Paso 8) y 24 BIS del Reglamento Interno de Convivencia Escolar 2026 y busca fortalecer un proceso de acompañamiento, reflexión y mejora, resguardando el buen trato, la dignidad y los derechos de quienes integran la comunidad educativa.",
    observaciones: "",
  },
};
