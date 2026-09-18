/** @license SPDX-License-Identifier: Apache-2.0 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { countDecisionSteps, getDecisionSteps } from "./decisionFundada";
import type { HechoRow } from "../api/services/hechos.service";

function hechoBase(overrides: Partial<HechoRow> = {}): HechoRow {
  return {
    id: "h1",
    tenant_id: "t1",
    causa_id: "DC-1",
    incidente_id: null,
    titulo: "Hecho de prueba",
    descripcion: "",
    estado: "denunciado",
    participacion_acreditada: false,
    rice_articulo: null,
    agravantes: [],
    atenuantes: [],
    medida_seleccionada: null,
    analisis_proporcionalidad: "",
    decision_fundada: "",
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("getDecisionSteps", () => {
  it("hecho recién denunciado solo completa el paso 1 y calificación", () => {
    const steps = getDecisionSteps({
      hecho: hechoBase(),
      evidenciasCount: 0,
      medidasPermitidasCount: 0,
      calificacionPresente: true,
    });
    assert.equal(steps.length, 12);
    const completas = steps.filter((s) => s.completa).map((s) => s.id);
    assert.deepEqual(completas, ["hecho", "calificacion"]);
  });

  it("no marca evidencias ni RICE sin datos reales", () => {
    const steps = getDecisionSteps({
      hecho: hechoBase({ estado: "acreditado" }),
      evidenciasCount: 0,
      medidasPermitidasCount: 3,
      calificacionPresente: true,
    });
    const porId = Object.fromEntries(steps.map((s) => [s.id, s.completa]));
    assert.equal(porId.evidencias, false);
    assert.equal(porId.rice, false);
    assert.equal(porId.determinacion, true);
    assert.equal(porId.medidas, true);
  });

  it("decisión requiere medida seleccionada y fundamento escrito", () => {
    const sinMedida = getDecisionSteps({
      hecho: hechoBase({ decision_fundada: "Se decide amonestar." }),
      evidenciasCount: 1,
      medidasPermitidasCount: 2,
      calificacionPresente: true,
    });
    assert.equal(sinMedida.find((s) => s.id === "decision")?.completa, false);
    const completa = getDecisionSteps({
      hecho: hechoBase({
        decision_fundada: "Se decide amonestar.",
        medida_seleccionada: "Amonestación escrita",
      }),
      evidenciasCount: 1,
      medidasPermitidasCount: 2,
      calificacionPresente: true,
    });
    assert.equal(completa.find((s) => s.id === "decision")?.completa, true);
  });

  it("countDecisionSteps resume avance", () => {
    const { completadas, total } = countDecisionSteps({
      hecho: hechoBase({
        estado: "acreditado",
        participacion_acreditada: true,
        rice_articulo: "Art. 18.c",
        agravantes: ["reincidencia"],
        atenuantes: ["primera_vez"],
      }),
      evidenciasCount: 2,
      medidasPermitidasCount: 4,
      calificacionPresente: true,
    });
    assert.equal(total, 12);
    assert.equal(completadas, 10);
  });
});
