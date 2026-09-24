/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BitacoraEntry } from "../../lib/types";

interface MutableRpcClient {
  rpc: (
    fn: string,
    params?: unknown,
  ) => Promise<{ data: unknown; error: Error | null }>;
}

process.env.VITE_SUPABASE_URL ??= "https://example.supabase.co";
process.env.VITE_SUPABASE_ANON_KEY ??= "anon-key-for-unit-tests";

describe("saveBitacora", () => {
  it("prepara solo entradas cambiadas e IDs removidos para la RPC atómica", async () => {
    const { buildBitacoraSnapshotDelta } = await import("./bitacora.service");
    const previous: BitacoraEntry[] = [
      createBitacoraEntry({ id: "permanece", descripcion: "Texto anterior" }),
      createBitacoraEntry({ id: "removida" }),
    ];
    const current: BitacoraEntry[] = [
      createBitacoraEntry({
        id: "permanece",
        descripcion: "Texto actualizado",
        documentoAdjunto: "caso/evidencia.pdf",
      }),
      createBitacoraEntry({ id: "nueva", compartidoGrupal: true }),
    ];

    const delta = buildBitacoraSnapshotDelta(current, previous);

    assert.deepEqual(delta.removedIds, ["removida"]);
    assert.deepEqual(
      delta.rows.map((row) => row.id),
      ["permanece", "nueva"],
    );
    assert.equal(delta.rows[0].descripcion, "Texto actualizado");
    assert.equal(delta.rows[0].documento_adjunto, "caso/evidencia.pdf");
    assert.equal(delta.rows[1].compartido_grupal, true);
    assert.deepEqual(delta.rows[1].participantes, []);
  });

  it("ignora cambios y eliminaciones de registros heredados desde otra causa", async () => {
    const { buildBitacoraSnapshotDelta } = await import("./bitacora.service");
    const inherited = createBitacoraEntry({
      id: "heredada",
      causaOrigenId: "DC-2026-001",
      compartidoGrupal: true,
    });
    const delta = buildBitacoraSnapshotDelta([], [inherited], "DC-2026-002");

    assert.deepEqual(delta.rows, []);
    assert.deepEqual(delta.removedIds, []);
  });

  it("conserva citación, correo y descargo al preparar el snapshot", async () => {
    const { buildBitacoraSnapshotDelta } = await import("./bitacora.service");
    const entries = (["Citación", "Correo", "Descargo"] as const).map(
      (tipo, index) => createBitacoraEntry({ id: `entry-${index}`, tipo }),
    );

    const delta = buildBitacoraSnapshotDelta(entries, []);

    assert.deepEqual(
      delta.rows.map((row) => row.tipo),
      ["Citación", "Correo", "Descargo"],
    );
  });

  it("reporta false cuando la RPC transaccional falla", async () => {
    const [{ supabase }, { saveBitacora }] = await Promise.all([
      import("../lib/supabase"),
      import("./bitacora.service"),
    ]);
    const rpcClient = supabase as unknown as MutableRpcClient;
    const originalRpc = rpcClient.rpc;
    const originalConsoleError = console.error;
    rpcClient.rpc = async () => ({ data: null, error: new Error("rollback") });
    console.error = () => undefined;

    try {
      const result = await saveBitacora(
        "DC-2026-001",
        [createBitacoraEntry({ id: "nueva" })],
        [],
      );

      assert.equal(result, false);
    } finally {
      rpcClient.rpc = originalRpc;
      console.error = originalConsoleError;
    }
  });
});

function createBitacoraEntry(
  overrides: Partial<BitacoraEntry> = {},
): BitacoraEntry {
  return {
    id: "entry",
    fecha: "2026-08-04",
    tipo: "Otro",
    titulo: "Registro",
    descripcion: "Texto anterior",
    participantes: [],
    ...overrides,
  };
}
