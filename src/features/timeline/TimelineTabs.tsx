/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { ListTodo, ClipboardList, Sparkles } from 'lucide-react';

interface TimelineTabsProps {
  activeTab: 'proceso' | 'bitacora' | 'asistente_ia';
  setActiveTab: React.Dispatch<React.SetStateAction<'proceso' | 'bitacora' | 'asistente_ia'>>;
  bitacoraCount: number;
}

export default function TimelineTabs({ activeTab, setActiveTab, bitacoraCount }: TimelineTabsProps) {
  return (
    <div className="flex gap-2.5 border-neutral-200/60 border-b bg-neutral-50/80 p-2.5" role="tablist" aria-label="Secciones del expediente">
      <button
        type="button"
        onClick={() => setActiveTab('proceso')}
        role="tab"
        aria-selected={activeTab === 'proceso'}
        className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2.5 font-semibold text-[12px] transition-all duration-200 ${
          activeTab === 'proceso'
            ? 'bg-brand-600 text-white shadow-brand-600/20 shadow-sm'
            : 'border border-transparent text-neutral-600 hover:border-neutral-200/80 hover:bg-white hover:text-neutral-800'
        }`}
      >
        <ClipboardList className="h-4 w-4 text-brand-500" aria-hidden="true" />
        <span className="hidden sm:inline">Fases y Medidas</span>
        <span className="sm:hidden">Proceso</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('bitacora')}
        role="tab"
        aria-selected={activeTab === 'bitacora'}
        className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2.5 font-semibold text-[12px] transition-all duration-200 ${
          activeTab === 'bitacora'
            ? 'bg-brand-600 text-white shadow-brand-600/20 shadow-sm'
            : 'border border-transparent text-neutral-600 hover:border-neutral-200/80 hover:bg-white hover:text-neutral-800'
        }`}
      >
        <ListTodo className="h-4 w-4 text-brand-500" aria-hidden="true" />
        <span>Bitácora ({bitacoraCount})</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('asistente_ia')}
        role="tab"
        aria-selected={activeTab === 'asistente_ia'}
        className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2.5 font-semibold text-[12px] transition-all duration-200 ${
          activeTab === 'asistente_ia'
            ? 'bg-secondary-500 text-white shadow-secondary-500/20 shadow-sm'
            : 'border border-transparent text-secondary-600 hover:border-secondary-200/80 hover:bg-secondary-50 hover:text-secondary-800'
        }`}
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Asistente Legal</span>
        <span className="sm:hidden">IA</span>
      </button>
    </div>
  );
}
