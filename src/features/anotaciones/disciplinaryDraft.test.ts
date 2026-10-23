/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pdfReviewDraftSchema } from "./disciplinaryDraft";

describe("schema del borrador de revisión PDF", () => {
  it("restaura un borrador incompleto sin guardar archivos ni estados de petición o confirmación", () => {
    const result = pdfReviewDraftSchema.parse({
      step: "review",
      classification: "compromiso_conductual",
      annotations: [],
      file: { secret: "no guardar" },
      status: "confirming",
      accessToken: "no guardar",
      confirmed: true,
    });
    assert.deepEqual(result, {
      step: "review",
      classification: "compromiso_conductual",
      annotations: [],
    });
  });
  it("rechaza confirmaciones restauradas, tipos inválidos y claves de idempotencia alteradas", () => {
    for (const input of [
      { step: "success" },
      { annotations: ["no válida"] },
      { idempotencyKey: "no-uuid" },
      { uploadedFile: { bucket: "publico" } },
    ]) {
      assert.equal(pdfReviewDraftSchema.safeParse(input).success, false);
    }
  });
});
