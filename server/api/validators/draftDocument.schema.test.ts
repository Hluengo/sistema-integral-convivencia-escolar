/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { draftDocumentBodySchema } from "./draftDocument.schema";
import * as barrel from "../../../src/shared/lib/schemas/index";

describe("draftDocumentBodySchema (cliente/servidor comparten zod)", () => {
  it("acepta un cuerpo válido y aplica defaults", () => {
    const parsed = draftDocumentBodySchema.safeParse({
      docType: "informe_cierre_indagacion",
      id: "DC-2026-001",
      studentName: "Estudiante Pérez",
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.course, "");
      assert.deepEqual(parsed.data.bitacora, []);
      assert.deepEqual(parsed.data.checklist, []);
    }
  });

  it("rechaza docType fuera de catálogo con mensaje en español", () => {
    const parsed = draftDocumentBodySchema.safeParse({
      docType: "documento_legacy",
      id: "DC-2026-001",
      studentName: "Estudiante Pérez",
    });
    assert.equal(parsed.success, false);
    if (!parsed.success) {
      assert.match(
        parsed.error.issues[0]?.message ?? "",
        /Tipo de documento no válido/,
      );
    }
  });

  it("exige studentName como campo requerido", () => {
    const parsed = draftDocumentBodySchema.safeParse({
      docType: "informe_concluyente",
      id: "DC-2026-001",
      studentName: "",
    });
    assert.equal(parsed.success, false);
  });
});

describe("barril único de esquemas compartidos", () => {
  it("re-exporta formularios y dominio desde un solo índice", () => {
    for (const key of [
      "CausaSchema",
      "BitacoraEntrySchema",
      "ChecklistItemSchema",
      "newCausaFormSchema",
      "editCausaFormSchema",
      "loginFormSchema",
      "physicalCartaRegistrationSchema",
      "studentHistoryEntrySchema",
    ]) {
      assert.ok(
        (barrel as Record<string, unknown>)[key] !== undefined,
        `${key} debe exportarse desde el barril`,
      );
    }
  });
});
