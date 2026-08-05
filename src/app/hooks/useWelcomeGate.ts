/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

const WELCOME_SEEN_KEY = 'gestion-casos-welcome-seen';

interface UseWelcomeGateArgs {
  authLoading: boolean;
  user: User | null;
  setShowLoginModal: (show: boolean) => void;
}

export function useWelcomeGate({ authLoading, user, setShowLoginModal }: UseWelcomeGateArgs) {
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      setShowWelcome(false);
      return;
    }
    setShowWelcome(window.sessionStorage.getItem(WELCOME_SEEN_KEY) !== 'true');
  }, [authLoading, user]);

  const dismissWelcome = useCallback(() => {
    window.sessionStorage.setItem(WELCOME_SEEN_KEY, 'true');
    setShowWelcome(false);
  }, []);

  const loginFromWelcome = useCallback(() => {
    dismissWelcome();
    setShowLoginModal(true);
  }, [dismissWelcome, setShowLoginModal]);

  return { showWelcome, dismissWelcome, loginFromWelcome };
}
