/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';
import type { AppMembership, MembershipResult } from '../types/membership';

const MEMBERSHIPS_ENABLED = import.meta.env.VITE_APP_MEMBERSHIPS_ENABLED === 'true';

export async function getMyMembership(applicationCode: string): Promise<MembershipResult> {
  if (!MEMBERSHIPS_ENABLED) {
    return {
      memberships: [],
      status: 'not_available',
      applicationRole: null,
    };
  }

  try {
    const { data, error } = await supabase.rpc('current_user_memberships');

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return {
          memberships: [],
          status: 'not_available',
          applicationRole: null,
        };
      }
      return {
        memberships: [],
        status: 'error',
        applicationRole: null,
      };
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        memberships: [],
        status: 'no_membership',
        applicationRole: null,
      };
    }

    const memberships = data as AppMembership[];
    const appMembership = memberships.find((m) => m.application_code === applicationCode);

    if (!appMembership) {
      return {
        memberships,
        status: 'no_membership',
        applicationRole: null,
      };
    }

    if (!appMembership.is_active || !appMembership.app_is_active) {
      return {
        memberships,
        status: 'inactive',
        applicationRole: appMembership.role,
      };
    }

    return {
      memberships,
      status: 'active',
      applicationRole: appMembership.role,
    };
  } catch {
    return {
      memberships: [],
      status: 'error',
      applicationRole: null,
    };
  }
}

export function isMembershipsEnabled(): boolean {
  return MEMBERSHIPS_ENABLED;
}
