/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import type { Causa, FaseProcedimental, UserRole } from "@/shared/lib/types";
import { getCausaOperationalPhase } from "../causas/causaOperationalSummary";
import TimelineHeader from "./TimelineHeader";
import TimelineTabs from "./TimelineTabs";
import TimelineTabPanels from "./TimelineTabPanels";
import { useTimelineController } from "@/shared/lib/hooks/useTimelineController";
import { TimelineProvider } from "@/shared/lib/TimelineContext";
import { useAppContext } from "@/shared/lib/useAppContext";
import { useBreaches } from "./hooks/useBreaches";
import type { TimelineTab } from "./timelineTabs.types";
import TimelineOverlays from "./TimelineOverlays";
import IncidentePanel from "./IncidentePanel";

interface InteractiveTimelineProps {
  causa: Causa;
  onUpdateCausa?: (updated: Causa) => void;
  onDeleteCausa?: (id: string) => Promise<boolean>;
  currentRole?: UserRole;
  canDeleteCausa?: boolean;
  privacyMode?: boolean;
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean) => void;
  isTimelineCollapsed?: boolean;
  setIsTimelineCollapsed?: (collapsed: boolean) => void;
  onClose?: () => void;
  saveStatus?: "idle" | "saving" | "saved" | "error";
  onRetrySave?: () => void;
}

export default function InteractiveTimeline({
  causa,
  onUpdateCausa: propOnUpdate,
  onDeleteCausa: propOnDelete,
  currentRole: propRole,
  canDeleteCausa: propCanDelete,
  privacyMode: propPrivacy,
  isSidebarCollapsed = false,
  setIsSidebarCollapsed,
  isTimelineCollapsed = false,
  setIsTimelineCollapsed,
  onClose,
  saveStatus: propSaveStatus,
  onRetrySave: propOnRetrySave,
}: InteractiveTimelineProps) {
  const ctx = useAppContext();
  const saveStatus = propSaveStatus ?? ctx.saveStatus;
  const onRetrySave = propOnRetrySave ?? ctx.requestSaveRetry;
  const onUpdateCausa = propOnUpdate ?? ctx.handleUpdateCausa;
  const onDeleteCausa = propOnDelete ?? ctx.handleDeleteCausa;
  const currentRole = propRole ?? ctx.currentRole;
  const canDeleteCausa = propCanDelete ?? ctx.canDeleteCausa;
  const privacyMode = propPrivacy ?? ctx.privacyMode;

  const [activeTab, setActiveTab] = useState<TimelineTab>("resumen");
  const [selectedPhase, setSelectedPhase] = useState<FaseProcedimental | null>(
    null,
  );
  const [showEdit, setShowEdit] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showForceClose, setShowForceClose] = useState(false);

  const timelineValue = useTimelineController({
    causa,
    onUpdateCausa,
    currentRole,
    privacyMode,
  });
  const currentFase = getCausaOperationalPhase(causa);
  const breaches = useBreaches(causa);

  return (
    <TimelineProvider value={timelineValue}>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F8FAFC] text-slate-800 antialiased">
        <TimelineHeader
          causa={causa}
          currentRole={currentRole}
          privacyMode={privacyMode}
          onEditClick={() => setShowEdit(true)}
          onDeleteClick={() => setShowConfirmDelete(true)}
          canDelete={canDeleteCausa}
          onForceCloseClick={() => setShowForceClose(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          isTimelineCollapsed={isTimelineCollapsed}
          setIsTimelineCollapsed={setIsTimelineCollapsed}
          breaches={breaches}
          onClose={onClose}
          saveStatus={saveStatus}
          onRetrySave={onRetrySave}
        />
        <TimelineOverlays
          causa={causa}
          showEdit={showEdit}
          showConfirmDelete={showConfirmDelete}
          showForceClose={showForceClose}
          onShowEdit={setShowEdit}
          onShowConfirmDelete={setShowConfirmDelete}
          onShowForceClose={setShowForceClose}
          onUpdateCausa={onUpdateCausa}
          onDeleteCausa={onDeleteCausa}
          onClose={onClose}
        />
        {causa.incidenteId && (
          <IncidentePanel causa={causa} privacyMode={privacyMode} />
        )}
        <TimelineTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          causa={causa}
        />
        <TimelineTabPanels
          activeTab={activeTab}
          causa={causa}
          currentFase={currentFase}
          breaches={breaches}
          selectedPhase={selectedPhase}
          onSelectPhase={setSelectedPhase}
          onRegisterHito={() => {
            setActiveTab("ruta");
            setSelectedPhase(currentFase);
          }}
          onOpenHistory={() => setActiveTab("bitacora")}
        />
        <footer className="flex flex-col items-center justify-between gap-2 border-slate-200 border-t bg-white/70 px-8 py-4 text-xs text-slate-600 sm:flex-row">
          <span>Sistema Integral de Gestión de Convivencia Escolar · v3.4</span>
          <span className="font-mono text-[11px]">
            Expediente auditado bajo normativa de confidencialidad legal
          </span>
        </footer>
      </div>
    </TimelineProvider>
  );
}
