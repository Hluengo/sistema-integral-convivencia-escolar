/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { onAuthStateChange } from '../services/auth.service';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) {
        setShowLoginModal(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return { user, authLoading, showLoginModal, setShowLoginModal, isAuthenticated: !!user };
}
