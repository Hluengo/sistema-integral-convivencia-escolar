/** @license SPDX-License-Identifier: Apache-2.0 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(
  resolve(import.meta.dirname!, "usePersistentNotifications.ts"),
  "utf-8",
);

describe("usePersistentNotifications realtime lifecycle", () => {
  it("cierra el canal Realtime antes de entrar al BFCache", () => {
    assert.match(
      source,
      /window\.addEventListener\(["']pagehide["'], removeRealtimeChannel\)/,
    );
    assert.ok(source.includes("void supabase.removeChannel(channel)"));
  });

  it("recrea la suscripción y refresca datos al volver desde BFCache", () => {
    assert.ok(
      /window\.addEventListener\(["']pageshow["'], handlePageShow\)/.test(
        source,
      ),
    );
    assert.ok(source.includes("if (!event.persisted) return"));
    assert.ok(
      source.includes("setRealtimeLifecycleKey((current) => current + 1)"),
    );
    assert.match(
      source,
      /queryKey:\s*\[\s*["']notifications["']\s*,\s*tenantId\s*,\s*userId\s*\]/,
    );
  });

  it("sincroniza alertas actuales antes de marcar todo como leído", () => {
    const mutationStart = source.indexOf("const markAllMutation = useMutation");
    const mutationEnd = source.indexOf("const refresh = async", mutationStart);
    const mutation = source.slice(mutationStart, mutationEnd);

    assert.ok(mutationStart >= 0 && mutationEnd > mutationStart);
    assert.ok(
      mutation.indexOf("await Promise.all") <
        mutation.indexOf("await markAllNotificationsRead()"),
    );
  });

  it("expone errores de sincronización y permite reintentar", () => {
    assert.ok(source.includes("setSyncFailed(true)"));
    assert.ok(
      source.includes("persistedQuery.isError || syncFailed || actionFailed"),
    );
    assert.ok(source.includes("syncSignatureRef.current = signature;"));
    assert.ok(source.includes("persistedQuery.dataUpdatedAt"));
  });
});
