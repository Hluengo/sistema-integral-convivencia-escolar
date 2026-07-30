/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { ClipboardList, FileSearch, ListTodo, Sparkles } from 'lucide-react';
import type { TimelineTab } from './timelineTabs';

interface TimelineTabsProps {
  activeTab: TimelineTab;
  setActiveTab: React.Dispatch<React.SetStateAction<TimelineTab>>;
  bitacoraCount: number;
}

export default function TimelineTabs({
  activeTab,
  setActiveTab,
  bitacoraCount,
}: TimelineTabsProps) {
  const tabs: Array<{ id: TimelineTab; label: string; Icon: typeof ClipboardList }> = [
    { id: 'resumen', label: 'Resumen', Icon: FileSearch },
    { id: 'recepción', label: 'Recepción', Icon: ClipboardList },
    { id: 'investigación', label: 'Investigación', Icon: ClipboardList },
    { id: 'resolución', label: 'Resolución', Icon: ClipboardList },
    { id: 'apelación', label: 'Apelación', Icon: ClipboardList },
    { id: 'seguimiento', label: 'Seguimiento', Icon: ClipboardList },
    { id: 'bitacora', label: `Bitácora (${bitacoraCount})`, Icon: ListTodo },
    { id: 'asistente_ia', label: 'Asistente legal', Icon: Sparkles },
  ];

  return (
    <div
      className="flex flex-wrap gap-1.5 border-neutral-200/60 border-b bg-neutral-50/80 p-2.5"
      role="tablist"
      aria-label="Secciones del expediente"
    >
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setActiveTab(id)}
          role="tab"
          aria-selected={activeTab === id}
          className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-semibold text-xs transition-colors ${
            activeTab === id
              ? id === 'asistente_ia'
                ? 'bg-secondary-500 text-white shadow-sm'
                : 'bg-brand-600 text-white shadow-sm'
              : 'border border-transparent text-neutral-600 hover:border-neutral-200 hover:bg-white'
          }`}
        >
          <Icon className="size-3.5" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
