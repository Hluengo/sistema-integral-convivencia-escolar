/** @license SPDX-License-Identifier: Apache-2.0 */

import { LogIn, LogOut, User, AlertTriangle } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

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
      <div className={`px-3 ${isCollapsed && !mobile ? "pt-3" : "pt-4"}`}>
        <button
          type="button"
          onClick={onLogin}
          className={`flex w-full cursor-pointer select-none items-center gap-2.5 rounded-xl font-semibold text-12px transition-colors ${
            isCollapsed && !mobile
              ? "justify-center bg-brand-700 px-0 py-2.5 text-white hover:bg-brand-800"
              : "bg-brand-700 px-3.5 py-2.5 text-white shadow-brand-700/20 shadow-lg hover:bg-brand-800"
          }`}
        >
          <LogIn className="h-4 w-4 shrink-0" />
          {(!isCollapsed || mobile) && <span>Iniciar sesión</span>}
        </button>
      </div>
    );
  }

  return (
    <div className={`px-3 ${isCollapsed && !mobile ? "pt-3" : "pt-4"}`}>
      <div
        className={`flex items-center gap-2.5 rounded-xl transition-colors ${
          isCollapsed && !mobile
            ? "justify-center px-2 py-2"
            : "bg-neutral-100 px-3 py-2.5 hover:bg-neutral-150"
        }`}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100">
          <User className="h-3.5 w-3.5 text-brand-700" />
        </div>
        {(!isCollapsed || mobile) && (
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-neutral-800 text-xs">
              {user.email}
            </p>
            <p className="text-10px text-neutral-600">Conectado</p>
          </div>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="shrink-0 cursor-pointer rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-800"
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
          className="h-2 w-2 animate-pulse rounded-full bg-gravisima-500 ring-2 ring-gravisima-500/30"
          aria-hidden="true"
          title={`${count} alerta${count !== 1 ? "s" : ""} de Aula Segura`}
        />
      </div>
    );
  }

  return (
    <div className="mx-3 mt-4 flex items-center gap-2.5 rounded-xl border border-gravisima-200 bg-gravisima-50 px-3.5 py-3">
      <div className="shrink-0 rounded-lg bg-gravisima-100 p-1.5">
        <AlertTriangle
          className="h-3.5 w-3.5 text-gravisima-600"
          aria-hidden="true"
        />
      </div>
      <div className="min-w-0">
        <p className="font-bold text-gravisima-700 text-xs leading-tight">
          {count} alerta{count !== 1 ? "s" : ""} crítica{count !== 1 ? "s" : ""}
        </p>
        <p className="mt-0.5 font-medium text-10px text-gravisima-600 leading-tight">
          Ley Aula Segura · Acción urgente
        </p>
      </div>
    </div>
  );
}
