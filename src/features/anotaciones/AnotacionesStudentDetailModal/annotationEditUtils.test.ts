/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toDateTimeLocalValue, toIsoDateTime } from "./annotationEditUtils";

describe("annotationEditUtils", () => {
  it("convierte una fecha ISO a un valor datetime-local válido", () => {
    assert.equal(
      toDateTimeLocalValue("2026-07-27T16:45:00.000Z"),
      "2026-07-27T12:45",
    );
  });

  it("convierte el valor local a ISO", () => {
    assert.equal(toIsoDateTime("2026-07-27T12:45"), "2026-07-27T16:45:00.000Z");
  });

  it("considera el horario de verano chileno", () => {
    assert.equal(toIsoDateTime("2026-12-10T00:30"), "2026-12-10T03:30:00.000Z");
  });

  it("rechaza una fecha inválida", () => {
    assert.throws(() => toIsoDateTime(""), /Ingresa una fecha y hora válidas/);
  });

  it("rechaza la hora inexistente del cambio de horario chileno", () => {
    assert.throws(
      () => toIsoDateTime("2026-09-06T00:30"),
      /fecha y hora válidas/,
    );
  });

  it("no depende de la zona horaria del equipo que registra el incidente", () => {
    const previous = process.env.TZ;
    try {
      process.env.TZ = "Asia/Tokyo";
      assert.equal(
        toIsoDateTime("2026-04-15T09:45"),
        "2026-04-15T13:45:00.000Z",
      );
      assert.equal(
        toDateTimeLocalValue("2026-04-15T13:45:00.000Z"),
        "2026-04-15T09:45",
      );
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });
});
