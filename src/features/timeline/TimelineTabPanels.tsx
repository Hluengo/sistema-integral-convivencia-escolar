/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Causa, FaseProcedimental } from "../../shared/lib/types";
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
  onOpenHistory: () => void;
}

export default function TimelineTabPanels({
  activeTab,
  causa,
  currentFase,
  breaches,
  selectedPhase,
  onSelectPhase,
  onRegisterHito,
  onOpenHistory,
}: TimelineTabPanelsProps) {
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
          onOpenHistory={onOpenHistory}
        />
      )}

      {activeTab === "bitacora" && (
        <div className="space-y-6">
          <ExpedienteHistoryPanel causa={causa} />
          <BitacoraTab causa={causa} showChronology={false} />
        </div>
      )}
    </DetailModalBody>
  );
}
