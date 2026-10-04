/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import type { Causa, FaseProcedimental } from "../../shared/lib/types";
import { Download, NotebookPen } from "lucide-react";
import BitacoraTab from "./BitacoraTab";
import ExpedienteHistoryPanel from "../causas/expediente/ExpedienteHistoryPanel";
import ResumenTab from "./ResumenTab";
import RutaYoloView from "./RutaYoloView";
import type { TimelineTab } from "./timelineTabs.types";
import { DetailModalBody } from "../../shared/ui/DetailModal";

interface TimelineTabPanelsProps {
  activeTab: TimelineTab;
  causa: Causa;
  currentFase: string;
  breaches: string[];
  selectedPhase: FaseProcedimental | null;
  onSelectPhase: (phase: FaseProcedimental | null) => void;
  onRegisterHito: () => void;
}

export default function TimelineTabPanels({
  activeTab,
  causa,
  currentFase,
  breaches,
  selectedPhase,
  onSelectPhase,
  onRegisterHito,
}: TimelineTabPanelsProps) {
  const [manualFormOpen, setManualFormOpen] = useState(false);
  return (
    <DetailModalBody
      activeTabId={activeTab}
      className="space-y-3 bg-[#F8FAFC] p-3 sm:p-4"
    >
      {activeTab === "resumen" && (
        <ResumenTab
          causa={causa}
          breaches={breaches}
          onRegisterHito={onRegisterHito}
        />
      )}

      {activeTab === "ruta" && (
        <RutaYoloView
          causa={causa}
          currentFase={currentFase}
          selectedPhase={selectedPhase}
          onSelectPhase={onSelectPhase}
        />
      )}

      {activeTab === "bitacora" && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_500px]">
          <ExpedienteHistoryPanel causa={causa} />
          <aside aria-label="Registro manual" className="lg:sticky lg:top-0">
            <div className="rounded-xl border border-neutral-150 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start gap-2.5">
                <span
                  className="rounded-lg bg-brand-100 p-1.5 text-brand-700"
                  aria-hidden="true"
                >
                  <NotebookPen className="size-4" />
                </span>
                <div>
                  <h3 className="font-semibold text-neutral-900 text-sm">
                    Registro manual
                  </h3>
                  <p className="mt-0.5 text-neutral-600 text-xs">
                    Registra una comunicación en la cronología.
                  </p>
                </div>
              </div>
              <BitacoraTab
                causa={causa}
                showChronology={false}
                manualFormOpen={manualFormOpen}
                onManualFormOpenChange={setManualFormOpen}
              />
            </div>
            <button
              type="button"
              disabled
              title="La descarga ZIP se habilitará al integrar el visor documental"
              className="mt-3 flex min-h-10 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-neutral-400 text-xs font-semibold"
            >
              <Download className="size-4" aria-hidden="true" />
              Descargar expediente ZIP
            </button>
          </aside>
        </div>
      )}
    </DetailModalBody>
  );
}
