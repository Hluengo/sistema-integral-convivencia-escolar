/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy, useState, useMemo } from 'react';
import { type Causa, type UserRole } from '@/src/types';
import { getFaseForEstado } from '@/src/data';
import TimelineHeader from './InteractiveTimeline/TimelineHeader';
import TimelineTabs from './InteractiveTimeline/TimelineTabs';
import TimelineTabPanels from './InteractiveTimeline/TimelineTabPanels';
import { useTimelineController } from '@/src/hooks/useTimelineController';
import { TimelineProvider } from '@/src/context/TimelineContext';
import { useAppContext } from '@/src/context/useAppContext';
import ConfirmDialog from './ConfirmDialog';
import MarkdownRenderer from './InteractiveTimeline/MarkdownRenderer';
import { useBreaches } from './InteractiveTimeline/hooks/useBreaches';

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
}: InteractiveTimelineProps) {
  const ctx = useAppContext();
  const onUpdateCausa = propOnUpdate ?? ctx.handleUpdateCausa;
  const onDeleteCausa = propOnDelete ?? ctx.handleDeleteCausa;
  const currentRole = propRole ?? ctx.currentRole;
  const privacyMode = propPrivacy ?? ctx.privacyMode;

  const [activeTab, setActiveTab] = useState<'proceso' | 'bitacora' | 'asistente_ia'>('proceso');
  const [showEdit, setShowEdit] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const timelineValue = useTimelineController({ causa, onUpdateCausa, currentRole, privacyMode });
  const currentFase = getFaseForEstado(causa.estadoActual);
  const breaches = useBreaches(causa);

  return (
    <TimelineProvider value={timelineValue}>
      <div className="card flex h-full animate-flash flex-col overflow-hidden shadow-md">
        <TimelineHeader
          causa={causa}
          currentRole={currentRole}
          privacyMode={privacyMode}
          onEditClick={() => setShowEdit(true)}
          onDeleteClick={() => setShowConfirmDelete(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          isTimelineCollapsed={isTimelineCollapsed}
          setIsTimelineCollapsed={setIsTimelineCollapsed}
          breaches={breaches}
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
        <TimelineTabs activeTab={activeTab} setActiveTab={setActiveTab} bitacoraCount={causa.bitacora.length} />
        <TimelineTabPanels activeTab={activeTab} causa={causa} currentFase={currentFase} CustomMarkdownRenderer={MarkdownRenderer} />
      </div>
    </TimelineProvider>
  );
}