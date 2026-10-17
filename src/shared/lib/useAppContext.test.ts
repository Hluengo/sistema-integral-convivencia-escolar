/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import * as permissions from "./causaPermissions";

const { canDeleteCausaForRoles, canReopenCausaForRoles, resolveCausaUserRole } =
  permissions;

describe("resolveCausaUserRole", () => {
  it("deriva el rol de la sesión sin mantener un rol privilegiado en el store de UI", () => {
    const context = readFileSync(
      new URL("./useAppContext.ts", import.meta.url),
      "utf8",
    );
    const uiStore = readFileSync(
      new URL("./stores/uiStore.ts", import.meta.url),
      "utf8",
    );
    assert.ok(context.includes("resolveCausaUserRole(profileRole, appRole)"));
    assert.doesNotMatch(uiStore, /currentRole/);
  });

  it("mantiene a docentes y profesores jefes en modo docente desde ambas fuentes", () => {
    for (const role of ["teacher", "profesor_jefe"]) {
      assert.equal(resolveCausaUserRole(role, null), "docente");
      assert.equal(resolveCausaUserRole(null, role), "docente");
      assert.equal(resolveCausaUserRole(role, role), "docente");
    }
  });

  it("conserva las facultades de los roles administrativos y de convivencia", () => {
    for (const role of ["superadmin", "admin", "direccion"]) {
      assert.equal(resolveCausaUserRole(role, "teacher"), "director_rector");
      assert.equal(resolveCausaUserRole("teacher", role), "director_rector");
    }
    for (const role of ["convivencia", "inspectoria", "inspector", "staff"]) {
      assert.equal(
        resolveCausaUserRole(role, "teacher"),
        "convivencia_escolar",
      );
      assert.equal(
        resolveCausaUserRole("teacher", role),
        "convivencia_escolar",
      );
    }
  });

  it("no concede edición cuando los roles faltan o no están autorizados", () => {
    for (const role of [null, "", "desconocido", "user"]) {
      assert.equal(resolveCausaUserRole(role, null), "docente");
      assert.equal(resolveCausaUserRole(null, role), "docente");
    }
  });
});

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
