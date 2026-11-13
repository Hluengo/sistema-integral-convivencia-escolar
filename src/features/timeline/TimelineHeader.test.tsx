/** @license SPDX-License-Identifier: Apache-2.0 */

// Primero: define document antes de importar Testing Library.
import "global-jsdom/register";

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import TimelineHeader from "./TimelineHeader";
import { EstadoCausa, type Causa } from "../../shared/lib/types";

afterEach(cleanup);

const causa: Causa = {
  id: "DC-2026-001",
  estudianteNombre: "Estudiante Ficticio",
  estudianteCurso: "8 A",
  nnaProtectedName: "E. F.",
  runEstudiante: "12.345.678-9",
  fechaApertura: "2026-11-01",
  estadoActual: EstadoCausa.DENUNCIA_RECEPCIONADA,
  tipoInfraccion: "Grave",
  responsable: "Inspectoría ficticia",
  comprometeAulaSegura: false,
  fechaUltimaActualizacion: "2026-11-01",
  observaciones: "",
  bitacora: [],
  checklistDebidoProceso: [],
};

const baseProps = {
  causa,
  canDelete: false,
  privacyMode: false,
  onEditClick: () => {},
  onDeleteClick: () => {},
  onForceCloseClick: () => {},
  breaches: [],
};

describe("TimelineHeader", () => {
  it("muestra alerta con reintento cuando falla la sincronización", () => {
    let retries = 0;
    render(
      <TimelineHeader
        {...baseProps}
        currentRole="convivencia_escolar"
        saveStatus="error"
        onRetrySave={() => (retries += 1)}
      />,
    );

    assert.ok(screen.getByText(/No se pudieron sincronizar los cambios/));
    fireEvent.click(
      screen.getByRole("button", { name: "Reintentar sincronización" }),
    );
    assert.equal(retries, 1);
  });

  it("no muestra la alerta a un docente aunque falle el guardado", () => {
    render(
      <TimelineHeader
        {...baseProps}
        currentRole="docente"
        saveStatus="error"
        onRetrySave={() => {}}
      />,
    );

    assert.equal(
      screen.queryByText(/No se pudieron sincronizar los cambios/),
      null,
    );
  });
});
