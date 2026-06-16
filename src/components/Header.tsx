/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shield, Eye, EyeOff, Sparkles, Cloud, CloudOff, Loader2 } from 'lucide-react';

interface HeaderProps {
  privacyMode: boolean;
  setPrivacyMode: (val: boolean) => void;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
}

export default function Header({ privacyMode, setPrivacyMode, saveStatus = 'idle' }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-neutral-200/60 shadow-sm"
      role="banner"
      aria-label="Encabezado principal"
    >
      {/* Subtle gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-400 via-brand-500 to-purple-500" />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand section */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="bg-gradient-to-br from-brand-600 to-brand-800 text-white p-2 rounded-lg flex items-center justify-center shadow-md shadow-brand-600/10 border border-brand-500/20"
            aria-hidden="true"
          >
            <Shield className="h-4 w-4 text-brand-100" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-display font-bold text-neutral-900 leading-tight tracking-tight">
              Debido Proceso
            </h1>
            <p className="text-[9px] font-semibold text-neutral-400 tracking-wide uppercase leading-tight mt-0.5">
              Gestión de Convivencia Escolar
            </p>
          </div>
          <div className="sm:hidden">
            <h1 className="text-sm font-display font-bold text-neutral-900 leading-tight">
              Debido Proceso
            </h1>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Save status indicator */}
          {saveStatus && saveStatus !== 'idle' && (
            <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-semibold ${
              saveStatus === 'saving'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : saveStatus === 'saved'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {saveStatus === 'saving' ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : saveStatus === 'saved' ? (
                <Cloud className="h-3 w-3" aria-hidden="true" />
              ) : (
                <CloudOff className="h-3 w-3" aria-hidden="true" />
              )}
              <span>
                {saveStatus === 'saving' ? 'Guardando...'
                  : saveStatus === 'saved' ? 'Guardado'
                  : 'Error al guardar'}
              </span>
            </div>
          )}

          {/* Status badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-50 border border-neutral-200/60 text-[10px] font-semibold text-neutral-500">
            <span className="h-1.5 w-1.5 rounded-full bg-success-500" aria-hidden="true" />
            <span>Sistema activo</span>
          </div>

          {/* Privacy toggle - premium pill */}
          <button
            onClick={() => setPrivacyMode(!privacyMode)}
            className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-200 cursor-pointer select-none ${
              privacyMode
                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800'
            }`}
            aria-label={privacyMode ? 'Modo privacidad activado. Click para desactivar.' : 'Modo privacidad desactivado. Click para activar.'}
            aria-pressed={privacyMode}
            title={privacyMode ? 'Los nombres de NNA están protegidos' : 'Los nombres de NNA son visibles'}
          >
            {privacyMode ? (
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">
              {privacyMode ? 'Privacidad NNA' : 'Nombres reales'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}