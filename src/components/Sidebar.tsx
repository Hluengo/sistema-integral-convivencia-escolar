/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Scale, Sparkles, Shield, FileText, CheckCircle2, 
  ChevronLeft, ChevronRight, Clock, AlertTriangle, 
  BarChart3, Archive
} from 'lucide-react';

export type SidebarView = 'dashboard' | 'casos_activos' | 'casos_cerrados' | 'advisor';

interface SidebarProps {
  currentView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeCount: number;
  closedCount: number;
  aulaSeguraCount: number;
}

export default function Sidebar({ 
  currentView, 
  onViewChange, 
  isCollapsed, 
  onToggleCollapse,
  activeCount,
  closedCount,
  aulaSeguraCount
}: SidebarProps) {
  const navItems: { id: SidebarView; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string }[] = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: <BarChart3 className="h-4 w-4" aria-hidden="true" /> 
    },
    { 
      id: 'casos_activos', 
      label: 'Casos Activos', 
      icon: <Scale className="h-4 w-4" aria-hidden="true" />,
      badge: activeCount,
      badgeColor: 'bg-brand-600'
    },
    { 
      id: 'casos_cerrados', 
      label: 'Casos Cerrados', 
      icon: <Archive className="h-4 w-4" aria-hidden="true" />,
      badge: closedCount,
      badgeColor: 'bg-neutral-500'
    },
    { 
      id: 'advisor', 
      label: 'Consultor IA', 
      icon: <Sparkles className="h-4 w-4" aria-hidden="true" /> 
    },
  ];

  return (
    <aside
      className={`bg-white border-r border-neutral-200/80 shadow-sm flex flex-col transition-all duration-300 relative ${
        isCollapsed ? 'w-[52px]' : 'w-[220px]'
      } shrink-0`}
      aria-label="Barra de navegación principal"
    >
      {/* Toggle button */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-6 z-10 bg-white border border-neutral-200 rounded-full p-1 shadow-sm hover:bg-neutral-50 transition-all cursor-pointer"
        aria-label={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-neutral-500" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5 text-neutral-500" />
        )}
      </button>

      {/* Logo area */}
      <div className={`border-b border-neutral-100 px-3 py-4 ${isCollapsed ? 'text-center' : ''}`}>
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-brand-600 to-brand-800 text-white p-1.5 rounded-lg flex items-center justify-center shadow-sm shrink-0">
            <Shield className="h-4 w-4 text-brand-100" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="text-[11px] font-bold text-neutral-900 leading-tight tracking-tight truncate">
                Debido Proceso
              </h1>
              <p className="text-[7px] font-semibold text-neutral-400 uppercase leading-tight truncate">
                Convivencia Escolar
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Aula Segura alert badge */}
      {aulaSeguraCount > 0 && !isCollapsed && (
        <div className="mx-2 mt-2 px-2.5 py-1.5 bg-danger-50 border border-danger-200 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-3 w-3 text-danger-600 shrink-0" />
          <span className="text-[9px] font-semibold text-danger-700">
            {aulaSeguraCount} con Aula Segura
          </span>
        </div>
      )}

      {/* Navigation items */}
      <nav className="flex-1 py-3 px-1.5 space-y-1" role="navigation" aria-label="Secciones principales">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer select-none ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800'
              }`}
              aria-current={isActive ? 'page' : undefined}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white ${item.badgeColor || 'bg-brand-600'}`}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom status */}
      {!isCollapsed && (
        <div className="border-t border-neutral-100 p-3">
          <div className="flex items-center gap-2 text-[9px] text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-full bg-success-500 shrink-0" />
            <span>Sistema activo</span>
          </div>
        </div>
      )}
    </aside>
  );
}