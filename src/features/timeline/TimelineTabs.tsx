/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { FileSearch, History, Route, Sparkles } from 'lucide-react';
import type { Causa } from '../../types';
import type { TimelineTab } from './timelineTabs';
import { DetailModalTabs, type DetailModalTab } from '../../shared/ui/DetailModal';

interface TimelineTabsProps {
  activeTab: TimelineTab;
  setActiveTab: React.Dispatch<React.SetStateAction<TimelineTab>>;
  causa: Causa;
}

export default function TimelineTabs({ activeTab, setActiveTab, causa }: TimelineTabsProps) {
  const tabDefinitions: Array<{ id: TimelineTab; label: string; Icon: typeof FileSearch }> = [
    { id: 'resumen', label: 'Resumen', Icon: FileSearch },
    { id: 'ruta', label: 'Ruta del expediente', Icon: Route },
    { id: 'bitacora', label: `Historial (${causa.bitacora.length})`, Icon: History },
    { id: 'asistente_ia', label: 'Asistente legal', Icon: Sparkles },
  ];

  const tabs: DetailModalTab<TimelineTab>[] = tabDefinitions.map(({ id, label, Icon }) => ({
    id,
    label,
    icon: <Icon className="size-3.5" aria-hidden="true" />,
  }));

  return (
    <DetailModalTabs
      activeTab={activeTab}
      ariaLabel="Secciones del expediente"
      onChange={setActiveTab}
      tabs={tabs}
    />
  );
}
