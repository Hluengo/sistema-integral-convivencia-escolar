/** @license SPDX-License-Identifier: Apache-2.0 */

import { useAuthStore } from '../../lib/stores/authStore';

/**
 * Contexto de sesión para la capa de servicios.
 *
 * Centraliza la lectura del tenant y del usuario desde el store de auth para
 * evitar que los servicios importen el store directamente (FSD: services →
 * stores). En tests, basta con inicializar `useAuthStore.setState(...)`.
 */
export function getSessionTenantId(): string | null {
  return useAuthStore.getState().tenantId ?? null;
}

export function getSessionUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null;
}

export function getSessionUserEmail(): string | null {
  const user = useAuthStore.getState().user;
  return user?.email ?? null;
}
