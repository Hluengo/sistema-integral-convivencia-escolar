/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canDeleteCausaForRoles,
  canReopenCausaForRoles,
} from "./causaPermissions";

describe("canDeleteCausaForRoles", () => {
  it("permite eliminar a superadmin desde cualquiera de sus fuentes de rol", () => {
    assert.equal(canDeleteCausaForRoles("superadmin", null), true);
    assert.equal(canDeleteCausaForRoles(null, "superadmin"), true);
  });

  it("mantiene la eliminación restringida a roles administrativos", () => {
    assert.equal(canDeleteCausaForRoles("convivencia", null), false);
    assert.equal(canDeleteCausaForRoles(null, "teacher"), false);
  });
});

describe("canReopenCausaForRoles", () => {
  it("solo habilita la reapertura a roles administrativos", () => {
    assert.equal(canReopenCausaForRoles("direccion", null), true);
    assert.equal(canReopenCausaForRoles(null, "admin"), true);
    assert.equal(canReopenCausaForRoles("convivencia", null), false);
  });
});
