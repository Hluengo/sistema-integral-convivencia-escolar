/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Bell, Shield, Eye, EyeOff, Cloud, CloudOff, Loader2 } from 'lucide-react';
import type { SidebarView } from './Sidebar';

const VIEW_TITLES: Record<SidebarView, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Panel de control ejecutivo' },
  causas: { title: 'Causas', subtitle: 'Expedientes y procedimientos activos' },
  alumnos: { title: 'Alumnos', subtitle: 'Gestión de estudiantes' },
  informes: { title: 'Informes', subtitle: 'Asistente y reportes' },
};

const NOTIFICATIONS = [
  { id: 1, title: 'Alerta Aula Segura', description: 'Causa DC-2026-001 requiere resolución en 24h', time: 'Hace 2 horas', urgent: true },
  { id: 2, title: 'Nueva causa creada', description: 'Causa DC-2026-004 asignada a Inspector', time: 'Hace 5 horas', urgent: false },
  { id: 3, title: 'Plazo próximo a vencer', description: 'Investigación de causa DC-2026-002 vence mañana', time: 'Hace 8 horas', urgent: true },
];

interface HeaderProps {
  privacyMode: boolean;
  setPrivacyMode: (val: boolean) => void;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  currentView?: SidebarView;
}

export default function Header({
  privacyMode, 
  setPrivacyMode, 
  saveStatus = 'idle', 
  searchQuery = '',
  onSearchChange,
  currentView = 'dashboard',
}: HeaderProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const viewMeta = VIEW_TITLES[currentView];

  return (
    <header className="sticky top-0 z-30 glass" aria-label="Encabezado principal">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-700 via-brand-600 to-secondary-500" />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand (mobile) + Page title + Search */}
        <div className="flex items-center gap-4 flex-1 min-w-0 pl-10 lg:pl-0">
          {/* Mobile brand */}
          <div className="flex lg:hidden items-center gap-2 shrink-0">
            <div className="h-8 w-8 rounded-lg bg-brand-700 flex items-center justify-center shadow-sm">
              <Shield className="h-4 w-4 text-white" aria-hidden="true" />
            </div>
          </div>

          {/* Page title - visible on tablet+ */}
          <div className="hidden sm:block shrink-0 min-w-0">
            <h1 className="text-sm font-bold text-neutral-900 leading-tight truncate">{viewMeta.title}</h1>
            <p className="text-[10px] text-neutral-400 font-medium truncate">{viewMeta.subtitle}</p>
          </div>

          <div className="hidden sm:block w-px h-8 bg-neutral-200 shrink-0" aria-hidden="true" />

          {/* Desktop search */}
          <div className="hidden md:flex relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Buscar causas, estudiantes, cursos..."
              className="w-full bg-neutral-100 text-neutral-800 pl-10 pr-4 py-2 text-sm font-medium rounded-xl border border-neutral-200/60 hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 focus:bg-white transition-all placeholder:text-neutral-400"
              aria-label="Búsqueda global"
            />
          </div>

          {/* Mobile search toggle */}
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className="md:hidden ml-auto p-2 rounded-xl hover:bg-neutral-100 text-neutral-500 transition-all cursor-pointer"
            aria-label="Buscar"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mobile save indicator — small colored dot */}
          {saveStatus !== 'idle' && (
            <span
              className={`md:hidden h-2 w-2 rounded-full shrink-0 ${
                saveStatus === 'saving' ? 'bg-brand-500 animate-pulse' :
                saveStatus === 'saved' ? 'bg-leve-500' :
                'bg-gravisima-500'
              }`}
              aria-label={saveStatus === 'saving' ? 'Guardando' : saveStatus === 'saved' ? 'Guardado' : 'Error al guardar'}
            />
          )}
          {/* Desktop save indicator */}
          {saveStatus !== 'idle' && (
            <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold ${
              saveStatus === 'saving'
                ? 'bg-brand-50 border-brand-200 text-brand-700'
                : saveStatus === 'saved'
                ? 'bg-leve-50 border-leve-200 text-leve-700'
                : 'bg-gravisima-50 border-gravisima-200 text-gravisima-700'
            }`}>
              {saveStatus === 'saving' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : saveStatus === 'saved' ? (
                <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>
                {saveStatus === 'saving' ? 'Guardando...'
                  : saveStatus === 'saved' ? 'Guardado'
                  : 'Error'}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setPrivacyMode(!privacyMode)}
            className={`relative inline-flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-[12px] font-semibold transition-all duration-200 cursor-pointer select-none ${
              privacyMode
                ? 'bg-grave-50 border-grave-200 text-grave-700 hover:bg-grave-100'
                : 'bg-neutral-100 border-neutral-200/60 text-neutral-600 hover:bg-neutral-200'
            }`}
            aria-label={privacyMode ? 'Desactivar modo privacidad' : 'Activar modo privacidad'}
            aria-pressed={privacyMode}
            title={privacyMode ? 'Nombres protegidos' : 'Nombres visibles'}
          >
            {privacyMode ? (
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">
              {privacyMode ? 'Privacidad' : 'Nombres'}
            </span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 rounded-xl hover:bg-neutral-100 text-neutral-500 transition-all cursor-pointer"
              aria-label="Notificaciones"
              aria-haspopup="true"
              aria-expanded={showNotifications}
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-gravisima-500 ring-2 ring-white" />
            </button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} aria-hidden="true" />
                <div className="absolute right-0 top-full mt-2 w-[min(360px,calc(100vw-2rem))] bg-white rounded-2xl border border-neutral-200 shadow-xl z-50 animate-scale-in overflow-hidden">
                  <div className="p-4 border-b border-neutral-100">
                    <h3 className="text-sm font-bold text-neutral-900">Notificaciones</h3>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {NOTIFICATIONS.filter(n => n.urgent).length} requieren atención
                    </p>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto">
                    {NOTIFICATIONS.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        className="w-full flex items-start gap-3 p-4 hover:bg-neutral-50 transition-all text-left border-b border-neutral-100 last:border-b-0"
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 ${n.urgent ? 'bg-gravisima-50' : 'bg-brand-50'}`}>
                          <Bell className={`h-3.5 w-3.5 ${n.urgent ? 'text-gravisima-600' : 'text-brand-600'}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-neutral-900">{n.title}</p>
                          <p className="text-[11px] text-neutral-500 mt-0.5">{n.description}</p>
                          <span className="text-[10px] text-neutral-400 mt-1 block">{n.time}</span>
                        </div>
                        {n.urgent && <span className="h-1.5 w-1.5 rounded-full bg-gravisima-500 shrink-0 mt-1" />}
                      </button>
                    ))}
                  </div>
                  <div className="p-3 border-t border-neutral-100 text-center">
                    <button type="button" className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                      Ver todas las notificaciones
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showSearch && (
        <div className="md:hidden px-4 pb-3 animate-slide-up">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-neutral-100 text-neutral-800 pl-10 pr-4 py-2.5 text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
              aria-label="Búsqueda"
            />
          </div>
        </div>
      )}
    </header>
  );
}
