/** @license SPDX-License-Identifier: Apache-2.0 */

export interface AppMembership {
  application_code: string;
  role: string;
  is_active: boolean;
  app_is_active: boolean;
}

export type MembershipStatus =
  'idle' | 'loading' | 'active' | 'no_membership' | 'inactive' | 'error' | 'not_available';

export type MembershipAuthMode = 'legacy' | 'transition' | 'enforced' | 'invalid';

export interface MembershipResult {
  memberships: AppMembership[];
  status: MembershipStatus;
  applicationRole: string | null;
}

export interface MembershipState {
  membershipStatus: MembershipStatus;
  membershipAuthMode: MembershipAuthMode;
  applicationCode: string | null;
  appRole: string | null;
  membership: AppMembership | null;
  membershipError: string | null;
  membershipLoaded: boolean;
  legacyFallbackUsed: boolean;
}
