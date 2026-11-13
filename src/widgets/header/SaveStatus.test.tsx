/** @license SPDX-License-Identifier: Apache-2.0 */

// Primero: define document antes de importar Testing Library.
import "global-jsdom/register";

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import SaveStatus from "./SaveStatus";

afterEach(cleanup);

describe("SaveStatus", () => {
  it("no muestra nada en idle", () => {
    const { container } = render(<SaveStatus status="idle" />);
    assert.equal(container.textContent, "");
  });

  it("muestra Guardado sin botón de reintento", () => {
    render(<SaveStatus status="saved" />);
    assert.equal(screen.getByText("Guardado").textContent, "Guardado");
    assert.equal(screen.queryByRole("button"), null);
  });

  it("en error ofrece reintentar y ejecuta el handler", () => {
    let calls = 0;
    render(<SaveStatus status="error" onRetry={() => (calls += 1)} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Reintentar sincronización" }),
    );

    assert.equal(calls, 1);
  });
});
