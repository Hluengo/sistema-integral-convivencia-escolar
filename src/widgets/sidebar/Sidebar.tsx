/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from "react";
import { useState, useRef, useEffect, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Scale,
  Users,
  FileBarChart,
  ClipboardList,
  Settings,
  Building2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { SidebarUserMenu, SidebarAulaSeguraAlert } from "./SidebarUserMenu";
import { fetchInstitutionDocumentSettings } from "../../shared/api/services/institution.service";
import { useAuthStore } from "../../shared/lib/stores/authStore";

export type SidebarView =
  | "dashboard"
  | "causas"
  | "alumnos"
  | "informes"
  | "reportes"
  | "anotaciones"
  | "admin"
  | "platform";

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
  canAccessAdmin: boolean;
  canAccessReports: boolean;
  canAccessPlatform: boolean;
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
  canAccessAdmin: boolean;
  canAccessReports: boolean;
  canAccessPlatform: boolean;
}

interface NavItem {
  id: SidebarView;
  label: string;
  Icon: React.ElementType;
  badgeKey?: "activeCount";
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "causas", label: "Expedientes", Icon: Scale, badgeKey: "activeCount" },
  { id: "anotaciones", label: "Anotaciones", Icon: ClipboardList },
  { id: "informes", label: "Asistente Legal", Icon: FileBarChart },
  { id: "alumnos", label: "Estudiantes", Icon: Users },
];

function SidebarBrand({ showText }: { showText: boolean }) {
  const tenantId = useAuthStore((state) => state.tenantId);
  const [logoError, setLogoError] = useState(false);
  const institutionQuery = useQuery({
    queryKey: ["institution-settings", tenantId, "sidebar"],
    queryFn: fetchInstitutionDocumentSettings,
    enabled: Boolean(tenantId),
    staleTime: 300_000,
    // ponytail: conserva el logo previo durante refetch; la URL firmada cambia
    // en cada request y sin esto el <img> se desmonta y parpadea.
    placeholderData: (previous) => previous,
  });
  useEffect(() => setLogoError(false), [tenantId]);
  const logoUrl = logoError ? null : (institutionQuery.data?.logo_url ?? null);
  const tenantName =
    institutionQuery.data?.official_name?.trim() || "Escolar Pro";

  return (
    <>
      {logoUrl ? (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <img
          src={logoUrl}
          alt={`Logo de ${tenantName}`}
          className="size-9 shrink-0 rounded-xl bg-white object-contain shadow-sm ring-1 ring-neutral-200"
          onError={() => setLogoError(true)}
        />
      ) : (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white shadow-sm">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </div>
      )}
      {showText && (
        <div className="min-w-0">
          <h1 className="truncate font-semibold text-neutral-900 text-sm leading-tight tracking-tight">
            Gestión Integral
          </h1>
          <p
            title={tenantName}
            className="mt-0.5 truncate font-bold text-[10px] text-brand-700 uppercase leading-tight tracking-[0.16em]"
          >
            {tenantName}
          </p>
        </div>
      )}
    </>
  );
}

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
  canAccessAdmin,
  canAccessReports,
  canAccessPlatform,
}: SidebarContentProps) {
  const navigationItems: NavItem[] = [
    ...NAV_ITEMS,
    ...(canAccessReports
      ? [
          {
            id: "reportes" as SidebarView,
            label: "Reportes",
            Icon: FileBarChart,
          },
        ]
      : []),
    ...(canAccessPlatform
      ? [
          {
            id: "platform" as SidebarView,
            label: "Plataforma",
            Icon: Building2,
          },
        ]
      : []),
    ...(canAccessAdmin
      ? [
          {
            id: "admin" as SidebarView,
            label: "Configuración",
            Icon: Settings,
          },
        ]
      : []),
  ];
  return (
    <div className="flex h-full flex-col">
      <div
        className={`flex items-center border-neutral-200 border-b ${isCollapsed && !mobile ? "justify-center px-3 py-5" : "gap-3 px-5 py-5"}`}
      >
        <SidebarBrand showText={!isCollapsed || mobile} />
      </div>

      <SidebarUserMenu
        user={user}
        isCollapsed={isCollapsed}
        mobile={mobile}
        onLogin={onLogin}
        onLogout={onLogout}
      />

      <SidebarAulaSeguraAlert
        count={aulaSeguraCount}
        isCollapsed={isCollapsed}
        mobile={mobile}
      />

      {(!isCollapsed || mobile) && (
        <div className="px-5 pt-5 pb-2">
          <span className="font-bold text-xs text-neutral-500 uppercase tracking-[0.15em]">
            Navegación
          </span>
        </div>
      )}

      <nav
        className={`flex-1 ${isCollapsed && !mobile ? "px-2 py-4" : "px-3"} space-y-1`}
        aria-label="Secciones principales"
      >
        {navigationItems
          .filter((item) => user || item.id === "dashboard")
          .map((item) => {
            const isActive = currentView === item.id;
            const badge =
              item.badgeKey === "activeCount" ? activeCount : undefined;
            const Icon = item.Icon;

            return (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  onViewChange(item.id);
                  onNavigate?.();
                }}
                className={`group flex min-h-11 w-full cursor-pointer select-none items-center gap-3 rounded-xl border border-transparent font-medium text-13px transition-colors duration-150 ${isCollapsed && !mobile ? "justify-center px-0" : "px-3"}
                ${
                  isActive
                    ? "border-brand-100 bg-brand-50 font-semibold text-brand-800 shadow-xs"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                }`}
                aria-current={isActive ? "page" : undefined}
                title={isCollapsed && !mobile ? item.label : undefined}
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${isActive ? "bg-white text-brand-700 shadow-xs" : "text-neutral-500 group-hover:text-neutral-700"}`}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                {(!isCollapsed || mobile) && (
                  <>
                    <span className="flex-1 truncate text-left">
                      {item.label}
                    </span>
                    {badge !== undefined && badge > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 font-bold text-xs tabular-nums ${
                          isActive
                            ? "bg-brand-700 text-white"
                            : "bg-neutral-200 text-neutral-700"
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

      {(!isCollapsed || mobile) && (
        <div className="mt-auto flex flex-col gap-2 border-neutral-100 border-t bg-white p-4">
          <div className="flex items-center gap-2 rounded-xl bg-neutral-50 p-2.5">
            <ShieldCheck
              className="size-5 shrink-0 text-brand-600"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="truncate font-semibold text-neutral-700 text-xs">
                Superintendencia
              </p>
              <p className="truncate text-neutral-500 text-[11px]">
                Protocolos MINEDUC
              </p>
            </div>
          </div>
        </div>
      )}
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
  canAccessAdmin,
  canAccessReports,
  canAccessPlatform,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileSidebarRef = useRef<HTMLDivElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const wasMobileOpen = useRef(false);

  useEffect(() => {
    if (!mobileOpen) {
      if (wasMobileOpen.current) mobileTriggerRef.current?.focus();
      wasMobileOpen.current = false;
      return;
    }
    wasMobileOpen.current = true;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        mobileSidebarRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    const firstFocusable = mobileSidebarRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    firstFocusable?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
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
    canAccessAdmin,
    canAccessReports,
    canAccessPlatform,
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-brand-700 text-white shadow-lg shadow-brand-900/20 transition-colors hover:bg-brand-800 active:scale-95 lg:hidden"
        aria-label="Abrir menú"
        ref={mobileTriggerRef}
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

      {mobileOpen && (
        <div
          ref={mobileSidebarRef}
          className="fixed inset-y-0 left-0 z-50 w-[280px] translate-x-0 border-r border-neutral-200 bg-white shadow-2xl shadow-neutral-900/10 transition-transform duration-300 ease-out-expo lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menú móvil"
        >
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="absolute top-4 right-4 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
          <SidebarContent
            {...contentProps}
            mobile
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      )}

      <aside
        className={`relative hidden shrink-0 flex-col border-r border-neutral-200 bg-white transition-colors duration-300 ease-out-expo lg:flex ${
          isCollapsed ? "w-[68px]" : "w-64"
        }`}
        aria-label="Barra de navegación principal"
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          className="absolute top-[72px] -right-3 z-10 cursor-pointer rounded-full border border-neutral-200/80 bg-white p-1.5 shadow-md transition-colors hover:bg-neutral-50 hover:shadow-lg active:scale-90"
          aria-label={
            isCollapsed ? "Expandir menú lateral" : "Colapsar menú lateral"
          }
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
