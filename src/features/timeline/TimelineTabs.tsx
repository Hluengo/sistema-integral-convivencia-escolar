/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { ClipboardList, FileSearch, ListTodo, Sparkles } from 'lucide-react';
import type { Causa, FaseProcedimental } from '../../types';
import { getPhaseProgress } from '../../data';
import { PHASE_TAB_TO_NAME, type TimelineTab } from './timelineTabs';

interface TimelineTabsProps {
  activeTab: TimelineTab;
  setActiveTab: React.Dispatch<React.SetStateAction<TimelineTab>>;
  causa: Causa;
}

export default function TimelineTabs({ activeTab, setActiveTab, causa }: TimelineTabsProps) {
  const tabs: Array<{ id: TimelineTab; label: string; Icon: typeof ClipboardList }> = [
    { id: 'resumen', label: 'Resumen', Icon: FileSearch },
    { id: 'recepción', label: 'Recepción', Icon: ClipboardList },
    { id: 'investigación', label: 'Investigación', Icon: ClipboardList },
    { id: 'resolución', label: 'Resolución', Icon: ClipboardList },
    { id: 'apelación', label: 'Apelación', Icon: ClipboardList },
    { id: 'seguimiento', label: 'Seguimiento', Icon: ClipboardList },
    { id: 'bitacora', label: `Historial (${causa.bitacora.length})`, Icon: ListTodo },
    { id: 'asistente_ia', label: 'Asistente legal', Icon: Sparkles },
  ];

  return (
    <div
      className="border-neutral-100 border-b bg-white px-4 pb-2 sm:px-6"
      role="tablist"
      aria-label="Secciones del expediente"
    >
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-neutral-100/60 p-1">
        {tabs.map(({ id, label, Icon }) => {
          const phase = PHASE_TAB_TO_NAME[id] as FaseProcedimental | undefined;
          const progress = phase ? getPhaseProgress(causa.checklistDebidoProceso, phase) : null;
          const percent =
            progress && progress.total > 0
              ? Math.round((progress.completed / progress.total) * 100)
              : 0;

          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              role="tab"
              aria-selected={activeTab === id}
              className={`relative flex min-w-fit flex-1 flex-col items-stretch justify-center gap-1 overflow-hidden rounded-lg px-3 py-2 font-medium text-xs transition-colors ${
                activeTab === id
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-neutral-500 hover:bg-white/50 hover:text-neutral-700'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
              </span>
              {phase && (
                <span
                  className="h-1 w-full overflow-hidden rounded-full bg-emerald-100"
                  aria-label={`${phase}: ${percent}% completado`}
                >
                  <span
                    className="block h-full rounded-full bg-emerald-500 transition-[width] duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
