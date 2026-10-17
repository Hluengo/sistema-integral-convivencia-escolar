/** @license SPDX-License-Identifier: Apache-2.0 */

import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  archiveSupersededCartas,
  isSupersedableCarta,
} from "./bulkCartaWorkflow.js";

test("isSupersedableCarta acepta la vigente pendiente", () => {
  assert.equal(isSupersedableCarta("Vigente", []), true);
  assert.equal(isSupersedableCarta("Vigente", ["suggested", "printed"]), true);
});

test("isSupersedableCarta conserva historial cerrado y anuladas", () => {
  assert.equal(isSupersedableCarta("Anulada", []), false);
  assert.equal(isSupersedableCarta("Vigente", ["processed_manually"]), false);
  assert.equal(isSupersedableCarta("Vigente", ["archived"]), false);
  assert.equal(isSupersedableCarta("Vigente", ["annulled"]), false);
  assert.equal(isSupersedableCarta(null, []), false);
});

interface FakeClientData {
  cartas: Array<{ id: string; status: string | null }>;
  events: Array<{ carta_id: string; event_type: string }>;
  insertError?: Error | null;
}

/** Cliente falso: `carta_events.insert` siempre falla si hay insertError. */
function createFakeClient(data: FakeClientData): SupabaseClient {
  const client = {
    from(table: string) {
      let inserting = false;
      const builder = {
        select: () => builder,
        eq: () => builder,
        neq: () => builder,
        in: () => builder,
        range: () => builder,
        limit: () => builder,
        insert: () => {
          inserting = true;
          return builder;
        },
        then(onFulfilled?: (value: unknown) => unknown) {
          const result = inserting
            ? { data: null, error: data.insertError ?? null }
            : {
                data:
                  table === "cartas_disciplinarias" ? data.cartas : data.events,
                error: null,
              };
          return Promise.resolve(onFulfilled ? onFulfilled(result) : result);
        },
      };
      return builder;
    },
  };
  return client as unknown as SupabaseClient;
}

test("archiveSupersededCartas propaga el fallo del evento de archivado", async () => {
  const client = createFakeClient({
    cartas: [{ id: "carta-vieja", status: "Vigente" }],
    events: [{ carta_id: "carta-vieja", event_type: "suggested" }],
    insertError: new Error("insert denied"),
  });

  await assert.rejects(
    archiveSupersededCartas(
      client,
      "tenant-1",
      "student-1",
      "Carta",
      "carta-nueva",
    ),
    /insert denied/,
  );
});

test("archiveSupersededCartas cuenta las vigentes archivadas", async () => {
  const client = createFakeClient({
    cartas: [{ id: "carta-vieja", status: "Vigente" }],
    events: [{ carta_id: "carta-vieja", event_type: "suggested" }],
  });

  assert.equal(
    await archiveSupersededCartas(
      client,
      "tenant-1",
      "student-1",
      "Carta",
      "carta-nueva",
    ),
    1,
  );
});
