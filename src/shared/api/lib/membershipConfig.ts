/** @license SPDX-License-Identifier: Apache-2.0 */

export type MembershipAuthMode = 'legacy' | 'transition' | 'enforced' | 'invalid';

export interface MembershipConfig {
  enabled: boolean;
  enforced: boolean;
  allowLegacyFallback: boolean;
}

function readEnvBoolean(key: string, fallback: boolean): boolean {
  const viteEnv = import.meta.env as Record<string, string | boolean | undefined> | undefined;
  const nodeEnv =
    typeof process !== 'undefined'
      ? (process.env as Record<string, string | undefined>)
      : undefined;
  const raw = viteEnv?.[key] ?? nodeEnv?.[key];
  if (raw === undefined || raw === null || raw === '') return fallback;
  return raw === 'true';
}

export function getMembershipConfig(): MembershipConfig {
  const enabled = readEnvBoolean('VITE_APP_MEMBERSHIPS_ENABLED', false);
  const enforced = readEnvBoolean('VITE_APP_MEMBERSHIPS_ENFORCED', false);
  const allowLegacyFallback = readEnvBoolean('VITE_APP_MEMBERSHIPS_ALLOW_LEGACY_FALLBACK', true);
  return { enabled, enforced, allowLegacyFallback };
}

export function getMembershipAuthMode(): MembershipAuthMode {
  const config = getMembershipConfig();
  if (!config.enabled) return 'legacy';
  if (config.enforced && !config.allowLegacyFallback) return 'enforced';
  if (config.enabled && !config.enforced) return 'transition';
  if (config.enforced && config.allowLegacyFallback) return 'transition';
  return 'invalid';
}

const APP_ROLE_RULES: Record<string, readonly string[]> = {
  convivencia: ['direccion', 'convivencia'],
  inasistencias: ['teacher'],
};

export function getAllowedRoles(applicationCode: string): readonly string[] {
  return APP_ROLE_RULES[applicationCode] ?? [];
}

export function isDev(): boolean {
  return (
    import.meta.env?.DEV === true ||
    (typeof process !== 'undefined' && process.env.NODE_ENV === 'development')
  );
}
