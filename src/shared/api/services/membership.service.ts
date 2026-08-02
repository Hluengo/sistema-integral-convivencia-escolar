/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';
import type { AppMembership, MembershipResult } from '../types/membership';
import { getMembershipConfig, getMembershipAuthMode, isDev } from '../lib/membershipConfig';
import type { MembershipAuthMode } from '../types/membership';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const TIMEOUT_MS = 10000;

let cachedResult: MembershipResult | null = null;
let cachedKey: string | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
  ]);
}

function logDev(event: string, detail?: string) {
  if (isDev()) {
    const msg = `[membership] ${event}${detail ? `: ${detail}` : ''}`;
    console.debug(msg);
  }
}

export async function getMyMembership(applicationCode: string): Promise<MembershipResult> {
  const config = getMembershipConfig();

  if (!config.enabled) {
    logDev('membership_load_skipped', 'flag disabled');
    return {
      memberships: [],
      status: 'not_available',
      applicationRole: null,
    };
  }

  const cacheKey = `${applicationCode}`;
  if (cachedResult && cachedKey === cacheKey) {
    logDev('membership_load_cache_hit');
    return cachedResult;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        logDev('membership_retry', String(attempt));
        await sleep(RETRY_DELAY_MS * attempt);
      }

      logDev('membership_load_started', `attempt ${attempt + 1}`);

      const { data, error } = await withTimeout(
        Promise.resolve(supabase.rpc('current_user_memberships')),
        TIMEOUT_MS,
      );

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          logDev('membership_load_skipped', 'function not found');
          const result: MembershipResult = {
            memberships: [],
            status: 'not_available',
            applicationRole: null,
          };
          cachedResult = result;
          cachedKey = cacheKey;
          return result;
        }
        lastError = new Error(error.message ?? 'RPC error');
        logDev('membership_load_error', error.message);
        continue;
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        logDev('membership_not_found');
        const result: MembershipResult = {
          memberships: [],
          status: 'no_membership',
          applicationRole: null,
        };
        cachedResult = result;
        cachedKey = cacheKey;
        return result;
      }

      const memberships = data as AppMembership[];
      const appMembership = memberships.find((m) => m.application_code === applicationCode);

      if (!appMembership) {
        logDev('membership_not_found', `no membership for ${applicationCode}`);
        const result: MembershipResult = {
          memberships,
          status: 'no_membership',
          applicationRole: null,
        };
        cachedResult = result;
        cachedKey = cacheKey;
        return result;
      }

      if (!appMembership.is_active || !appMembership.app_is_active) {
        logDev('membership_inactive', appMembership.role);
        const result: MembershipResult = {
          memberships,
          status: 'inactive',
          applicationRole: appMembership.role,
        };
        cachedResult = result;
        cachedKey = cacheKey;
        return result;
      }

      logDev('membership_load_success', appMembership.role);
      const result: MembershipResult = {
        memberships,
        status: 'active',
        applicationRole: appMembership.role,
      };
      cachedResult = result;
      cachedKey = cacheKey;
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      logDev('membership_load_error', lastError.message);
    }
  }

  logDev('membership_load_error', `exhausted ${MAX_RETRIES + 1} attempts`);
  const result: MembershipResult = {
    memberships: [],
    status: 'error',
    applicationRole: null,
  };
  cachedResult = result;
  cachedKey = cacheKey;
  return result;
}

export function invalidateMembershipCache(): void {
  cachedResult = null;
  cachedKey = null;
}

export function getMembershipMode(): MembershipAuthMode {
  return getMembershipAuthMode();
}
