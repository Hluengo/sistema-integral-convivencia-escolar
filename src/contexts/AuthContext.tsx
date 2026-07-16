/** @license SPDX-License-Identifier: Apache-2.0 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { AppRole, UserProfile } from '../types';
import { getBrowserSupabase, isLocalDemoAllowed } from '../lib/supabaseClient';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_PROFILE: UserProfile = {
  id: 'demo-local',
  email: 'demo@mmddconcepcion.cl',
  full_name: 'Usuario Demo',
  role: 'convivencia',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isDemo = isLocalDemoAllowed();

  const loadProfile = useCallback(async (uid: string, email: string) => {
    const client = getBrowserSupabase();
    if (!client) {
      setProfile({
        id: uid,
        email,
        role: 'inspectoria',
      });
      return;
    }

    // Tabla profiles del proyecto compartido usa user_id (no id)
    const { data, error } = await client
      .from('profiles')
      .select('user_id, email, full_name, role, course_ids')
      .eq('user_id', uid)
      .maybeSingle();

    if (error || !data) {
      setProfile({
        id: uid,
        email,
        full_name: email.split('@')[0],
        role: 'inspectoria',
      });
      return;
    }

    const roleRaw = String(data.role || 'inspectoria');
    const roleMap: Record<string, AppRole> = {
      admin: 'admin',
      direccion: 'direccion',
      convivencia: 'convivencia',
      inspectoria: 'inspectoria',
      inspector: 'inspectoria',
      profesor_jefe: 'profesor_jefe',
      teacher: 'profesor_jefe',
      staff: 'inspectoria',
      user: 'inspectoria',
    };

    setProfile({
      id: String(data.user_id || uid),
      email: String(data.email || email),
      full_name: data.full_name ? String(data.full_name) : undefined,
      role: roleMap[roleRaw] || 'inspectoria',
      course_ids: Array.isArray(data.course_ids) ? data.course_ids.map(String) : [],
    });
  }, []);

  useEffect(() => {
    if (isDemo) {
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

    const client = getBrowserSupabase();
    if (!client) {
      setLoading(false);
      return;
    }

    let mounted = true;

    client.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadProfile(data.session.user.id, data.session.user.email || '').finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        loadProfile(nextSession.user.id, nextSession.user.email || '');
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [isDemo, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const client = getBrowserSupabase();
    if (!client) return { error: 'Supabase no está configurado. Revise las variables de entorno.' };

    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signOut = useCallback(async () => {
    const client = getBrowserSupabase();
    if (client) await client.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id, user.email || '');
  }, [loadProfile, user]);

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      isDemo,
      signIn,
      signOut,
      refreshProfile,
    }),
    [session, user, profile, loading, isDemo, signIn, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
