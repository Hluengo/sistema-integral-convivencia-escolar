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
}: InteractiveTimelineProps) {
  const ctx = useAppContext();
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
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50">
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
        />
      </div>
    </TimelineProvider>
  );
}
