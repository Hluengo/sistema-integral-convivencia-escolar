import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSeguimientoPlazo } from "./seguimientoPlazo";

describe("getSeguimientoPlazo", () => {
  const today = new Date("2026-09-18T12:00:00");

  it("identifica planes sin fecha, vigentes y próximos", () => {
    assert.equal(getSeguimientoPlazo(null, "pendiente", today), "sin_plazo");
    assert.equal(
      getSeguimientoPlazo("2026-09-30", "en_curso", today),
      "vigente",
    );
    assert.equal(
      getSeguimientoPlazo("2026-09-20", "en_curso", today),
      "proximo",
    );
  });

  it("marca vencidos y cierra los planes evaluados", () => {
    assert.equal(
      getSeguimientoPlazo("2026-09-17", "en_curso", today),
      "vencido",
    );
    assert.equal(
      getSeguimientoPlazo("2026-09-17", "evaluado", today),
      "cerrado",
    );
  });
});
