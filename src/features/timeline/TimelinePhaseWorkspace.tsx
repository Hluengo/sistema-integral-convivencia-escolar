/** @license SPDX-License-Identifier: Apache-2.0 */

import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import type { Causa, FaseProcedimental } from "../../shared/lib/types";
import { getCausaOperationalSummary } from "../causas/causaOperationalSummary";
import SeguimientoPanel from "../causas/seguimiento/SeguimientoPanel";
import ProcesoTab from "./ProcesoTab";

interface TimelinePhaseWorkspaceProps {
  causa: Causa;
  currentFase: string;
  selectedPhase: FaseProcedimental;
  onSelectPhase: (phase: FaseProcedimental | null) => void;
}

const faseOrder: FaseProcedimental[] = [
  "Recepción",
  "Investigación",
  "Resolución",
  "Apelación",
  "Seguimiento",
];

export default function TimelinePhaseWorkspace({
  causa,
  currentFase,
  selectedPhase,
  onSelectPhase,
}: TimelinePhaseWorkspaceProps) {
  const summary = getCausaOperationalSummary(causa);

  return (
    <section id="phase-workspace" className="space-y-3">
      <nav
        aria-label="Ruta del expediente"
        className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-150 bg-white p-1.5 text-xs text-neutral-500 shadow-xs"
      >
        <div className="flex flex-wrap items-center gap-1">
          {faseOrder.map((fase, index) => {
            const progress = summary.phaseProgress.find(
              (item) => item.phase === fase,
            );
            const isComplete = Boolean(
              progress &&
              progress.completed === progress.total &&
              progress.total > 0,
            );
            const isCurrent = fase === selectedPhase;
            const isPast = faseOrder.indexOf(selectedPhase) > index;

            return (
              <span key={fase} className="flex items-center gap-1">
                {index > 0 && (
                  <span className="px-0.5 text-neutral-300">›</span>
                )}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                    isCurrent
                      ? "bg-brand-600 text-white"
                      : isComplete || isPast
                        ? "bg-green-100 text-green-700"
                        : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="size-3" aria-hidden="true" />
                  ) : (
                    <Circle className="size-3" aria-hidden="true" />
                  )}
                  {fase}
                </span>
              </span>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => onSelectPhase(null)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold text-brand-700 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Volver a la ruta
        </button>
      </nav>

      <ProcesoTab
        causa={causa}
        currentFase={currentFase}
        selectedPhase={selectedPhase}
      />

      {selectedPhase === "Seguimiento" && (
        <div className="rounded-xl border border-neutral-150 bg-white p-4 shadow-xs">
          <SeguimientoPanel causa={causa} />
        </div>
      )}
    </section>
  );
}
