/** @license SPDX-License-Identifier: Apache-2.0 */

import type {
  HechoEvidenciaRow,
  HechoRow,
} from "../../api/services/hechos.service";
import type { Causa, ReconsideracionRecord, SeguimientoRecord } from "../types";

export interface TransitionDecision {
  allowed: boolean;
  reason: string;
  blockers: string[];
}

export interface ProceduralContext {
  hechos?: HechoRow[];
  vinculos?: HechoEvidenciaRow[];
  reconsideraciones?: ReconsideracionRecord[];
  seguimientos?: SeguimientoRecord[];
}

const done = (causa: Causa, id: string) =>
  causa.checklistDebidoProceso.some(
    (item) => item.id === id && item.completado,
  );

const hasBitacora = (causa: Causa, pattern: RegExp) =>
  causa.bitacora.some((entry) =>
    pattern.test(`${entry.titulo} ${entry.descripcion}`),
  );

const requiredIfPresent = (
  causa: Causa,
  id: string,
  message: string,
): string[] => {
  const item = causa.checklistDebidoProceso.find((entry) => entry.id === id);
  return item && !item.completado ? [message] : [];
};

const decision = (blockers: string[]): TransitionDecision => ({
  allowed: blockers.length === 0,
  reason:
    blockers.length === 0
      ? "Requisitos procedimentales cumplidos."
      : blockers[0],
  blockers,
});

const factsAreConcluded = (hechos: HechoRow[]) =>
  hechos.length > 0 && hechos.every((hecho) => hecho.estado !== "denunciado");

const accreditedFactsHaveEvidence = (
  hechos: HechoRow[],
  vinculos: HechoEvidenciaRow[],
) =>
  hechos
    .filter((hecho) => hecho.estado === "acreditado")
    .every((hecho) =>
      vinculos.some((vinculo) => vinculo.hecho_id === hecho.id),
    );

const accreditedFactsHaveRice = (hechos: HechoRow[]) =>
  hechos
    .filter((hecho) => hecho.estado === "acreditado")
    .every((hecho) => Boolean(hecho.rice_articulo?.trim()));

export function canCloseInvestigation(
  causa: Causa,
  { hechos = [], vinculos = [] }: ProceduralContext = {},
): TransitionDecision {
  const blockers: string[] = [];
  if (
    !done(causa, "chk_rec_3") &&
    !hasBitacora(causa, /notificaci[oó]n.*indagaci[oó]n/i)
  )
    blockers.push("Falta notificar el inicio de la indagación.");
  blockers.push(
    ...requiredIfPresent(
      causa,
      "chk_inv_8",
      "Faltan descargos o registrar el plazo vencido.",
    ).filter(() => !hasBitacora(causa, /descargo/i)),
  );
  if (!factsAreConcluded(hechos))
    blockers.push("Todos los hechos deben tener una conclusión.");
  if (!accreditedFactsHaveEvidence(hechos, vinculos))
    blockers.push("Los hechos acreditados requieren evidencia vinculada.");
  if (!accreditedFactsHaveRice(hechos))
    blockers.push("Los hechos acreditados requieren norma RICE.");
  return decision(blockers);
}

export function canStartDecisionAnalysis(
  causa: Causa,
  context: ProceduralContext = {},
): TransitionDecision {
  const investigation = canCloseInvestigation(causa, context);
  const blockers = [...investigation.blockers];
  blockers.push(
    ...requiredIfPresent(
      causa,
      "chk_inv_9",
      "Falta cerrar formalmente la indagación.",
    ),
  );
  return decision([...new Set(blockers)]);
}

export function canNotifyDecision(causa: Causa): TransitionDecision {
  const blockers: string[] = [];
  blockers.push(
    ...requiredIfPresent(
      causa,
      "chk_res_7",
      "Falta determinar hechos y participación individual.",
    ),
    ...requiredIfPresent(
      causa,
      "chk_res_8",
      "Falta analizar RICE, historial y proporcionalidad.",
    ),
    ...requiredIfPresent(
      causa,
      "chk_res_9",
      "Falta incorporar la decisión fundada.",
    ),
  );
  if (!done(causa, "chk_res_4") && !hasBitacora(causa, /entrevista|descargo/i))
    blockers.push("Falta resguardar el derecho a ser oído.");
  return decision(blockers);
}

export function canStartMeasures(causa: Causa): TransitionDecision {
  const blockers: string[] = [];
  if (!done(causa, "chk_imp_7"))
    blockers.push("La decisión definitiva aún no está notificada.");
  if (!done(causa, "chk_seg_1"))
    blockers.push("Falta iniciar la medida o plan de acompañamiento.");
  return decision(blockers);
}

export function canCloseCase(
  causa: Causa,
  { reconsideraciones, seguimientos }: ProceduralContext = {},
): TransitionDecision {
  const blockers = [
    ...requiredIfPresent(
      causa,
      "chk_res_7",
      "Falta determinar hechos y participación individual.",
    ),
    ...requiredIfPresent(
      causa,
      "chk_res_8",
      "Falta analizar RICE, historial y proporcionalidad.",
    ),
    ...requiredIfPresent(
      causa,
      "chk_res_9",
      "Falta incorporar la decisión fundada.",
    ),
    ...(causa.checklistDebidoProceso.some(
      (item) => item.id === "chk_imp_6" && !item.completado,
    ) && !reconsideraciones?.some((record) => record.estado !== "pendiente")
      ? ["Falta resolver la reconsideración o registrar el plazo vencido."]
      : []),
    ...requiredIfPresent(
      causa,
      "chk_imp_7",
      "Falta notificar la decisión definitiva.",
    ),
    ...requiredIfPresent(
      causa,
      "chk_seg_1",
      "Falta iniciar la medida o plan de acompañamiento.",
    ),
    ...requiredIfPresent(causa, "chk_seg_3", "Falta finalizar el seguimiento."),
    ...requiredIfPresent(
      causa,
      "chk_seg_4",
      "Falta registrar el cierre de la causa.",
    ),
  ];
  if (reconsideraciones?.some((record) => record.estado === "pendiente")) {
    blockers.push("Existe una reconsideración pendiente de resolución.");
  }
  if (
    seguimientos?.some(
      (record) => !["cumplido", "evaluado"].includes(record.estado),
    )
  ) {
    blockers.push("Existen seguimientos sin cumplimiento evaluado.");
  }
  const missingDocuments = causa.checklistDebidoProceso
    .filter((item) => item.bloqueanteParaCerrar && !item.documentoUrl)
    .map((item) => `Falta documento obligatorio para ${item.label}.`);
  return decision([...new Set([...blockers, ...missingDocuments])]);
}

export function getNextRequiredAction(
  causa: Causa,
  context: ProceduralContext = {},
): string | null {
  const actions: Array<[TransitionDecision, string]> = [
    [canCloseInvestigation(causa, context), "Cerrar formalmente la indagación"],
    [canStartDecisionAnalysis(causa, context), "Iniciar análisis de decisión"],
    [canNotifyDecision(causa), "Incorporar y notificar la decisión fundada"],
    [canStartMeasures(causa), "Iniciar medidas y seguimiento"],
    [canCloseCase(causa, context), "Finalizar seguimiento y cerrar la causa"],
  ];
  return actions.find(([result]) => !result.allowed)?.[1] ?? null;
}
