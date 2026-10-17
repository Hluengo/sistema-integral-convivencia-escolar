/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  isChileanRutFormat,
  isValidRut,
  newCausaFormSchema,
  normalizeRutInput,
} from "./newCausaForm";

const validInput = {
  selectedCourseId: "course-1",
  selectedStudentId: "student-1",
  newEstNombre: "Antonia Perez",
  newEstRut: "12.345.678-5",
  newInfTipo: "Grave",
  newAulaSegura: false,
  newObs: "Registro inicial de los hechos informados.",
  newResponsable: "Encargado de Convivencia",
} as const;

test("normalizeRutInput normaliza puntos, espacios y guion", () => {
  assert.equal(normalizeRutInput(" 12.345.678-k "), "12345678-K");
  assert.equal(normalizeRutInput("123456789"), "12345678-9");
});

test("isValidRut valida el dígito verificador por módulo 11", () => {
  assert.equal(isValidRut("12.345.678-5"), true);
  assert.equal(isValidRut("11.111.111-1"), true);
  assert.equal(isValidRut("9.876.543-3"), true);
  assert.equal(isValidRut("12.345.678-9"), false);
  assert.equal(isValidRut("9.876.543-K"), false);
});

test("isChileanRutFormat acepta formato RUN chileno sin exigir checksum", () => {
  assert.equal(isChileanRutFormat("12.345.678-9"), true);
  assert.equal(isChileanRutFormat("12345678-k"), true);
  assert.equal(isChileanRutFormat("1234"), false);
});

test("newCausaFormSchema valida los campos obligatorios del nuevo expediente", () => {
  const parsed = newCausaFormSchema.parse(validInput);

  assert.equal(parsed.newEstRut, "12345678-5");
  assert.equal(parsed.selectedCourseId, "course-1");
});

test("newCausaFormSchema rechaza un RUN con dígito verificador incorrecto", () => {
  const result = newCausaFormSchema.safeParse({
    ...validInput,
    newEstRut: "12.345.678-9",
  });
  assert.equal(result.success, false);
});

test("newCausaFormSchema reporta curso, estudiante, RUT, relato y responsable inválidos", () => {
  const result = newCausaFormSchema.safeParse({
    ...validInput,
    selectedCourseId: "",
    newEstNombre: "",
    newEstRut: "abc",
    newObs: "corto",
    newResponsable: "",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    const fields = [
      ...new Set(result.error.issues.map((issue) => issue.path[0])),
    ];
    assert.deepEqual(fields, [
      "selectedCourseId",
      "newEstNombre",
      "newEstRut",
      "newObs",
      "newResponsable",
    ]);
  }
});
