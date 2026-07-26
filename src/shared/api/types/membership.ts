/** @license SPDX-License-Identifier: Apache-2.0 */

export interface AppMembership {
  application_code: string;
  role: string;
  is_active: boolean;
  app_is_active: boolean;
}

export type MembershipStatus = 'active' | 'inactive' | 'no_membership' | 'not_available' | 'error';

export interface MembershipResult {
  memberships: AppMembership[];
  status: MembershipStatus;
  applicationRole: string | null;
}
