/** @license SPDX-License-Identifier: Apache-2.0 */

import type { TipoInfraccion } from "./types";

export const AGRAVANTES = [
  { id: "reincidencia", label: "Reincidencia" },
  { id: "abuso_poder", label: "Abuso de poder / superioridad" },
  { id: "discriminacion", label: "Discriminación" },
  { id: "premeditacion", label: "Premeditación" },
  { id: "pluralidad", label: "Pluralidad de autores" },
  { id: "lesion", label: "Lesión o daño grave" },
  { id: "objeto_peligroso", label: "Uso de objeto peligroso" },
] as const;

export const ATENUANTES = [
  { id: "irreprochable", label: "Irreprochable conducta anterior" },
  { id: "arrepentimiento", label: "Arrepentimiento / reconocimiento" },
  { id: "colaboracion", label: "Colaboración en la investigación" },
  { id: "reparacion", label: "Reparación del daño" },
  { id: "primera_vez", label: "Primera vez" },
  { id: "provocacion", label: "Provocación previa" },
  { id: "edad", label: "Edad / desarrollo" },
  { id: "nee", label: "NEE / discapacidad pertinente" },
] as const;

export type AgravanteId = (typeof AGRAVANTES)[number]["id"];
export type AtenuanteId = (typeof ATENUANTES)[number]["id"];

const MEDIDAS_BASE: Record<TipoInfraccion, string[]> = {
  Leve: [
    "Diálogo reflexivo",
    "Amonestación escrita",
    "Trabajo formativo",
    "Anotación negativa",
  ],
  Grave: [
    "Diálogo reflexivo",
    "Amonestación escrita",
    "Trabajo formativo",
    "Carta de Compromiso Conductual",
    "Suspensión 1–3 días",
    "Servicio comunitario",
  ],
  "Muy Grave": [
    "Carta de Compromiso Conductual",
    "Suspensión 3–5 días",
    "Condicionalidad",
    "Derivación a apoyo psicosocial",
    "Trabajo formativo intensivo",
  ],
  Gravísima: [
    "Suspensión 5–15 días",
    "Condicionalidad extrema",
    "Derivación a apoyo psicosocial",
    "Expulsión (Aula Segura)",
    "Cancelación de matrícula",
  ],
};

export interface ProporcionalidadInput {
  tipoInfraccion: TipoInfraccion;
  estado: "denunciado" | "acreditado" | "parcial" | "no_acreditado";
  participacionAcreditada: boolean;
  agravantes: AgravanteId[];
  atenuantes: AtenuanteId[];
  annotationsCount?: number;
  comprometeAulaSegura?: boolean;
}

export interface ProporcionalidadResult {
  medidasPermitidas: string[];
  recomendada: string | null;
  advertencias: string[];
  fundamento: string;
}

export function calcularMedidasPermitidas(
  input: ProporcionalidadInput,
): ProporcionalidadResult {
  const advertencias: string[] = [];
  if (input.estado !== "acreditado") {
    return {
      medidasPermitidas: [],
      recomendada: null,
      advertencias: [
        "Solo hechos acreditados habilitan medidas disciplinarias.",
      ],
      fundamento: "Hecho no acreditado — solo medidas formativas preventivas.",
    };
  }
  if (!input.participacionAcreditada) {
    return {
      medidasPermitidas: [
        "Diálogo reflexivo",
        "Trabajo formativo",
        "Apoyo psicosocial",
      ],
      recomendada: "Diálogo reflexivo",
      advertencias: [
        "Participación no acreditada — no proceden medidas disciplinarias.",
      ],
      fundamento: "Participación individual no acreditada.",
    };
  }

  let medidas = [...(MEDIDAS_BASE[input.tipoInfraccion] ?? MEDIDAS_BASE.Leve)];

  // Aula Segura filtra expulsión
  if (!input.comprometeAulaSegura) {
    medidas = medidas.filter(
      (m) => !m.includes("Expulsión") && !m.includes("Cancelación"),
    );
  }

  // Hoja de vida: reincidencia agravante implícita si annotationsCount alto
  const hasReincidencia =
    input.agravantes.includes("reincidencia") ||
    (input.annotationsCount ?? 0) >= 5;
  if (hasReincidencia && input.tipoInfraccion === "Leve") {
    advertencias.push(
      "Reincidencia sugerida por hoja de vida — considerar escalamiento a Grave.",
    );
  }

  // Atenuantes NEE: bloquea expulsión
  if (input.atenuantes.includes("nee")) {
    medidas = medidas.filter(
      (m) => !m.includes("Expulsión") && !m.includes("Cancelación"),
    );
    advertencias.push(
      "NEE/discapacidad pertinente — se excluyen medidas de exclusión.",
    );
  }

  // Si hay atenuantes fuertes, recomienda medida más leve del rango
  const tieneAtenuanteFuerte = input.atenuantes.some((a) =>
    ["irreprochable", "arrepentimiento", "reparacion", "primera_vez"].includes(
      a,
    ),
  );
  const tieneAgravanteFuerte = input.agravantes.some((a) =>
    ["discriminacion", "lesion", "objeto_peligroso", "abuso_poder"].includes(a),
  );

  let recomendada: string | null = null;
  if (tieneAtenuanteFuerte && !tieneAgravanteFuerte) {
    recomendada = medidas[0] ?? null;
  } else if (tieneAgravanteFuerte) {
    recomendada = medidas[medidas.length - 1] ?? null;
    advertencias.push(
      "Agravantes presentes — medida debe ser proporcional al daño.",
    );
  } else {
    // mediana
    recomendada = medidas[Math.floor(medidas.length / 2)] ?? null;
  }

  // Proporcionalidad sin análisis
  if (input.agravantes.length === 0 && input.atenuantes.length === 0) {
    advertencias.push(
      "Falta análisis de agravantes/atenuantes — registrar para fundar la decisión.",
    );
  }

  const fundamento = tieneAgravanteFuerte
    ? "Medida fundada en gravedad + agravantes y participación acreditada."
    : tieneAtenuanteFuerte
      ? "Medida atenuada por irreprochable conducta / reparación."
      : "Medida en rango medio por proporcionalidad.";

  return { medidasPermitidas: medidas, recomendada, advertencias, fundamento };
}
