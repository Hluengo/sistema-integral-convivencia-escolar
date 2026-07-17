/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useState, useRef, useEffect, memo } from 'react';
import {
  LayoutDashboard,
  Scale,
  Users,
  FileBarChart,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { SidebarUserMenu, SidebarAulaSeguraAlert } from './SidebarUserMenu';

export type SidebarView = 'dashboard' | 'causas' | 'alumnos' | 'informes' | 'anotaciones';

interface SidebarProps {
  currentView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeCount: number;
  aulaSeguraCount: number;
  user: SupabaseUser | null;
  onLogin?: () => void;
  onLogout?: () => void;
}

interface SidebarContentProps {
  currentView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  isCollapsed: boolean;
  aulaSeguraCount: number;
  activeCount: number;
  mobile?: boolean;
  onNavigate?: () => void;
  user: SupabaseUser | null;
  onLogin?: () => void;
  onLogout?: () => void;
}

const NAV_ITEMS: {
  id: SidebarView;
  label: string;
  Icon: React.ElementType;
  badgeKey?: 'activeCount';
}[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'causas', label: 'Causas', Icon: Scale, badgeKey: 'activeCount' },
  { id: 'alumnos', label: 'Estudiantes', Icon: Users },
  { id: 'informes', label: 'Asistente IA', Icon: FileBarChart },
  { id: 'anotaciones', label: 'Anotaciones', Icon: ClipboardList },
];

function SidebarContent({
  currentView,
  onViewChange,
  isCollapsed,
  aulaSeguraCount,
  activeCount,
  mobile = false,
  onNavigate,
  user,
  onLogin,
  onLogout,
}: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      <div
        className={`flex items-center border-white/10 border-b ${isCollapsed && !mobile ? 'justify-center px-3 py-5' : 'gap-3 px-5 py-5'}`}
      >
        <div className="flex shrink-0 items-center justify-center">
          <img src="/veritas2.webp" alt="Escudo Veritas" className="h-9 w-auto mix-blend-screen" />
        </div>
        {(!isCollapsed || mobile) && (
          <div className="min-w-0">
            <h1 className="font-bold text-[17px] text-white leading-tight tracking-tight">
              Gestión Debido Proceso
            </h1>
            <p className="mt-0.5 font-semibold text-[10px] text-neutral-400 uppercase leading-tight tracking-[0.12em]">
              Convivencia Escolar
            </p>
          </div>
        )}
      </div>

      <SidebarUserMenu user={user} isCollapsed={isCollapsed} mobile={mobile} onLogin={onLogin} onLogout={onLogout} />

      <SidebarAulaSeguraAlert count={aulaSeguraCount} isCollapsed={isCollapsed} mobile={mobile} />

      {(!isCollapsed || mobile) && (
        <div className="px-5 pt-5 pb-2">
          <span className="font-bold text-[10px] text-neutral-500 uppercase tracking-[0.15em]">
            Navegación
          </span>
        </div>
      )}

      <nav
        className={`flex-1 ${isCollapsed && !mobile ? 'px-2 py-4' : 'px-3'} space-y-1`}
        aria-label="Secciones principales"
      >
        {NAV_ITEMS.filter((item) => user || item.id === 'dashboard').map((item) => {
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
              className={`flex w-full cursor-pointer select-none items-center gap-3 rounded-lg font-medium text-[13px] transition-all duration-150 ${isCollapsed && !mobile ? 'justify-center px-0 py-3' : 'px-3.5 py-2.5'}
                ${
                  isActive
                    ? 'bg-white/15 font-semibold text-white'
                    : 'text-neutral-400 hover:bg-white/8 hover:text-white/90'
                }`}
              style={isActive && !isCollapsed ? { boxShadow: 'inset 3px 0 0 0 white' } : undefined}
              aria-current={isActive ? 'page' : undefined}
              title={isCollapsed && !mobile ? item.label : undefined}
            >
              <span
                className={`shrink-0 transition-colors ${isActive ? 'text-white' : 'text-neutral-400'}`}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              {(!isCollapsed || mobile) && (
                <>
                  <span className="flex-1 truncate text-left">{item.label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 font-bold text-[10px] tabular-nums ${
                        isActive ? 'bg-white/25 text-white' : 'bg-orange-500 text-white'
                      }`}
                    >
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

export default memo(function Sidebar({
  currentView,
  onViewChange,
  isCollapsed,
  onToggleCollapse,
  activeCount,
  aulaSeguraCount,
  user,
  onLogin,
  onLogout,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileSidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    const firstFocusable = mobileSidebarRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileOpen]);

  const contentProps: SidebarContentProps = {
    currentView,
    onViewChange,
    isCollapsed,
    aulaSeguraCount,
    activeCount,
    user,
    onLogin,
    onLogout,
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 rounded-xl bg-neutral-900 p-2.5 text-white shadow-lg shadow-neutral-900/20 transition-all hover:bg-neutral-800 active:scale-95 lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      <div
        ref={mobileSidebarRef}
        className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-gradient-to-b from-neutral-900 to-neutral-950 shadow-2xl shadow-neutral-950/50 transition-transform duration-300 ease-out-expo lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-white/40 transition-all hover:bg-white/10 hover:text-white"
          aria-label="Cerrar menú"
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarContent {...contentProps} mobile onNavigate={() => setMobileOpen(false)} />
      </div>

      <aside
        className={`relative hidden shrink-0 flex-col bg-gradient-to-b from-neutral-900 to-neutral-950 shadow-2xl shadow-neutral-950/30 transition-all duration-300 ease-out-expo lg:flex ${
          isCollapsed ? 'w-[68px]' : 'w-[240px]'
        }`}
        aria-label="Barra de navegación principal"
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          className="absolute top-[72px] -right-3 z-10 cursor-pointer rounded-full border border-neutral-200/80 bg-white p-1.5 shadow-md transition-all hover:bg-neutral-50 hover:shadow-lg active:scale-90"
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
});
