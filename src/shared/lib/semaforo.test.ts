/** @license SPDX-License-Identifier: Apache-2.0 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getSemaforoPlazos,
  semaforoDeGarantia,
  semaforoDePlazo,
} from "./semaforo";
import type { Causa } from "./types";

describe("semaforoDePlazo", () => {
  it("mapea vencido/alerta/cumplido/no_iniciado a rojo/amarillo/verde/gris", () => {
    assert.equal(semaforoDePlazo("vencido"), "rojo");
    assert.equal(semaforoDePlazo("alerta"), "amarillo");
    assert.equal(semaforoDePlazo("cumplido"), "verde");
    assert.equal(semaforoDePlazo("no_iniciado"), "gris");
  });
});

describe("semaforoDeGarantia", () => {
  it("mapea verificada/pendiente/bloqueante/no_aplica", () => {
    assert.equal(semaforoDeGarantia("verificada"), "verde");
    assert.equal(semaforoDeGarantia("pendiente"), "amarillo");
    assert.equal(semaforoDeGarantia("bloqueante"), "rojo");
    assert.equal(semaforoDeGarantia("no_aplica"), "gris");
  });
});

describe("getSemaforoPlazos", () => {
  it("retorna los 4 plazos con semáforo y detalle textual", () => {
    const causa = {
      fechaApertura: new Date().toISOString(),
      estadoActual: "Indagación",
      checklistDebidoProceso: [],
      bitacora: [],
    } as unknown as Causa;
    const plazos = getSemaforoPlazos(causa);
    assert.equal(plazos.length, 4);
    assert.deepEqual(
      plazos.map((p) => p.id),
      ["indagacion", "concluyente", "suspension", "superintendencia"],
    );
    for (const p of plazos) {
      assert.ok(
        ["verde", "amarillo", "rojo", "gris"].includes(p.semaforo),
        `${p.id} con semáforo válido`,
      );
      assert.equal(typeof p.detalle, "string");
      assert.ok(p.detalle.length > 0, `${p.id} con detalle no vacío`);
    }
  });
});
