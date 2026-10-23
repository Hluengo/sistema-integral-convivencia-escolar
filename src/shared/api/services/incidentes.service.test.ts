/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";

const writes: Array<Record<string, unknown>> = [];
const tenantId = "30000000-0000-4000-8000-000000000001";
let rpcError: { code: string; message: string } | null = null;
let causeIds = ["DC-2026-001", "DC-2026-002"];
await mock.module("../lib/supabase", {
  namedExports: {
    supabase: {
      rpc: async (name: string, args: Record<string, unknown>) => {
        writes.push({ name, ...args });
        return {
          error: rpcError,
          data: {
            incidente: {
              id: "80000000-0000-4000-8000-000000000001",
              tenant_id: tenantId,
              fecha_hora: input.fechaHora,
              lugar: input.lugar,
              tipo: input.tipo,
              descripcion: input.descripcion,
              responsable: input.responsable,
              created_at: "2026-10-22T12:00:00Z",
              updated_at: "2026-10-22T12:00:00Z",
            },
            causaIds: causeIds,
          },
        };
      },
      from: () => {
        throw new Error("No se permite volver al alta secuencial");
      },
    },
  },
});
await mock.module("./storage.service", {
  namedExports: { normalizeDocumentPath: (value: string) => value },
});
const { createIncidenteWithCausas } = await import("./incidentes.service");
const input = {
  requestId: "70000000-0000-4000-8000-000000000001",
  courseId: "50000000-0000-4000-8000-000000000001",
  studentIds: [
    "60000000-0000-4000-8000-000000000001",
    "60000000-0000-4000-8000-000000000002",
  ],
  fechaHora: "2026-04-15T15:30:00.000Z",
  lugar: "Patio",
  descripcion: "Hecho ficticio",
  responsable: "Inspectoría",
  tipo: "Art. 25 N° 1 · Grave",
  conductaRiceId: "G1",
  tipoInfraccion: "Grave" as const,
  comprometeAulaSegura: false,
};
beforeEach(() => {
  writes.length = 0;
  rpcError = null;
  causeIds = ["DC-2026-001", "DC-2026-002"];
});

describe("fecha del incidente", () => {
  it("rechaza fecha vacía o inválida antes de escribir y no la sustituye por ahora", async () => {
    for (const fechaHora of ["", "no-es-fecha", "2026-02-30T12:30:00.000Z"]) {
      const before = writes.length;
      await assert.rejects(() =>
        createIncidenteWithCausas({ ...input, fechaHora }, tenantId),
      );
      assert.equal(writes.length, before);
    }
  });
  it("conserva el instante del hecho anterior también al reintentar", async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await createIncidenteWithCausas(input, tenantId);
      assert.equal(writes.at(-1)?.p_request_id, input.requestId);
      assert.equal(
        (writes.at(-1)?.p_request as typeof input).fechaHora,
        input.fechaHora,
      );
      assert.equal(writes.at(-1)?.name, "create_incidente_with_causas");
      assert.equal(result.incidente.fechaHora, input.fechaHora);
      assert.deepEqual(result.causaIds, ["DC-2026-001", "DC-2026-002"]);
    }
  });
  it("rechaza estudiantes duplicados, falta inexistente y gravedad incoherente antes de escribir", async () => {
    for (const changed of [
      { studentIds: [input.studentIds[0], input.studentIds[0]] },
      { conductaRiceId: "desconocida" },
      { tipoInfraccion: "Leve" as const },
    ]) {
      await assert.rejects(() =>
        createIncidenteWithCausas({ ...input, ...changed }, tenantId),
      );
    }
    assert.equal(writes.length, 0);
  });
  it("falla de forma visible si la RPC no está disponible, sin volver a inserciones parciales", async () => {
    rpcError = { code: "PGRST202", message: "function not found" };
    await assert.rejects(
      () => createIncidenteWithCausas(input, tenantId),
      /atómica/,
    );
    assert.equal(writes.length, 1);
  });
  it("no interpreta una respuesta parcial como confirmación de todo el grupo", async () => {
    causeIds = ["DC-2026-001"];
    await assert.rejects(
      () => createIncidenteWithCausas(input, tenantId),
      /complet|confirm/i,
    );
  });
  it("no escribe sin colegio y conserva el error ante denegación o caída de la DB", async () => {
    await assert.rejects(
      () => createIncidenteWithCausas(input, null),
      /colegio/,
    );
    assert.equal(writes.length, 0);
    rpcError = { code: "42501", message: "denegado" };
    await assert.rejects(
      () => createIncidenteWithCausas(input, tenantId),
      /permiso/,
    );
    rpcError = {
      code: "22023",
      message: "La solicitud ya se confirmó con otro contenido.",
    };
    await assert.rejects(
      () => createIncidenteWithCausas(input, tenantId),
      /otro contenido/,
    );
    rpcError = { code: "08006", message: "conexión interrumpida" };
    await assert.rejects(
      () => createIncidenteWithCausas(input, tenantId),
      /sin duplicarlos/,
    );
  });
  it("rechaza una confirmación para otro colegio", async () => {
    await assert.rejects(
      () =>
        createIncidenteWithCausas(
          input,
          "30000000-0000-4000-8000-000000000002",
        ),
      /confirmación completa/,
    );
  });
});
