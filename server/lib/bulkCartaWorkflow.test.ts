/** @license SPDX-License-Identifier: Apache-2.0 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { isSupersedableCarta } from "./bulkCartaWorkflow.js";

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
