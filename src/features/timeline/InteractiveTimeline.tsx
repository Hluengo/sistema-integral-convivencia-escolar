/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy, useState } from 'react';
import type { Causa, FaseProcedimental, UserRole } from '@/shared/lib/types';
import { getFaseForEstado } from '@/shared/lib/data';
import TimelineHeader from './TimelineHeader';
import TimelineTabs from './TimelineTabs';
import TimelineTabPanels from './TimelineTabPanels';
import { useTimelineController } from '@/shared/lib/hooks/useTimelineController';
import { TimelineProvider } from '@/shared/lib/TimelineContext';
import { useAppContext } from '@/shared/lib/useAppContext';
import ConfirmDialog from '../../shared/ConfirmDialog';
import { useBreaches } from './hooks/useBreaches';
import type { TimelineTab } from './timelineTabs.types';
import ForceCloseCausaDialog from '../causas/ForceCloseCausaDialog';
import { TimelineEditSkeleton } from '../../shared/Skeleton';

const EditCausaModal = lazy(() => import('../causas/ui/EditCausaModal'));

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
          canDelete={canDeleteCausa}
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
          onConfirm={async () => {
            const deleted = await onDeleteCausa(causa.id);
            setShowConfirmDelete(false);
            if (deleted) onClose?.();
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
          <Suspense fallback={<TimelineEditSkeleton />}>
            <EditCausaModal
              causa={causa}
              onClose={() => setShowEdit(false)}
              onSave={(updated) => {
                onUpdateCausa(updated);
                setShowEdit(false);
              }}
              onDelete={async (id) => {
                const deleted = await onDeleteCausa(id);
                if (deleted) {
                  setShowEdit(false);
                  onClose?.();
                }
                return deleted;
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
