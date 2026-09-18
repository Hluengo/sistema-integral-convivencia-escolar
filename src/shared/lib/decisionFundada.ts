/** @license SPDX-License-Identifier: Apache-2.0 */

import type { HechoRow } from "../api/services/hechos.service";

export interface DecisionStep {
  id: string;
  label: string;
  completa: boolean;
}

export interface DecisionStepInput {
  hecho: Pick<
    HechoRow,
    | "estado"
    | "participacion_acreditada"
    | "rice_articulo"
    | "agravantes"
    | "atenuantes"
    | "medida_seleccionada"
    | "analisis_proporcionalidad"
    | "decision_fundada"
  >;
  evidenciasCount: number;
  medidasPermitidasCount: number;
  calificacionPresente: boolean;
}

/**
 * Deriva el avance de la Matriz de Decisión Fundada desde datos reales del
 * expediente. Ningún paso se marca por declaración: todos dependen de campos
 * persistidos (hechos, vínculos, RICE, agravantes/atenuantes, decisión).
 */
export function getDecisionSteps(input: DecisionStepInput): DecisionStep[] {
  const { hecho } = input;
  const determinada = hecho.estado !== "denunciado";
  return [
    { id: "hecho", label: "Hecho denunciado", completa: true },
    {
      id: "evidencias",
      label: "Evidencias vinculadas",
      completa: input.evidenciasCount > 0,
    },
    {
      id: "determinacion",
      label: "Determinación del hecho",
      completa: determinada,
    },
    {
      id: "participacion",
      label: "Participación individual",
      completa: hecho.participacion_acreditada,
    },
    {
      id: "rice",
      label: "Norma RICE",
      completa: Boolean(hecho.rice_articulo?.trim()),
    },
    {
      id: "calificacion",
      label: "Calificación de la conducta",
      completa: input.calificacionPresente,
    },
    {
      id: "hoja_vida",
      label: "Hoja de vida pertinente",
      completa: determinada,
    },
    {
      id: "atenuantes",
      label: "Atenuantes",
      completa: (hecho.atenuantes?.length ?? 0) > 0,
    },
    {
      id: "agravantes",
      label: "Agravantes",
      completa: (hecho.agravantes?.length ?? 0) > 0,
    },
    {
      id: "medidas",
      label: "Medidas permitidas",
      completa: input.medidasPermitidasCount > 0,
    },
    {
      id: "analisis",
      label: "Análisis de proporcionalidad",
      completa: hecho.analisis_proporcionalidad.trim().length > 0,
    },
    {
      id: "decision",
      label: "Decisión fundada",
      completa:
        hecho.decision_fundada.trim().length > 0 &&
        Boolean(hecho.medida_seleccionada?.trim()),
    },
  ];
}

export function countDecisionSteps(input: DecisionStepInput): {
  completadas: number;
  total: number;
} {
  const steps = getDecisionSteps(input);
  return {
    completadas: steps.filter((s) => s.completa).length,
    total: steps.length,
  };
}
