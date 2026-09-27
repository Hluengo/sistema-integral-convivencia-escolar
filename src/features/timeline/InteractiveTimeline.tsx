/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { ChevronRight, Clock3, Home } from "lucide-react";
import type { Causa, FaseProcedimental, UserRole } from "@/shared/lib/types";
import {
  getCausaOperationalPhase,
  getCausaOperationalSummary,
} from "../causas/causaOperationalSummary";
import { getCausaStatus } from "../causas/causaPresentation";
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
  const operationalSummary = getCausaOperationalSummary(causa);

  return (
    <TimelineProvider value={timelineValue}>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50">
        <nav
          aria-label="Navegación del expediente"
          className="flex min-h-11 items-center justify-between gap-3 border-neutral-200 border-b bg-white px-4 py-2 text-xs sm:px-6"
        >
          <div className="flex min-w-0 items-center gap-1.5 text-neutral-500">
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 font-semibold text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
              >
                <Home className="size-3.5" aria-hidden="true" />
                Casos
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 font-semibold text-neutral-500">
                <Home className="size-3.5" aria-hidden="true" />
                Casos
              </span>
            )}
            <ChevronRight
              className="size-3.5 shrink-0 text-neutral-300"
              aria-hidden="true"
            />
            <span className="truncate font-medium text-neutral-700">
              Expediente {causa.id}
            </span>
          </div>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 font-semibold text-brand-800 sm:inline-flex">
            <Clock3 className="size-3.5" aria-hidden="true" />
            {getCausaStatus(causa)} · {operationalSummary.currentPhase}
          </span>
        </nav>
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
