/** @license SPDX-License-Identifier: Apache-2.0 */

// Primero: define document antes de importar Testing Library.
import "global-jsdom/register";

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import RiceConductSelect from "./RiceConductSelect";
import { REGLAMENTO_CONDUCTAS } from "../../../reglamentoData";

// Radix crea eventos con el Event de Node; jsdom solo acepta los del DOM.
const jsdomWindow = document.defaultView as Window & typeof globalThis;
globalThis.Event = jsdomWindow.Event;
globalThis.CustomEvent = jsdomWindow.CustomEvent;

afterEach(cleanup);

const conducta = REGLAMENTO_CONDUCTAS[0];

function setup(currentObs?: string) {
  const calls = { obs: [] as string[], rice: [] as string[] };
  render(
    <RiceConductSelect
      currentObs={currentObs}
      setNewInfTipo={() => {}}
      setConductaRiceId={(value) => calls.rice.push(value)}
      setNewAulaSegura={() => {}}
      setNewObs={(value) => calls.obs.push(value)}
    />,
  );
  return calls;
}

function chooseConducta() {
  fireEvent.change(
    screen.getByLabelText(/Autocompletar desde Reglamento \(RICE\)/),
    { target: { value: conducta.id } },
  );
}

describe("RiceConductSelect", () => {
  it("pide confirmación antes de reemplazar observaciones manuales", () => {
    const calls = setup("Observación escrita a mano");
    chooseConducta();

    assert.ok(screen.getByText("Reemplazar observaciones"));
    assert.equal(calls.obs.length, 0);

    fireEvent.click(screen.getByRole("button", { name: "Reemplazar" }));

    assert.equal(calls.rice.at(-1), conducta.id);
    assert.equal(calls.obs.length, 1);
    assert.match(calls.obs[0] ?? "", /Reglamento Interno de Convivencia/);
  });

  it("aplica la conducta sin diálogo cuando no hay observaciones", () => {
    const calls = setup();
    chooseConducta();

    assert.equal(screen.queryByText("Reemplazar observaciones"), null);
    assert.equal(calls.obs.length, 1);
    assert.match(calls.obs[0] ?? "", /Reglamento Interno de Convivencia/);
  });
});
