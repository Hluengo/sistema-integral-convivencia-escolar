/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getStudentState } from "./newCausaFormState";

describe("getStudentState", () => {
  it("pide curso primero cuando no hay curso", () => {
    assert.equal(getStudentState("", false, 0), "no-course");
    assert.equal(getStudentState("", true, 5), "no-course");
  });

  it("muestra carga mientras trae estudiantes", () => {
    assert.equal(getStudentState("c1", true, 0), "loading");
  });

  it("lista estudiantes cuando el curso tiene", () => {
    assert.equal(getStudentState("c1", false, 3), "has-students");
  });

  it("permite ingreso manual cuando el curso no tiene estudiantes", () => {
    assert.equal(getStudentState("c1", false, 0), "no-students");
  });
});
