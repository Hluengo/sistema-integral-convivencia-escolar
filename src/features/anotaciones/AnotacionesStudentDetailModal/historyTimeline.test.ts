/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterHistoryItems,
  getHistoryBadge,
  groupHistoryItemsByMonth,
  sortHistoryItems,
} from "./historyTimeline";

const item = (
  id: string,
  date: string,
  title = "Título",
  description = "",
) => ({
  id,
  date,
  title,
  description,
});

describe("historyTimeline", () => {
  it("categoriza cada evento para su insignia", () => {
    assert.equal(getHistoryBadge({ id: "carta-1" }).label, "Documento Oficial");
    assert.equal(
      getHistoryBadge({ id: "letter-output-1" }).label,
      "Documento Oficial",
    );
    assert.equal(
      getHistoryBadge({ id: "manual-1" }).label,
      "Seguimiento y Entrevista",
    );
    assert.equal(
      getHistoryBadge({ id: "file-1" }).label,
      "Procesamiento Automatizado",
    );
    assert.equal(
      getHistoryBadge({ id: "analysis-1" }).label,
      "Procesamiento Automatizado",
    );
    assert.equal(getHistoryBadge({ id: "etapa-1" }).label, "Hito de proceso");
    assert.equal(getHistoryBadge({ id: "otro-1" }).label, "Registro");
    assert.equal(
      getHistoryBadge({ id: "carta-1" }).iconClass,
      "border-emerald-500 text-emerald-600",
    );
  });

  it("prefiere el kind explícito sobre el prefijo del id", () => {
    assert.equal(
      getHistoryBadge({ id: "carta-1", kind: "Manual" }).label,
      "Seguimiento y Entrevista",
    );
    assert.deepEqual(
      filterHistoryItems(
        [{ ...item("carta-1", "2026-08-19"), kind: "Manual" as const }],
        "Cartas",
        "",
      ).length,
      0,
    );
    assert.deepEqual(
      filterHistoryItems(
        [{ ...item("carta-1", "2026-08-19"), kind: "Manual" as const }],
        "Manual",
        "",
      ).map((entry) => entry.id),
      ["carta-1"],
    );
  });

  it("filtra por tipo y por texto libre", () => {
    const items = [
      item(
        "carta-1",
        "2026-08-19",
        "Carta de Compromiso",
        "suscriben compromiso",
      ),
      item("manual-1", "2026-07-29", "Monitoreo", "entrevista con apoderada"),
      item("etapa-1", "2026-07-29", "Cambio de etapa", "derivación"),
    ];
    assert.deepEqual(
      filterHistoryItems(items, "Cartas", "").map((entry) => entry.id),
      ["carta-1"],
    );
    assert.deepEqual(
      filterHistoryItems(items, "Todos", "apoderada").map((entry) => entry.id),
      ["manual-1"],
    );
    assert.deepEqual(
      filterHistoryItems(items, "Todos", "  CARTA  ").map((entry) => entry.id),
      ["carta-1"],
    );
    assert.deepEqual(filterHistoryItems(items, "PDF", "").length, 0);
  });

  it("ordena por fecha en ambas direcciones sin mutar", () => {
    const items = [
      item("a", "2026-07-29"),
      item("b", "2026-08-19"),
      item("c", "fecha-mala"),
    ];
    assert.deepEqual(
      sortHistoryItems(items, "desc").map((entry) => entry.id),
      ["b", "a", "c"],
    );
    assert.deepEqual(
      sortHistoryItems(items, "asc").map((entry) => entry.id),
      ["a", "b", "c"],
    );
    assert.deepEqual(
      items.map((entry) => entry.id),
      ["a", "b", "c"],
    );
  });

  it("agrupa por mes con etiqueta en español", () => {
    const groups = groupHistoryItemsByMonth([
      item("b", "2026-08-19T09:09:00.000Z"),
      item("a", "2026-07-29T18:09:00.000Z"),
      item("c", "fecha-mala"),
    ]);
    assert.deepEqual(
      groups.map((group) => group.label),
      ["Agosto 2026", "Julio 2026", "Sin fecha"],
    );
    assert.deepEqual(
      groups[0]?.items.map((entry) => entry.id),
      ["b"],
    );
  });
});
