/** @license SPDX-License-Identifier: Apache-2.0 */

/**
 * Contexto de sesión para la capa de servicios.
 *
 * Funciones puras que reciben tenantId/userId como parámetros.
 * Esto elimina el acoplamiento a useAuthStore (FSD: services → stores).
 * En tests, basta con pasar los valores directamente.
 */

export function getSessionTenantId(tenantId?: string | null): string | null {
  return tenantId ?? null;
}

export function getSessionUserId(userId?: string | null): string | null {
  return userId ?? null;
}

export function getSessionUserEmail(email?: string | null): string | null {
  return email ?? null;
}

/**
 * Helper para extraer credenciales del store de auth y pasarlas a servicios.
 * Uso en hooks: `const { tenantId, userId, email } = useAuthSession();`
 */
export function useAuthSession() {
  // This is a placeholder - actual implementation will be in hooks that import useAuthStore
  // Services should NOT import this. Hooks should use useAuthStore selectors directly.
  return { tenantId: null, userId: null, email: null };
}
