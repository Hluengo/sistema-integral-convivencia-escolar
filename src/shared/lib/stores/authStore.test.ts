/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { after, afterEach, before, describe, it } from 'node:test';
import type { User } from '@supabase/supabase-js';
import type { MembershipResult } from '../../api/types/membership';
import type * as AuthStoreModule from './authStore';

let authStoreModule: typeof AuthStoreModule;

before(async () => {
  process.env.VITE_SUPABASE_URL = 'http://localhost:54321';
  process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
  authStoreModule = await import('./authStore');
});

afterEach(() => {
  const { useAuthStore, disposeAuthStoreSubscription } = authStoreModule;
  disposeAuthStoreSubscription();
  useAuthStore.setState(useAuthStore.getInitialState(), true);
});

after(() => {
  authStoreModule.disposeAuthStoreSubscription();
});

describe('authStore', () => {
  it('expone estado inicial sin usuario autenticado', () => {
    const { useAuthStore } = authStoreModule;

    const state = useAuthStore.getState();

    assert.equal(state.user, null);
    assert.equal(state.tenantId, null);
    assert.equal(state.profileRole, null);
    assert.equal(state.isAuthenticated, false);
    assert.equal(state.showLoginModal, false);
    assert.equal(state.sessionExpired, false);
    assert.equal(state.membershipStatus, 'not_available');
    assert.equal(state.membershipLoaded, false);
  });

  it('actualiza usuario, carga auth y modal de inicio de sesión', () => {
    const { useAuthStore } = authStoreModule;
    const user = { id: 'user-1', email: 'usuario@colegio.cl' } as User;

    useAuthStore.getState().setUser(user);
    useAuthStore.getState().setAuthLoading(false);
    useAuthStore.getState().setShowLoginModal(true);
    useAuthStore.setState({ sessionExpired: true });
    useAuthStore.getState().clearSessionExpired();

    const state = useAuthStore.getState();
    assert.equal(state.user, user);
    assert.equal(state.isAuthenticated, true);
    assert.equal(state.authLoading, false);
    assert.equal(state.showLoginModal, true);
    assert.equal(state.sessionExpired, false);
  });

  it('registra membresía activa para la aplicación solicitada', () => {
    const { useAuthStore } = authStoreModule;
    const result: MembershipResult = {
      status: 'active',
      applicationRole: 'admin',
      memberships: [
        {
          application_code: 'otra-app',
          role: 'viewer',
          is_active: true,
          app_is_active: true,
        },
        {
          application_code: 'convivencia',
          role: 'admin',
          is_active: true,
          app_is_active: true,
        },
      ],
    };

    useAuthStore.getState().setMembership(result, 'convivencia');

    const state = useAuthStore.getState();
    assert.equal(state.membershipStatus, 'active');
    assert.equal(state.applicationCode, 'convivencia');
    assert.equal(state.appRole, 'admin');
    assert.equal(state.membership?.application_code, 'convivencia');
    assert.equal(state.membershipLoaded, true);
    assert.equal(state.membershipLoading, false);
    assert.equal(state.membershipError, null);
  });

  it('maneja errores, fallback legacy y limpieza de membresía', () => {
    const { useAuthStore } = authStoreModule;

    useAuthStore.getState().setMembershipLoading(true);
    useAuthStore.getState().setMembershipError('Sin acceso');
    useAuthStore.getState().setLegacyFallbackUsed(true);

    let state = useAuthStore.getState();
    assert.equal(state.membershipLoading, false);
    assert.equal(state.membershipError, 'Sin acceso');
    assert.equal(state.legacyFallbackUsed, true);

    useAuthStore.getState().clearMembership();

    state = useAuthStore.getState();
    assert.equal(state.membershipStatus, 'not_available');
    assert.equal(state.applicationCode, null);
    assert.equal(state.appRole, null);
    assert.equal(state.membership, null);
    assert.equal(state.membershipError, null);
    assert.equal(state.membershipLoaded, false);
    assert.equal(state.legacyFallbackUsed, false);
    assert.equal(state.membershipLoading, false);
  });
});
