/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getBaseChecklist, getPhaseProgress } from "./data";
import { EstadoCausa, type Causa } from "./types";

const completedChecklist = (completedIds: string[]) =>
  getBaseChecklist().map((item) => ({
    ...item,
    completado: completedIds.includes(item.id),
    fechaCompletado: completedIds.includes(item.id) ? "2026-08-10" : undefined,
  }));

const causa = (
  completedIds: string[],
  overrides: Partial<Causa> = {},
): Causa => ({
  id: "DC-2026-014",
  estudianteNombre: "Nombre completo",
  estudianteCurso: "7° Básico A",
  nnaProtectedName: "N. C.",
  runEstudiante: "12.345.678-9",
  fechaApertura: "2026-07-01",
  estadoActual: EstadoCausa.EN_PROCESO_INDAGACION,
  tipoInfraccion: "Grave",
  responsable: "Responsable",
  comprometeAulaSegura: false,
  fechaUltimaActualizacion: "2026-07-01",
  observaciones: "Resumen",
  bitacora: [],
  checklistDebidoProceso: completedChecklist(completedIds),
  ...overrides,
});

describe("versiones del checklist procedimental", () => {
  it("mantiene los hitos históricos en v1 y agrega los reforzados en v2", () => {
    const legacyIds = new Set(getBaseChecklist().map((item) => item.id));
    const currentIds = new Set(getBaseChecklist(2).map((item) => item.id));

    for (const id of [
      "chk_inv_7",
      "chk_inv_8",
      "chk_inv_9",
      "chk_res_7",
      "chk_res_8",
      "chk_res_9",
      "chk_imp_6",
      "chk_imp_7",
    ]) {
      assert.equal(legacyIds.has(id), false);
      assert.equal(currentIds.has(id), true);
    }
  });
});

describe("getPhaseProgress", () => {
  it("calcula Investigación sin mediación como 2/2 y no como 2/6", () => {
    const progress = getPhaseProgress(
      causa(["chk_inv_1", "chk_inv_2"]),
      "Investigación",
    );

    assert.equal(progress.completed, 2);
    assert.equal(progress.total, 2);
  });

  it("no suma la mediación alternativa cuando hay acuerdo", () => {
    const progress = getPhaseProgress(
      causa(["chk_inv_1", "chk_inv_2", "chk_inv_3", "chk_inv_4", "chk_inv_5"]),
      "Investigación",
    );

    assert.equal(progress.completed, 2);
    assert.equal(progress.total, 2);
  });

  it("no suma la mediación alternativa cuando fracasa y retorna a investigación", () => {
    const progress = getPhaseProgress(
      causa(["chk_inv_1", "chk_inv_2", "chk_inv_3", "chk_inv_4", "chk_inv_6"]),
      "Investigación",
    );

    assert.equal(progress.completed, 2);
    assert.equal(progress.total, 2);
  });

  it("cuenta solo actuaciones visibles desde Resolución en adelante", () => {
    const progress = getPhaseProgress(
      causa(["chk_res_1", "chk_res_2"]),
      "Resolución",
    );

    assert.equal(progress.completed, 1);
    assert.equal(progress.total, 3);
  });

  it("mantiene mutuamente excluidos solicitud y plazo vencido en v2", () => {
    const current = causa(["chk_imp_2"], {
      proceduralModelVersion: 2,
      checklistDebidoProceso: getBaseChecklist(2).map((item) => ({
        ...item,
        completado: item.id === "chk_imp_2",
      })),
    });
    const items = getPhaseProgress(current, "Apelación");

    assert.equal(items.total, 3);
    assert.equal(items.completed, 1);
  });

  it("mantiene 2 hitos de apelación y 3 de seguimiento", () => {
    const checklist = causa([
      "chk_imp_1",
      "chk_imp_2",
      "chk_imp_3",
      "chk_imp_4",
      "chk_imp_5",
      "chk_seg_1",
      "chk_seg_2",
      "chk_seg_3",
      "chk_seg_4",
    ]);

    assert.equal(getPhaseProgress(checklist, "Apelación").total, 2);
    assert.equal(getPhaseProgress(checklist, "Seguimiento").total, 3);
  });
});
