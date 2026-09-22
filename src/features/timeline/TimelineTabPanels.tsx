/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Causa, FaseProcedimental } from "../../shared/lib/types";
import BitacoraTab from "./BitacoraTab";
import ResumenTab from "./ResumenTab";
import RutaExpedienteTab from "./RutaExpedienteTab";
import CausaExpedienteTab from "../causas/expediente/CausaExpedienteTab";
import TimelinePhaseWorkspace from "./TimelinePhaseWorkspace";
import { useTimelineContext } from "../../shared/lib/useTimelineContext";
import type { TimelineTab } from "./timelineTabs.types";
import { DetailModalBody } from "../../shared/ui/DetailModal";

interface TimelineTabPanelsProps {
  activeTab: TimelineTab;
  causa: Causa;
  currentFase: string;
  breaches: string[];
  selectedPhase: FaseProcedimental | null;
  onSelectPhase: (phase: FaseProcedimental | null) => void;
}

export default function TimelineTabPanels({
  activeTab,
  causa,
  currentFase,
  breaches,
  selectedPhase,
  onSelectPhase,
}: TimelineTabPanelsProps) {
  const ctx = useTimelineContext();
  return (
    <DetailModalBody
      activeTabId={activeTab}
      className="space-y-4 bg-neutral-50"
    >
      {activeTab === "resumen" && (
        <ResumenTab
          causa={causa}
          breaches={breaches}
          privacyMode={ctx.privacyMode}
        />
      )}

      {activeTab === "ruta" &&
        (selectedPhase ? (
          <TimelinePhaseWorkspace
            causa={causa}
            currentFase={currentFase}
            selectedPhase={selectedPhase}
            onSelectPhase={onSelectPhase}
          />
        ) : (
          <RutaExpedienteTab
            causa={causa}
            selectedPhase={selectedPhase}
            onSelectPhase={onSelectPhase}
          />
        ))}

      {activeTab === "bitacora" && <BitacoraTab causa={causa} />}

      {activeTab === "expediente" && <CausaExpedienteTab causa={causa} />}
    </DetailModalBody>
  );
}
