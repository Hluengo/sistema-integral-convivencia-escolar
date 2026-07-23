/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect } from 'react';
import { identifyAnalyticsUser, resetAnalyticsUser } from '../lib/analytics';
import { useAuthStore } from '../stores/authStore';

export default function AuthAnalytics() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.authLoading);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      identifyAnalyticsUser(user);
    } else {
      resetAnalyticsUser();
    }
  }, [user, authLoading]);

  return null;
}
