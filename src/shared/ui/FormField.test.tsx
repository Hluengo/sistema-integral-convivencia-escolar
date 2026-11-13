/** @license SPDX-License-Identifier: Apache-2.0 */

// Primero: define document antes de importar Testing Library.
import "global-jsdom/register";

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { cleanup, render, screen } from "@testing-library/react";
import FormField from "./FormField";
import Input from "./Input";

// node:test no expone un afterEach global, así que RTL no limpia solo.
afterEach(cleanup);

describe("FormField", () => {
  it("asocia label, input y error para lectores de pantalla", () => {
    render(
      <FormField
        label="Observaciones"
        htmlFor="edit-obs"
        error="Campo obligatorio"
      >
        <Input id="edit-obs" />
      </FormField>,
    );

    const input = screen.getByLabelText("Observaciones");
    assert.equal(input.id, "edit-obs");

    const alert = screen.getByRole("alert");
    assert.equal(alert.textContent, "Campo obligatorio");
    assert.equal(alert.id, "edit-obs-error");
  });
});
