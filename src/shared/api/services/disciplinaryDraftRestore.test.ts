/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { beforeEach, describe, it, mock } from "node:test";

const bytes = new TextEncoder().encode("%PDF-1.4\nPDF ficticio de prueba");
const hash = createHash("sha256").update(bytes).digest("hex");
const input = {
  bucket: "disciplinary-processes",
  storagePath: "tenant-a/student-a/draft/test.pdf",
  originalName: "prueba.pdf",
  storedName: "test.pdf",
  mimeType: "application/pdf",
  size: bytes.byteLength,
};
let row: { file_hash: string; status: string } | null;
let downloadError: Error | null;
let downloads: string[];
let filters: Array<[string, unknown]>;
await mock.module("../lib/supabase", {
  namedExports: {
    supabase: {
      from: () => {
        const query = {
          select: () => query,
          eq: (column: string, value: unknown) => {
            filters.push([column, value]);
            return query;
          },
          maybeSingle: async () => ({ data: row, error: null }),
        };
        return query;
      },
      storage: {
        from: () => ({
          download: async (path: string) => {
            downloads.push(path);
            return {
              data: downloadError ? null : new Blob([bytes]),
              error: downloadError,
            };
          },
        }),
      },
    },
  },
});
const service = await import("./disciplinary-storage.service");
beforeEach(() => {
  row = { file_hash: hash, status: "completed" };
  downloadError = null;
  downloads = [];
  filters = [];
});

describe("recuperación de un PDF privado ya subido", () => {
  it("revalida tenant, análisis y hash antes de reconstruir el archivo sin subir ni analizar otra vez", async () => {
    const file = await service.restoreDisciplinaryFile(
      input,
      "tenant-a",
      hash,
      "analysis-a",
    );
    assert.equal(file.name, input.originalName);
    assert.equal(file.size, bytes.byteLength);
    assert.equal(file.type, "application/pdf");
    assert.deepEqual(new Uint8Array(await file.arrayBuffer()), bytes);
    assert.deepEqual(filters, [
      ["tenant_id", "tenant-a"],
      ["id", "analysis-a"],
    ]);
    assert.deepEqual(downloads, [input.storagePath]);
  });
  it("rechaza otro colegio, bucket o ruta alterada antes de acceder a la base o al archivo", async () => {
    for (const storagePath of [
      "tenant-b/student-a/draft/test.pdf",
      "tenant-a/../test.pdf",
      "tenant-a/%2e%2e/test.pdf",
    ]) {
      await assert.rejects(() =>
        service.restoreDisciplinaryFile(
          { ...input, storagePath },
          "tenant-a",
          hash,
          "analysis-a",
        ),
      );
    }
    await assert.rejects(() =>
      service.restoreDisciplinaryFile(
        { ...input, bucket: "otro" },
        "tenant-a",
        hash,
        "analysis-a",
      ),
    );
    assert.equal(filters.length, 0);
    assert.equal(downloads.length, 0);
  });
  it("rechaza análisis ausente, de otro contenido o ya confirmado sin descargarlo", async () => {
    for (const analysis of [
      null,
      { file_hash: "0".repeat(64), status: "completed" },
      { file_hash: hash, status: "confirmed" },
    ]) {
      row = analysis;
      await assert.rejects(() =>
        service.restoreDisciplinaryFile(input, "tenant-a", hash, "analysis-a"),
      );
    }
    assert.equal(downloads.length, 0);
  });
  it("conserva un fallo visible si el archivo ya no está disponible o cambió su contenido", async () => {
    downloadError = new Error("denegado");
    await assert.rejects(
      () =>
        service.restoreDisciplinaryFile(input, "tenant-a", hash, "analysis-a"),
      /reabrir|descargar/i,
    );
    downloadError = null;
    row = { file_hash: "0".repeat(64), status: "completed" };
    await assert.rejects(
      () =>
        service.restoreDisciplinaryFile(
          input,
          "tenant-a",
          "0".repeat(64),
          "analysis-a",
        ),
      /coincide/i,
    );
  });
});
