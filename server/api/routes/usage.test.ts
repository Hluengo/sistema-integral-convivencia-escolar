/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasSafeProperties, isValidEventName } from "./usage.js";

describe("validación de eventos de uso", () => {
  it("acepta nombres snake_case acotados", () => {
    assert.equal(isValidEventName("expediente_abierto"), true);
    assert.equal(isValidEventName("a"), false);
    assert.equal(isValidEventName("Expediente_abierto"), false);
    assert.equal(isValidEventName("expediente-abierto"), false);
    assert.equal(isValidEventName("x".repeat(81)), false);
  });

  it("valida propiedades como objeto JSON de hasta 4 KB", () => {
    assert.equal(hasSafeProperties(undefined), true);
    assert.equal(hasSafeProperties({ view: "dashboard", count: 2 }), true);
    assert.equal(hasSafeProperties(null), false);
    assert.equal(hasSafeProperties([]), false);
    assert.equal(hasSafeProperties("evento"), false);
    assert.equal(hasSafeProperties({ payload: "x".repeat(4_001) }), false);
  });
});
