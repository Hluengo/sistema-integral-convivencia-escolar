/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Causa, UserRole } from '../../types';
import { ListTodo, ClipboardList, Sparkles } from 'lucide-react';

interface TimelineTabsProps {
  activeTab: 'proceso' | 'bitacora' | 'asistente_ia';
  setActiveTab: React.Dispatch<React.SetStateAction<'proceso' | 'bitacora' | 'asistente_ia'>>;
  bitacoraCount: number;
}

export default function TimelineTabs({ activeTab, setActiveTab, bitacoraCount }: TimelineTabsProps) {
  return (
    <div className="flex border-b border-neutral-200/60 bg-neutral-50/80 p-2.5 gap-2.5" role="tablist" aria-label="Secciones del expediente">
      <button
        type="button"
        onClick={() => setActiveTab('proceso')}
        role="tab"
        aria-selected={activeTab === 'proceso'}
        className={`flex-1 py-2.5 px-3 text-[12px] font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
          activeTab === 'proceso'
            ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20'
            : 'text-neutral-600 hover:text-neutral-800 hover:bg-white border border-transparent hover:border-neutral-200/80'
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
        className={`flex-1 py-2.5 px-3 text-[12px] font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
          activeTab === 'bitacora'
            ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20'
            : 'text-neutral-600 hover:text-neutral-800 hover:bg-white border border-transparent hover:border-neutral-200/80'
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
        className={`flex-1 py-2.5 px-3 text-[12px] font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
          activeTab === 'asistente_ia'
            ? 'bg-secondary-500 text-white shadow-sm shadow-secondary-500/20'
            : 'text-secondary-600 hover:text-secondary-800 hover:bg-secondary-50 border border-transparent hover:border-secondary-200/80'
        }`}
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Asistente IA</span>
        <span className="sm:hidden">IA</span>
      </button>
    </div>
  );
}
