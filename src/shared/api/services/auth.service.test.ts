/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { Session } from '@supabase/supabase-js';

process.env.VITE_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY ??= 'anon-key-for-unit-tests';

interface AuthMethodResult<T> {
  data: T | null;
  error: Error | null;
}

interface MutableAuthApi {
  signInWithPassword: (params: {
    email: string;
    password: string;
  }) => Promise<AuthMethodResult<unknown>>;
  resetPasswordForEmail: (
    email: string,
    opts?: { redirectTo?: string },
  ) => Promise<AuthMethodResult<null>>;
  updateUser: (attrs: { password: string }) => Promise<AuthMethodResult<unknown>>;
  signOut: (opts?: { scope: string }) => Promise<{ error: Error | null }>;
  onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
    data: { subscription: unknown };
  };
}

interface MutableSupabase {
  auth: MutableAuthApi;
}

function mockSession(overrides: Partial<Session> = {}): Session {
  return {
    access_token: 'token',
    refresh_token: 'refresh',
    expires_in: 3600,
    expires_at: 9999999999,
    token_type: 'bearer',
    user: {
      id: 'user-1',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'test@example.cl',
      app_metadata: { provider: 'email' },
      user_metadata: {},
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      identities: [],
    },
    ...overrides,
  } as Session;
}

async function withAuthMocks(options: {
  auth?: Partial<MutableAuthApi>;
  fn: () => Promise<unknown>;
}): Promise<unknown> {
  const { supabase } = await import('../lib/supabase');
  const mutable = supabase as unknown as MutableSupabase;
  const originalAuth = mutable.auth;
  const originalConsoleError = console.error;

  const defaultResult: AuthMethodResult<null> = { data: null, error: null };
  mutable.auth = {
    signInWithPassword: async () => defaultResult,
    resetPasswordForEmail: async () => defaultResult,
    updateUser: async () => defaultResult,
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: {} } }),
    ...options.auth,
  };
  console.error = () => undefined;

  try {
    return await options.fn();
  } finally {
    mutable.auth = originalAuth;
    console.error = originalConsoleError;
  }
}

describe('signInWithEmail', () => {
  it('devuelve la sesión al autenticar', async () => {
    const session = mockSession({ access_token: 'abc' });
    const result = await withAuthMocks({
      auth: {
        signInWithPassword: async ({ email, password }) => {
          assert.equal(email, 'profesor@colegio.cl');
          assert.equal(password, 'secreto');
          return { data: { session }, error: null };
        },
      },
      fn: async () => {
        const { signInWithEmail } = await import('./auth.service');
        return signInWithEmail('profesor@colegio.cl', 'secreto');
      },
    });
    assert.equal((result as { data: { session: Session } }).data.session.access_token, 'abc');
  });

  it('propaga el error de credenciales inválidas', async () => {
    const result = await withAuthMocks({
      auth: {
        signInWithPassword: async () => ({
          data: null,
          error: new Error('Invalid login credentials'),
        }),
      },
      fn: async () => {
        const { signInWithEmail } = await import('./auth.service');
        return signInWithEmail('malo@colegio.cl', 'incorrecta');
      },
    });
    assert.match(String((result as { error: Error | null }).error?.message), /Invalid login/);
  });
});

describe('requestPasswordReset', () => {
  it('solicita el reset sin redirect cuando no hay window (server)', async () => {
    const result = await withAuthMocks({
      auth: {
        resetPasswordForEmail: async (email, opts) => {
          assert.equal(email, 'estudiante@colegio.cl');
          assert.equal(opts?.redirectTo, undefined);
          return { data: null, error: null };
        },
      },
      fn: async () => {
        const { requestPasswordReset } = await import('./auth.service');
        return requestPasswordReset('estudiante@colegio.cl');
      },
    });
    assert.equal((result as { error: Error | null }).error, null);
  });

  it('usa window.location.origin como redirect en navegador', async () => {
    const result = await withAuthMocks({
      auth: {
        resetPasswordForEmail: async (_email, opts) => {
          assert.equal(opts?.redirectTo, 'https://app.colegio.cl');
          return { data: null, error: null };
        },
      },
      fn: async () => {
        const { requestPasswordReset } = await import('./auth.service');
        // Simula presencia de window
        const originalWindow = globalThis.window;
        (globalThis as { window?: unknown }).window = {
          location: { origin: 'https://app.colegio.cl' },
        };
        try {
          return await requestPasswordReset('estudiante@colegio.cl');
        } finally {
          if (originalWindow === undefined) {
            delete (globalThis as { window?: unknown }).window;
          } else {
            (globalThis as { window: unknown }).window = originalWindow;
          }
        }
      },
    });
    assert.equal((result as { error: Error | null }).error, null);
  });
});

describe('updatePassword', () => {
  it('actualiza la contraseña del usuario', async () => {
    const result = await withAuthMocks({
      auth: {
        updateUser: async (attrs) => {
          assert.equal(attrs.password, 'nueva-contrasena');
          return { data: { user: { id: 'user-1' } }, error: null };
        },
      },
      fn: async () => {
        const { updatePassword } = await import('./auth.service');
        return updatePassword('nueva-contrasena');
      },
    });
    assert.equal((result as { data: { user: { id: string } } | null }).data?.user.id, 'user-1');
  });

  it('propaga el error del proveedor', async () => {
    const result = await withAuthMocks({
      auth: {
        updateUser: async () => ({ data: null, error: new Error('Password too weak') }),
      },
      fn: async () => {
        const { updatePassword } = await import('./auth.service');
        return updatePassword('corta');
      },
    });
    assert.match(String((result as { error: Error | null }).error?.message), /Password too weak/);
  });
});

describe('signOut', () => {
  it('cierra sesión solo en el navegador (scope local)', async () => {
    const result = await withAuthMocks({
      auth: {
        signOut: async (opts) => {
          assert.deepEqual(opts, { scope: 'local' });
          return { error: null };
        },
      },
      fn: async () => {
        const { signOut } = await import('./auth.service');
        return signOut();
      },
    });
    assert.equal((result as { error: Error | null }).error, null);
  });

  it('propaga el error de red al cerrar sesión', async () => {
    const result = await withAuthMocks({
      auth: {
        signOut: async () => ({ error: new Error('Network error') }),
      },
      fn: async () => {
        const { signOut } = await import('./auth.service');
        return signOut();
      },
    });
    assert.match(String((result as { error: Error | null }).error?.message), /Network error/);
  });
});

describe('onAuthStateChange', () => {
  afterEach(() => {
    // La restauración ocurre dentro de withAuthMocks.
  });

  it('registra el callback y devuelve la suscripción', async () => {
    const captured: { event: string; session: Session | null } = { event: '', session: null };
    const result = await withAuthMocks({
      auth: {
        onAuthStateChange: (callback) => {
          callback('SIGNED_IN', mockSession());
          return { data: { subscription: { id: 'sub-1' } } };
        },
      },
      fn: async () => {
        const { onAuthStateChange } = await import('./auth.service');
        const subscription = onAuthStateChange((event, session) => {
          captured.event = event;
          captured.session = session;
        });
        assert.equal(
          (subscription as { data: { subscription: { id: string } } }).data.subscription.id,
          'sub-1',
        );
        return null;
      },
    });
    assert.equal(result, null);
    assert.equal(captured.event, 'SIGNED_IN');
    assert.equal(captured.session?.user.id, 'user-1');
  });
});
