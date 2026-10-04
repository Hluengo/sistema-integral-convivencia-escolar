/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FaseProcedimental } from "@/shared/lib/types";

/**
 * Tono visual único por etapa del debido proceso (Circular 482 / Ley 20.529).
 * Fuente compartida entre el dashboard (distribución por etapa) y el tab
 * Ruta del expediente, para que cada fase tenga siempre el mismo color.
 * Todas las clases Tailwind van literales (nunca se construyen dinámicas).
 */
export interface PhaseStageTone {
  phase: FaseProcedimental;
  description: string;
  /** Barra de distribución del dashboard. */
  color: string;
  /** Pill activa del stepper de Ruta (contraste apto para texto blanco). */
  solid: string;
  /** Fondo suave y texto para insignias y contadores. */
  softBg: string;
  softText: string;
  /** Combinado fondo + texto (compatibilidad con tarjetas del dashboard). */
  tone: string;
  /** Cabecera expandida del índice foliado. */
  headerBg: string;
  strongText: string;
  /** Contorno de la tarjeta de la etapa en el índice foliado. */
  frame: string;
  badge: string;
  badgeTone: string;
}

export const PHASE_STAGE_TONES: PhaseStageTone[] = [
  {
    phase: "Recepción",
    description: "Ingreso y revisión inicial del expediente.",
    color: "bg-blue-500",
    solid: "bg-blue-600",
    softBg: "bg-blue-50",
    softText: "text-blue-700",
    tone: "bg-blue-50 text-blue-700",
    headerBg: "bg-blue-50/70",
    strongText: "text-blue-800",
    frame: "border-blue-300",
    badge: "Inicio",
    badgeTone: "bg-emerald-50 text-emerald-700",
  },
  {
    phase: "Investigación",
    description: "Indagación y recopilación de antecedentes.",
    color: "bg-amber-500",
    solid: "bg-amber-600",
    softBg: "bg-amber-50",
    softText: "text-amber-700",
    tone: "bg-amber-50 text-amber-700",
    headerBg: "bg-amber-50/70",
    strongText: "text-amber-800",
    frame: "border-amber-300",
    badge: "En curso",
    badgeTone: "bg-amber-50 text-amber-700",
  },
  {
    phase: "Resolución",
    description: "Informe y decisión sobre las medidas.",
    color: "bg-violet-500",
    solid: "bg-violet-600",
    softBg: "bg-violet-50",
    softText: "text-violet-700",
    tone: "bg-violet-50 text-violet-700",
    headerBg: "bg-violet-50/70",
    strongText: "text-violet-800",
    frame: "border-violet-300",
    badge: "Decisión",
    badgeTone: "bg-sky-50 text-sky-700",
  },
  {
    phase: "Apelación",
    description: "Revisión de recursos presentados.",
    color: "bg-teal-500",
    solid: "bg-teal-600",
    softBg: "bg-teal-50",
    softText: "text-teal-700",
    tone: "bg-teal-50 text-teal-700",
    headerBg: "bg-teal-50/70",
    strongText: "text-teal-800",
    frame: "border-teal-300",
    badge: "Recursos",
    badgeTone: "bg-emerald-50 text-emerald-700",
  },
  {
    phase: "Seguimiento",
    description: "Ejecución y seguimiento de medidas.",
    color: "bg-slate-400",
    solid: "bg-slate-500",
    softBg: "bg-slate-100",
    softText: "text-slate-700",
    tone: "bg-slate-100 text-slate-700",
    headerBg: "bg-slate-100/70",
    strongText: "text-slate-800",
    frame: "border-slate-300",
    badge: "Seguimiento",
    badgeTone: "bg-slate-100 text-slate-700",
  },
];

const FALLBACK_TONE: PhaseStageTone = PHASE_STAGE_TONES[4] as PhaseStageTone;

/** Tono de una fase; ante un valor desconocido devuelve Seguimiento. */
export function getPhaseTone(phase: FaseProcedimental): PhaseStageTone {
  return (
    PHASE_STAGE_TONES.find((entry) => entry.phase === phase) ?? FALLBACK_TONE
  );
}
