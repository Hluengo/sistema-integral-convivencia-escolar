/** @license SPDX-License-Identifier: Apache-2.0 */

import type { SidebarView } from '../widgets/sidebar/Sidebar';

export const VIEW_PATHS: Record<SidebarView, string> = {
  dashboard: '/',
  causas: '/expedientes',
  anotaciones: '/anotaciones',
  alumnos: '/alumnos',
  informes: '/informes',
  reportes: '/reportes',
  admin: '/admin',
  platform: '/plataforma',
};

export type RouteIntent =
  { kind: 'view'; view: SidebarView; causaId?: string } | { kind: 'login' } | { kind: 'not-found' };

export function viewToPath(view: SidebarView): string {
  return VIEW_PATHS[view];
}

export function causaToPath(causaId: string): string {
  return `/expedientes/${encodeURIComponent(causaId)}`;
}

export function routeIntentFromPath(pathname: string): RouteIntent {
  const normalizedPath = normalizePath(pathname);
  if (normalizedPath === '/login') return { kind: 'login' };
  if (normalizedPath === '/expedientes') return { kind: 'view', view: 'causas' };
  if (normalizedPath.startsWith('/expedientes/')) {
    const causaId = decodeURIComponent(normalizedPath.slice('/expedientes/'.length));
    return causaId ? { kind: 'view', view: 'causas', causaId } : { kind: 'view', view: 'causas' };
  }

  const entry = Object.entries(VIEW_PATHS).find(([, path]) => path === normalizedPath);
  if (entry) return { kind: 'view', view: entry[0] as SidebarView };
  return { kind: 'not-found' };
}

export function isPublicView(view: SidebarView): boolean {
  return view === 'dashboard';
}

export function canAccessView(
  view: SidebarView,
  gates: { canAccessAdmin: boolean; canAccessReports: boolean; canAccessPlatform: boolean },
): boolean {
  if (view === 'admin') return gates.canAccessAdmin;
  if (view === 'reportes') return gates.canAccessReports;
  if (view === 'platform') return gates.canAccessPlatform;
  return true;
}

function normalizePath(pathname: string): string {
  const withoutTrailingSlash = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return withoutTrailingSlash || '/';
}
