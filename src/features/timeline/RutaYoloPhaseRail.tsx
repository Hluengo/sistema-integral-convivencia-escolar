/** @license SPDX-License-Identifier: Apache-2.0 */

import { Check } from "lucide-react";
import type {
  Causa,
  ChecklistItem,
  FaseProcedimental,
} from "../../shared/lib/types";
import {
  getCausaDeadline,
  getCausaDeadlineStages,
} from "../causas/causaPresentation";
import { getPhaseTone } from "../../shared/lib/domain/phaseTones";

type PhaseProgress = {
  phase: string;
  completed: number;
  total: number;
};

interface RutaYoloPhaseRailProps {
  causa: Causa;
  phaseProgress: PhaseProgress[];
  currentPhase: FaseProcedimental;
  activePhase: FaseProcedimental;
  activePhaseIndex: number;
  phaseItems: ChecklistItem[];
  expandedPhase: FaseProcedimental | null;
  selectedItemId: string | null;
  onSelectPhase: (phase: FaseProcedimental) => void;
  onSelectItem: (itemId: string) => void;
}

function formatDeadlineDate(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function getItemDeadline(item: ChecklistItem, causa: Causa) {
  if (item.fechaLimite) return formatDeadlineDate(item.fechaLimite);
  if (item.id === "chk_rec_3") return formatDeadlineDate(causa.fechaLimite24h);

  const investigationDeadline = getCausaDeadline(causa).deadlineDate;
  const stages = getCausaDeadlineStages(causa);
  if (item.id.startsWith("chk_inv_")) {
    return formatDeadlineDate(investigationDeadline);
  }
  if (item.id.startsWith("chk_res_")) {
    return formatDeadlineDate(stages.informeConcluyente?.deadlineDate);
  }
  return null;
}

export default function RutaYoloPhaseRail({
  causa,
  phaseProgress,
  currentPhase,
  activePhase,
  activePhaseIndex,
  phaseItems,
  expandedPhase,
  selectedItemId,
  onSelectPhase,
  onSelectItem,
}: RutaYoloPhaseRailProps) {
  const activeTone = getPhaseTone(activePhase);

  return (
    <aside className="flex min-h-0 flex-col border-neutral-200 border-b bg-neutral-50/50 lg:border-r lg:border-b-0">
      <div className="border-neutral-200 border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-bold text-neutral-950 text-sm uppercase tracking-wider">
              Índice foliado · Etapa {activePhaseIndex + 1}
            </p>
            <p className="mt-1 text-neutral-600 text-11px">
              Actuaciones de la fase actual
            </p>
          </div>
          <span
            className={`rounded-full px-2 py-1 font-semibold text-11px ${activeTone.softBg} ${activeTone.softText}`}
          >
            {phaseItems.length} hitos
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="space-y-2">
          {phaseProgress.map((phase) => {
            const phaseName = phase.phase as FaseProcedimental;
            const items = phaseName === activePhase ? phaseItems : [];
            const tone = getPhaseTone(phaseName);
            const isExpanded = phaseName === expandedPhase;
            const isCurrent = phaseName === currentPhase;

            return (
              <section
                key={phase.phase}
                className={`overflow-hidden rounded-xl border bg-white ${tone.frame}`}
              >
                <button
                  type="button"
                  onClick={() => onSelectPhase(phaseName)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-neutral-50"
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? "Ocultar" : "Mostrar"} hitos de ${phase.phase}`}
                >
                  <span
                    className={`font-semibold text-xs ${isExpanded ? tone.strongText : "text-neutral-700"}`}
                  >
                    {phase.phase}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-bold text-11px ${isCurrent ? `${tone.softBg} ${tone.softText}` : "bg-neutral-100 text-neutral-600"}`}
                  >
                    {phase.completed}/{phase.total}
                  </span>
                </button>

                {isExpanded && (
                  <div className="space-y-2 border-neutral-100 border-t bg-neutral-50/40 p-2">
                    {items.map((item) => {
                      const isSelected = item.id === selectedItemId;
                      const deadline = getItemDeadline(item, causa);
                      return (
                        <div key={item.id}>
                          <div
                            className={`rounded-lg border transition ${isSelected ? "border-emerald-500 bg-emerald-50/60 shadow-sm" : "border-neutral-200 bg-white"}`}
                          >
                            <button
                              type="button"
                              onClick={() => onSelectItem(item.id)}
                              className="w-full rounded-lg p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 hover:border-brand-300"
                              aria-pressed={isSelected}
                              aria-label={`${item.label}: ${item.completado ? "registrado" : "pendiente"}`}
                            >
                              <div className="flex items-start gap-2.5">
                                <span
                                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${item.completado ? "border-leve-600 bg-leve-600 text-white" : "border-neutral-300 bg-white text-transparent"}`}
                                >
                                  <Check
                                    className="size-3"
                                    aria-hidden="true"
                                  />
                                </span>
                                <span className="min-w-0">
                                  <span className="block font-semibold text-neutral-900 text-11px leading-snug">
                                    {item.label}
                                  </span>
                                  <span className="mt-1 block text-neutral-500 text-11px leading-snug">
                                    {item.descripcion}
                                  </span>
                                  <span className="mt-1 flex flex-wrap gap-1 text-11px leading-snug">
                                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-600">
                                      {item.requeridoPor}
                                    </span>
                                    {deadline && (
                                      <span className="rounded bg-sky-50 px-1.5 py-0.5 text-sky-700">
                                        Plazo · {deadline}
                                      </span>
                                    )}
                                    <span
                                      className={`rounded px-1.5 py-0.5 ${item.completado ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                                    >
                                      {item.completado
                                        ? `Folio · ${item.fechaCompletado || "registrado"}`
                                        : deadline
                                          ? "Pendiente"
                                          : "Sin fecha registrada"}
                                    </span>
                                  </span>
                                  {item.completado && (
                                    <span className="mt-1 block text-11px text-neutral-500">
                                      Por:{" "}
                                      {item.registradoPor ||
                                        "Equipo de Convivencia Escolar"}
                                    </span>
                                  )}
                                </span>
                              </div>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
