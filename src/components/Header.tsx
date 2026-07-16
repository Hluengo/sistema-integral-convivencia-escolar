/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { Search, Bell, Eye, EyeOff, Cloud, CloudOff, Loader2, Command, User } from 'lucide-react';
import type { SidebarView } from './Sidebar';
import type { Causa } from '../types';
import { EstadoCausa } from '../types';
import { remainingProcedureDays, daysElapsedCeil } from '../lib/dateUtils';

const VIEW_TITLES: Record<SidebarView, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Panel de control ejecutivo' },
  causas: { title: 'Causas', subtitle: 'Expedientes y procedimientos activos' },
  alumnos: { title: 'Alumnos', subtitle: 'Gestión de estudiantes' },
  informes: { title: 'Informes', subtitle: 'Asistente y reportes' },
  anotaciones: { title: 'Gestión de Anotaciones', subtitle: 'Documentos y hojas de vida' },
};

interface HeaderProps {
  privacyMode: boolean;
  setPrivacyMode: (val: boolean) => void;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  currentView?: SidebarView;
  causas: Causa[];
  user?: { email?: string } | null;
  onNotificationClick?: (causaId: string) => void;
}

export default function Header({
  privacyMode,
  setPrivacyMode,
  saveStatus = 'idle',
  searchQuery = '',
  onSearchChange,
  currentView = 'dashboard',
  causas,
  user = null,
  onNotificationClick,
}: HeaderProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!showNotifications) { return; }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowNotifications(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showNotifications]);

  const NOTIFICATIONS = useMemo(() => {
    const n: {
      id: number;
      title: string;
      description: string;
      time: string;
      urgent: boolean;
      causaId?: string;
    }[] = [];

    causas.forEach((causa, idx) => {
      if (
        causa.comprometeAulaSegura &&
        causa.estadoActual !== EstadoCausa.CAUSA_CERRADA &&
        causa.estadoActual !== EstadoCausa.RESOLUCION_EJECUTORIADA
      ) {
        const remaining = remainingProcedureDays(causa.fechaApertura, 10);
        if (remaining <= 2) {
          n.push({
            id: idx * 10 + 1,
            title: 'Alerta Aula Segura',
            description: `Causa ${causa.id} - ${remaining <= 0 ? 'plazo EXCEDIDO' : remaining === 1 ? `vence en ${remaining} día` : `vence en ${remaining} días`}`,
            time: remaining <= 0 ? 'URGENTE' : 'Requiere atención',
            urgent: true,
            causaId: causa.id,
          });
        }
      }

      if (causa.estadoActual === EstadoCausa.EN_PLAZO_APELACION) {
        n.push({
          id: idx * 10 + 2,
          title: 'Plazo de apelación activo',
          description: `Causa ${causa.id} - periodo de apelación en curso`,
          time: 'Pendiente',
          urgent: true,
          causaId: causa.id,
        });
      }

      if (
        causa.estadoActual !== EstadoCausa.CAUSA_CERRADA &&
        causa.estadoActual !== EstadoCausa.RESOLUCION_EJECUTORIADA
      ) {
        const elapsed = daysElapsedCeil(causa.fechaApertura);
        if (elapsed > 60) {
          n.push({
            id: idx * 10 + 3,
            title: 'Procedimiento extendido',
            description: `Causa ${causa.id} - ${elapsed} días desde apertura sin resolución definitiva`,
            time: `Hace ${elapsed - 60} días sobre plazo`,
            urgent: true,
            causaId: causa.id,
          });
        }
      }

      if (
        !causa.comprometeAulaSegura &&
        causa.estadoActual !== EstadoCausa.CAUSA_CERRADA &&
        causa.estadoActual !== EstadoCausa.RESOLUCION_EJECUTORIADA
      ) {
        const remaining = remainingProcedureDays(causa.fechaApertura, 60);
        if (remaining <= 10 && remaining > 0) {
          n.push({
            id: idx * 10 + 4,
            title: 'Plazo próximo a vencer',
            description: `Causa ${causa.id} - ${remaining} días restantes del procedimiento ordinario`,
            time: `${remaining} días`,
            urgent: false,
            causaId: causa.id,
          });
        }
      }
    });

    return n;
  }, [causas]);

  const viewMeta = VIEW_TITLES[currentView];

  return (
    <header className="glass sticky top-0 z-30">
      <div className="absolute top-0 right-0 left-0 h-[3px] bg-gradient-to-r from-brand-700 via-brand-600 to-secondary-500" />

      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: Brand (mobile) + Page title + Search */}
        <div className="flex min-w-0 flex-1 items-center gap-4 pl-10 lg:pl-0">
          {/* Mobile brand */}
          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            <img src="/veritas2.png" alt="Escudo Veritas" className="h-9 w-auto" />
          </div>

          {/* Page title - visible on tablet+ */}
          <div className="hidden min-w-0 shrink-0 sm:block">
            <h1 className="truncate font-bold text-neutral-900 text-sm leading-tight">
              {viewMeta.title}
            </h1>
            <p className="truncate font-medium text-neutral-400 text-xs">{viewMeta.subtitle}</p>
          </div>

          <div className="hidden h-8 w-px shrink-0 bg-neutral-200 sm:block" aria-hidden="true" />

          {/* Desktop search */}
          <div className="relative hidden max-w-md flex-1 md:flex">
            <Search
              className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              id="global-search"
              name="global-search"
              type="text"
              spellCheck={false}
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Buscar causas, estudiantes, cursos..."
              className="w-full rounded-xl border border-neutral-200/60 bg-neutral-100 py-2 pr-16 pl-10 font-medium text-neutral-800 text-sm transition-all placeholder:text-neutral-400 hover:border-neutral-300 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              aria-label="Búsqueda global"
            />
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
              }
              className="absolute top-1/2 right-2 flex -translate-y-1/2 cursor-pointer items-center gap-1 rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-neutral-400 text-xs transition-colors hover:bg-neutral-100 hover:text-neutral-500"
              aria-label="Abrir paleta de comandos (Ctrl+K)"
            >
              <Command className="h-2.5 w-2.5" />K
            </button>
          </div>

          {/* Mobile search toggle */}
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className="ml-auto cursor-pointer rounded-xl p-2 text-neutral-500 transition-all hover:bg-neutral-100 md:hidden"
            aria-label="Buscar"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* User avatar */}
          {user?.email ? (
            <div
              className="group relative flex h-8 w-8 shrink-0 cursor-default items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 text-xs"
              title={user.email}
            >
              {user.email.charAt(0).toUpperCase()}
              <div className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-2 py-1 font-medium text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                {user.email}
              </div>
            </div>
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-500">
              <User className="h-4 w-4" />
            </div>
          )}

          {/* Mobile save indicator — small colored dot */}
          <div
            role="status"
            aria-live="polite"
            className={`h-2 w-2 shrink-0 rounded-full transition-opacity duration-200 md:hidden ${
              saveStatus === 'idle' ? 'opacity-0' : 'opacity-100'
            } ${
              saveStatus === 'saving'
                ? 'animate-pulse bg-brand-500'
                : saveStatus === 'saved'
                  ? 'bg-leve-500'
                  : 'bg-gravisima-500'
            }`}
          >
            <span className="sr-only">
              {saveStatus === 'saving'
                ? 'Guardando'
                : saveStatus === 'saved'
                  ? 'Guardado'
                  : 'Error al guardar'}
            </span>
          </div>
          {/* Desktop save indicator */}
          <div
            className={`hidden items-center gap-1.5 rounded-xl border px-3 py-1.5 font-semibold text-xs transition-opacity duration-200 md:flex ${
              saveStatus === 'idle' ? 'pointer-events-none opacity-0' : 'opacity-100'
            } ${
              saveStatus === 'saving'
                ? 'border-brand-200 bg-brand-50 text-brand-700'
                : saveStatus === 'saved'
                  ? 'border-leve-200 bg-leve-50 text-leve-700'
                  : 'border-gravisima-200 bg-gravisima-50 text-gravisima-700'
            }`}
          >
            {saveStatus === 'saving' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : saveStatus === 'saved' ? (
              <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>
              {saveStatus === 'saving'
                ? 'Guardando...'
                : saveStatus === 'saved'
                  ? 'Guardado'
                  : 'Error'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setPrivacyMode(!privacyMode)}
            className={`relative inline-flex cursor-pointer select-none items-center gap-2 rounded-xl border px-2.5 py-1.5 font-semibold text-[12px] transition-all duration-200 sm:px-3 ${
              privacyMode
                ? 'border-grave-200 bg-grave-50 text-grave-700 hover:bg-grave-100'
                : 'border-neutral-200/60 bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
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
            <span className="hidden sm:inline">{privacyMode ? 'Privacidad' : 'Nombres'}</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative cursor-pointer rounded-xl p-2.5 text-neutral-500 transition-all hover:bg-neutral-100"
              aria-label="Notificaciones"
              aria-haspopup="true"
              aria-expanded={showNotifications}
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {NOTIFICATIONS.some((n) => n.urgent) && (
                <span
                  className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-gravisima-500 ring-2 ring-white"
                  aria-hidden="true"
                />
              )}
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                  aria-hidden="true"
                />
                <div className="absolute top-full right-0 z-50 mt-2 w-[min(360px,calc(100vw-2rem))] animate-scale-in overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
                  <div className="border-neutral-100 border-b p-4">
                    <h3 className="font-bold text-neutral-900 text-sm">Notificaciones</h3>
                    <p className="mt-0.5 text-neutral-400 text-xs">
                      {NOTIFICATIONS.filter((n) => n.urgent).length} requieren atención
                    </p>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto">
                    {NOTIFICATIONS.length === 0 ? (
                      <div className="flex flex-col items-center px-6 py-10 text-center">
                        <Bell className="mb-2 h-6 w-6 text-neutral-300" />
                        <p className="font-medium text-neutral-500 text-sm">Sin notificaciones</p>
                        <p className="text-neutral-400 text-xs">No hay alertas ni plazos próximos a vencer</p>
                      </div>
                    ) : NOTIFICATIONS.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          setShowNotifications(false);
                          onNotificationClick?.(n.causaId!);
                        }}
                        className="flex w-full items-start gap-3 border-neutral-100 border-b p-4 text-left transition-all last:border-b-0 hover:bg-neutral-50"
                      >
                        <div
                          className={`shrink-0 rounded-lg p-1.5 ${n.urgent ? 'bg-gravisima-50' : 'bg-brand-50'}`}
                        >
                          <Bell
                            className={`h-3.5 w-3.5 ${n.urgent ? 'text-gravisima-600' : 'text-brand-600'}`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[12px] text-neutral-900">{n.title}</p>
                          <p className="mt-0.5 text-neutral-500 text-xs">{n.description}</p>
                          <span className="mt-1 block text-neutral-400 text-xs">{n.time}</span>
                        </div>
                        {n.urgent && (
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gravisima-500" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="border-neutral-100 border-t p-3 text-center">
                    <button
                      type="button"
                      className="font-semibold text-brand-600 text-xs transition-colors hover:text-brand-700"
                    >
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
        <div className="animate-slide-up px-4 pb-3 md:hidden">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              id="mobile-search"
              name="mobile-search"
              type="text"
              spellCheck={false}
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Buscar..."
              className="w-full rounded-xl border border-neutral-200 bg-neutral-100 py-2.5 pr-4 pl-10 text-neutral-800 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              aria-label="Búsqueda"
            />
          </div>
        </div>
      )}
    </header>
  );
}
