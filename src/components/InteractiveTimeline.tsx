/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy, useState } from 'react';
import type { Causa, FaseProcedimental, UserRole } from '@/src/types';
import { getFaseForEstado } from '@/src/data';
import TimelineHeader from './InteractiveTimeline/TimelineHeader';
import TimelineTabs from './InteractiveTimeline/TimelineTabs';
import TimelineTabPanels from './InteractiveTimeline/TimelineTabPanels';
import { useTimelineController } from '@/src/hooks/useTimelineController';
import { TimelineProvider } from '@/src/context/TimelineContext';
import { useAppContext } from '@/src/context/useAppContext';
import ConfirmDialog from './ConfirmDialog';
import { useBreaches } from './InteractiveTimeline/hooks/useBreaches';
import type { TimelineTab } from '../features/timeline/timelineTabs.types';
import ForceCloseCausaDialog from '../features/causas/ForceCloseCausaDialog';

const EditCausaModal = lazy(() => import('./EditCausaModal'));

interface InteractiveTimelineProps {
  causa: Causa;
  onUpdateCausa?: (updated: Causa) => void;
  onDeleteCausa?: (id: string) => void;
  currentRole?: UserRole;
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
  const privacyMode = propPrivacy ?? ctx.privacyMode;

  const [activeTab, setActiveTab] = useState<TimelineTab>('resumen');
  const [selectedPhase, setSelectedPhase] = useState<FaseProcedimental | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showForceClose, setShowForceClose] = useState(false);

  const timelineValue = useTimelineController({ causa, onUpdateCausa, currentRole, privacyMode });
  const currentFase = getFaseForEstado(causa.estadoActual);
  const breaches = useBreaches(causa);

  return (
    <TimelineProvider value={timelineValue}>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
        <TimelineHeader
          causa={causa}
          currentRole={currentRole}
          privacyMode={privacyMode}
          onEditClick={() => setShowEdit(true)}
          onDeleteClick={() => setShowConfirmDelete(true)}
          onForceCloseClick={() => setShowForceClose(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          isTimelineCollapsed={isTimelineCollapsed}
          setIsTimelineCollapsed={setIsTimelineCollapsed}
          breaches={breaches}
          onClose={onClose}
        />
        <ConfirmDialog
          open={showConfirmDelete}
          title="Eliminar expediente"
          description={`¿Eliminar el expediente ${causa.id} de forma permanente? Esta acción no se puede deshacer.`}
          onConfirm={() => {
            onDeleteCausa(causa.id);
            setShowConfirmDelete(false);
          }}
          onCancel={() => setShowConfirmDelete(false)}
        />
        <ForceCloseCausaDialog
          causa={causa}
          open={showForceClose}
          onOpenChange={setShowForceClose}
          onConfirm={(updated) => {
            onUpdateCausa(updated);
            onClose?.();
          }}
        />
        {showEdit && (
          <Suspense fallback={null}>
            <EditCausaModal
              causa={causa}
              onClose={() => setShowEdit(false)}
              onSave={(updated) => {
                onUpdateCausa(updated);
                setShowEdit(false);
              }}
              onDelete={(id) => {
                onDeleteCausa(id);
                setShowEdit(false);
              }}
            />
          </Suspense>
        )}
        <TimelineTabs activeTab={activeTab} setActiveTab={setActiveTab} causa={causa} />
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
