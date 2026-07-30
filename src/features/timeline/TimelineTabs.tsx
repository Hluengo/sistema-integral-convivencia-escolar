/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { ClipboardList, FileSearch, ListTodo, Sparkles } from 'lucide-react';
import type { Causa, FaseProcedimental } from '../../types';
import { getPhaseProgress } from '../../data';
import { PHASE_TAB_TO_NAME, type TimelineTab } from './timelineTabs';
import { DetailModalTabs, type DetailModalTab } from '../../shared/ui/DetailModal';

interface TimelineTabsProps {
  activeTab: TimelineTab;
  setActiveTab: React.Dispatch<React.SetStateAction<TimelineTab>>;
  causa: Causa;
}

export default function TimelineTabs({ activeTab, setActiveTab, causa }: TimelineTabsProps) {
  const tabDefinitions: Array<{ id: TimelineTab; label: string; Icon: typeof ClipboardList }> = [
    { id: 'resumen', label: 'Resumen', Icon: FileSearch },
    { id: 'recepción', label: 'Recepción', Icon: ClipboardList },
    { id: 'investigación', label: 'Investigación', Icon: ClipboardList },
    { id: 'resolución', label: 'Resolución', Icon: ClipboardList },
    { id: 'apelación', label: 'Apelación', Icon: ClipboardList },
    { id: 'seguimiento', label: 'Seguimiento', Icon: ClipboardList },
    { id: 'bitacora', label: `Historial (${causa.bitacora.length})`, Icon: ListTodo },
    { id: 'asistente_ia', label: 'Asistente legal', Icon: Sparkles },
  ];

  const tabs: DetailModalTab<TimelineTab>[] = tabDefinitions.map(({ id, label, Icon }) => {
    const phase = PHASE_TAB_TO_NAME[id] as FaseProcedimental | undefined;
    const progress = phase ? getPhaseProgress(causa.checklistDebidoProceso, phase) : null;
    const percent =
      progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

    return {
      id,
      label,
      icon: <Icon className="size-3.5" aria-hidden="true" />,
      indicator: phase ? (
        <span
          className="h-1 w-full overflow-hidden rounded-full bg-emerald-100"
          aria-label={`${phase}: ${percent}% completado`}
        >
          <span
            className="block h-full rounded-full bg-emerald-500 transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </span>
      ) : undefined,
    };
  });

  return (
    <DetailModalTabs
      activeTab={activeTab}
      ariaLabel="Secciones del expediente"
      onChange={setActiveTab}
      tabs={tabs}
    />
  );
}
