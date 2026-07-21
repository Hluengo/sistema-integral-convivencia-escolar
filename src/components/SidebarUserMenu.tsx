/** @license SPDX-License-Identifier: Apache-2.0 */

import { LogIn, LogOut, User, AlertTriangle } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface SidebarUserMenuProps {
  user: SupabaseUser | null;
  isCollapsed: boolean;
  mobile?: boolean;
  onLogin?: () => void;
  onLogout?: () => void;
}

interface SidebarAulaSeguraAlertProps {
  count: number;
  isCollapsed: boolean;
  mobile?: boolean;
}

export function SidebarUserMenu({
  user,
  isCollapsed,
  mobile = false,
  onLogin,
  onLogout,
}: SidebarUserMenuProps) {
  if (!user) {
    return (
      <div className={`px-3 ${isCollapsed && !mobile ? 'pt-3' : 'pt-4'}`}>
        <button
          type="button"
          onClick={onLogin}
          className={`flex w-full cursor-pointer select-none items-center gap-2.5 rounded-xl font-semibold text-[12px] transition-colors ${
            isCollapsed && !mobile
              ? 'justify-center bg-brand-500 px-0 py-2.5 text-white hover:bg-brand-600'
              : 'bg-brand-500 px-3.5 py-2.5 text-white shadow-brand-500/20 shadow-lg hover:bg-brand-600'
          }`}
        >
          <LogIn className="h-4 w-4 shrink-0" />
          {(!isCollapsed || mobile) && <span>Iniciar sesión</span>}
        </button>
      </div>
    );
  }

  return (
    <div className={`px-3 ${isCollapsed && !mobile ? 'pt-3' : 'pt-4'}`}>
      <div
        className={`flex items-center gap-2.5 rounded-xl transition-colors ${
          isCollapsed && !mobile
            ? 'justify-center px-2 py-2'
            : 'bg-white/10 px-3 py-2.5 hover:bg-white/15'
        }`}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500/20">
          <User className="h-3.5 w-3.5 text-brand-300" />
        </div>
        {(!isCollapsed || mobile) && (
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-white text-xs">{user.email}</p>
            <p className="text-[10px] text-neutral-500">Conectado</p>
          </div>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="shrink-0 cursor-pointer rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function SidebarAulaSeguraAlert({
  count,
  isCollapsed,
  mobile = false,
}: SidebarAulaSeguraAlertProps) {
  if (count <= 0) return null;

  if (isCollapsed && !mobile) {
    return (
      <div className="mt-4 flex justify-center">
        <div
          className="h-2 w-2 animate-pulse rounded-full bg-red-400 ring-2 ring-red-400/30"
          aria-hidden="true"
          title={`${count} alerta${count !== 1 ? 's' : ''} de Aula Segura`}
        />
      </div>
    );
  }

  return (
    <div className="mx-3 mt-4 flex items-center gap-2.5 rounded-xl border border-red-400/30 bg-red-500/20 px-3.5 py-3">
      <div className="shrink-0 rounded-lg bg-red-500/20 p-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-red-300" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="font-bold text-red-200 text-xs leading-tight">
          {count} alerta{count !== 1 ? 's' : ''} crítica{count !== 1 ? 's' : ''}
        </p>
        <p className="mt-0.5 font-medium text-[10px] text-red-300/70 leading-tight">
          Ley Aula Segura · Acción urgente
        </p>
      </div>
    </div>
  );
}
