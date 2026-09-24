/** @license SPDX-License-Identifier: Apache-2.0 */

import { ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const featureDir = import.meta.dirname!;
const source = (relativePath: string) =>
  readFileSync(resolve(featureDir, relativePath), "utf-8");

describe("Formulario de edición de expediente accesible", () => {
  it("usa componentes compartidos en vez de estilos locales duplicados", () => {
    const content = source("EditCausaModal/EditCausaModalForm.tsx");

    ok(content.includes('from "@/shared/ui/FormField"'));
    ok(content.includes("<FormField"));
    ok(content.includes("<Input"));
    ok(content.includes("<Select"));
    ok(!content.includes("const fieldClass"));
    ok(!content.includes("const labelClass"));
    ok(!content.includes("const selectClass"));
    ok(!content.includes("function FieldError"));
    ok(!content.includes("<FieldError"));
  });

  it("preserva los nombres accesibles que exige el flujo e2e", () => {
    const content = source("EditCausaModal/EditCausaModalForm.tsx");

    ok(content.includes('label="Tipo Infracción"'));
    ok(content.includes('id="edit-tipo-infraccion"'));
    ok(content.includes('label="Observaciones"'));
    ok(content.includes('id="edit-obs"'));
    ok(content.includes('label="Estado Actual"'));
    ok(content.includes('id="edit-estado"'));
    ok(content.includes('aria-label="Compromete Aula Segura"'));
    ok(content.includes("aria-describedby={"));
  });

  it("el error de FormField conserva id para aria-describedby", () => {
    const content = source("../../shared/ui/FormField.tsx");

    ok(content.includes("${htmlFor}-error"));
    ok(content.includes('role="alert"'));
  });
});
