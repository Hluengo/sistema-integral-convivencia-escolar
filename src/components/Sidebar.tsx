/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, Scale, Users, FileBarChart,
  ChevronLeft, ChevronRight, AlertTriangle, Menu, X
} from 'lucide-react';

export type SidebarView = 'dashboard' | 'causas' | 'alumnos' | 'informes';

interface SidebarProps {
  currentView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeCount: number;
  aulaSeguraCount: number;
}

interface SidebarContentProps {
  currentView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  isCollapsed: boolean;
  aulaSeguraCount: number;
  activeCount: number;
  mobile?: boolean;
  onNavigate?: () => void;
}

const NAV_ITEMS: { id: SidebarView; label: string; Icon: React.ElementType; badgeKey?: 'activeCount' }[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'causas', label: 'Causas', Icon: Scale, badgeKey: 'activeCount' },
  { id: 'alumnos', label: 'Alumnos', Icon: Users },
  { id: 'informes', label: 'Informes', Icon: FileBarChart },
];

function SidebarContent({
  currentView,
  onViewChange,
  isCollapsed,
  aulaSeguraCount,
  activeCount,
  mobile = false,
  onNavigate,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      <div className={`flex items-center border-b border-white/10 ${isCollapsed && !mobile ? 'justify-center px-3 py-5' : 'gap-3 px-5 py-5'}`}>
        <div className="flex items-center justify-center shrink-0">
          <img src="/veritas2.png" alt="Escudo Veritas" className="h-9 w-auto mix-blend-screen" />
        </div>
        {(!isCollapsed || mobile) && (
          <div className="min-w-0">
            <h1 className="text-[17px] font-bold text-white leading-tight tracking-tight">
              Gestión Debido Proceso
            </h1>
            <p className="text-[9px] font-semibold text-neutral-400 uppercase tracking-[0.12em] leading-tight mt-0.5">
              Convivencia Escolar
            </p>
          </div>
        )}
      </div>

      {aulaSeguraCount > 0 && (!isCollapsed || mobile) && (
        <div className="mx-3 mt-4 px-3.5 py-3 bg-red-500/20 border border-red-400/30 rounded-xl flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-red-500/20 shrink-0">
            <AlertTriangle className="h-3.5 w-3.5 text-red-300" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-red-200 leading-tight">
              {aulaSeguraCount} alerta{aulaSeguraCount !== 1 ? 's' : ''} crítica{aulaSeguraCount !== 1 ? 's' : ''}
            </p>
            <p className="text-[9px] text-red-300/70 font-medium leading-tight mt-0.5">
              Ley Aula Segura · Acción urgente
            </p>
          </div>
        </div>
      )}

      {aulaSeguraCount > 0 && isCollapsed && !mobile && (
        <div className="flex justify-center mt-4">
          <div className="h-2 w-2 rounded-full bg-red-400 ring-2 ring-red-400/30 animate-pulse" aria-hidden="true" />
        </div>
      )}

      {(!isCollapsed || mobile) && (
        <div className="px-5 pt-5 pb-2">
          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-[0.15em]">
            Navegación
          </span>
        </div>
      )}

      <nav
        className={`flex-1 ${isCollapsed && !mobile ? 'py-4 px-2' : 'px-3'} space-y-0.5`}
        aria-label="Secciones principales"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = currentView === item.id;
          const badge = item.badgeKey === 'activeCount' ? activeCount : undefined;
          const Icon = item.Icon;

          return (
            <button
              type="button"
              key={item.id}
              onClick={() => {
                onViewChange(item.id);
                onNavigate?.();
              }}
              className={`w-full flex items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-200 cursor-pointer select-none
                ${isCollapsed && !mobile ? 'justify-center px-0 py-3' : 'px-3.5 py-2.5'}
                ${isActive
                  ? 'bg-white/15 text-white font-semibold shadow-sm ring-1 ring-white/20'
                  : 'text-neutral-400 hover:bg-white/8 hover:text-white/90'
                }`}
              aria-current={isActive ? 'page' : undefined}
              title={isCollapsed && !mobile ? item.label : undefined}
            >
              <span className={`shrink-0 transition-colors ${isActive ? 'text-white' : 'text-neutral-400'}`}>
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              {(!isCollapsed || mobile) && (
                <>
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
                      isActive ? 'bg-white/25 text-white' : 'bg-orange-500 text-white'
                    }`}>
                      {badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default function Sidebar({ 
  currentView, 
  onViewChange, 
  isCollapsed, 
  onToggleCollapse,
  activeCount,
  aulaSeguraCount
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileSidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    const firstFocusable = mobileSidebarRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    firstFocusable?.focus();
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileOpen]);

  const contentProps: SidebarContentProps = {
    currentView,
    onViewChange,
    isCollapsed,
    aulaSeguraCount,
    activeCount,
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-neutral-800 text-white rounded-xl shadow-lg hover:bg-neutral-900 transition-colors"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm cursor-default"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      <div ref={mobileSidebarRef} className={`lg:hidden fixed inset-y-0 left-0 z-50 w-[260px] bg-gradient-to-b from-neutral-800 to-neutral-950 transition-transform duration-300 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
          aria-label="Cerrar menú"
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarContent {...contentProps} mobile onNavigate={() => setMobileOpen(false)} />
      </div>

      <aside
        className={`hidden lg:flex flex-col bg-gradient-to-b from-neutral-800 to-neutral-950 transition-all duration-300 relative shrink-0 shadow-xl ${
          isCollapsed ? 'w-[68px]' : 'w-[240px]'
        }`}
        aria-label="Barra de navegación principal"
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          className="absolute -right-3 top-[72px] z-10 bg-white border border-neutral-200 rounded-full p-1.5 shadow-md hover:bg-neutral-50 hover:shadow-lg transition-all cursor-pointer"
          aria-label={isCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 text-neutral-600" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-neutral-600" />
          )}
        </button>
        <SidebarContent {...contentProps} />
      </aside>
    </>
  );
}
