/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";
import type { Session, User } from "@supabase/supabase-js";
import type { onAuthStateChange } from "../../api/services/auth.service";
import type * as AuthStoreModule from "./authStore";
import { getSessionDraftKey } from "../sessionDraft";

let callback: Parameters<typeof onAuthStateChange>[0];
let profile: { tenant_id: string; role: string; is_active?: boolean } | null = {
  tenant_id: "tenant-a",
  role: "admin",
};
let resolveProfile: ((value: unknown) => void) | null = null;
const authMock = mock.module("../../api/services/auth.service", {
  namedExports: {
    onAuthStateChange: (cb: typeof callback) => {
      callback = cb;
      return { data: { subscription: { unsubscribe() {} } } };
    },
  },
});
const supabaseMock = mock.module("../../api/lib/supabase", {
  namedExports: {
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              resolveProfile === null
                ? Promise.resolve({ data: profile, error: null })
                : new Promise((resolve) => {
                    resolveProfile = resolve;
                  }),
          }),
        }),
      }),
    },
  },
});
let store: typeof AuthStoreModule;
const session = (id: string) =>
  ({ access_token: "token-de-prueba", user: { id } as User }) as Session;
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

before(async () => {
  store = await import("./authStore");
});
after(() => {
  store.disposeAuthStoreSubscription();
  authMock.restore();
  supabaseMock.restore();
});

describe("eventos reales del callback de autenticación", () => {
  it("conserva el contexto al renovar o repetir SIGNED_IN, pero aplica una revocación real", async () => {
    callback("SIGNED_IN", session("user-a"));
    await flush();
    store.useAuthStore.setState({
      membershipStatus: "active",
      membershipLoaded: true,
      appRole: "admin",
    });
    for (const event of ["TOKEN_REFRESHED", "SIGNED_IN"]) {
      callback(event, session("user-a"));
      assert.equal(store.useAuthStore.getState().tenantId, "tenant-a");
      assert.equal(store.useAuthStore.getState().profileRole, "admin");
      assert.equal(store.useAuthStore.getState().membershipLoaded, true);
      await flush();
    }
    profile = { tenant_id: "tenant-a", role: "docente" };
    callback("TOKEN_REFRESHED", session("user-a"));
    await flush();
    assert.equal(store.useAuthStore.getState().profileRole, "docente");
  });

  it("borra permisos al cambiar de identidad y descarta una respuesta de la sesión anterior", async () => {
    callback("SIGNED_IN", session("user-b"));
    assert.equal(store.useAuthStore.getState().tenantId, null);
    assert.equal(store.useAuthStore.getState().appRole, null);
    assert.equal(store.useAuthStore.getState().membershipLoaded, false);
    await flush();
    resolveProfile = () => {};
    callback("TOKEN_REFRESHED", session("user-b"));
    await flush();
    callback("SIGNED_OUT", null);
    resolveProfile!({
      data: { tenant_id: "tenant-b", role: "admin" },
      error: null,
    });
    await flush();
    assert.equal(store.useAuthStore.getState().user, null);
    assert.equal(store.useAuthStore.getState().tenantId, null);
    assert.equal(store.useAuthStore.getState().appRole, null);
    resolveProfile = null;
  });

  it("informa y bloquea un perfil ausente o inactivo, en vez de dejar una carga infinita", async () => {
    for (const missingProfile of [
      null,
      { tenant_id: "tenant-a", role: "admin", is_active: false },
    ]) {
      profile = missingProfile;
      callback("SIGNED_IN", session("user-c"));
      await flush();
      const state = store.useAuthStore.getState();
      assert.equal(state.tenantId, null);
      assert.equal(state.appRole, null);
      assert.equal(state.membershipLoaded, true);
      assert.equal(state.membershipStatus, "error");
      assert.ok(state.membershipError);
    }
  });

  it("el cierre de sesión elimina solo los borradores privados de la identidad saliente", async () => {
    const previousWindow = Object.getOwnPropertyDescriptor(
      globalThis,
      "window",
    );
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        sessionStorage: {
          get length() {
            return values.size;
          },
          key: (index: number) => [...values.keys()][index] ?? null,
          removeItem: (key: string) => values.delete(key),
        },
      },
    });
    try {
      profile = { tenant_id: "tenant-a", role: "admin" };
      callback("SIGNED_IN", session("user-a"));
      await flush();
      const ownKey = getSessionDraftKey("letter", "tenant-a", "user-a")!;
      const otherKey = getSessionDraftKey("letter", "tenant-a", "user-b")!;
      values.set(ownKey, "trabajo propio");
      values.set(otherKey, "trabajo ajeno");
      values.set("auth-token-ficticio", "no tocar");
      callback("SIGNED_OUT", null);
      assert.equal(values.has(ownKey), false);
      assert.equal(values.has(otherKey), true);
      assert.equal(values.get("auth-token-ficticio"), "no tocar");
      assert.equal(store.useAuthStore.getState().membershipLoaded, false);
    } finally {
      if (previousWindow)
        Object.defineProperty(globalThis, "window", previousWindow);
      else Reflect.deleteProperty(globalThis, "window");
    }
  });
});
