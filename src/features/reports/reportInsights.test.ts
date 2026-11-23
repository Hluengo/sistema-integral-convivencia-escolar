import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDecisionInsights } from "./reportInsights";
import { EstadoCausa, type Causa } from "../../shared/lib/types";

function causa(overrides: Partial<Causa> = {}): Causa {
  return {
    id: "DC-2026-001",
    estudianteNombre: "Estudiante",
    estudianteCurso: "7°A",
    nnaProtectedName: "E.P.",
    runEstudiante: "11.111.111-1",
    fechaApertura: "2026-01-01",
    estadoActual: EstadoCausa.EN_PROCESO_INDAGACION,
    tipoInfraccion: "Grave",
    responsable: "Equipo",
    comprometeAulaSegura: false,
    fechaUltimaActualizacion: "2026-01-02",
    observaciones: "",
    bitacora: [],
    checklistDebidoProceso: [],
    ...overrides,
  };
}

describe("buildDecisionInsights", () => {
  it("orienta la priorización sin diagnosticar", () => {
    const insights = buildDecisionInsights([
      causa({
        comprometeAulaSegura: true,
        tipoInfraccion: "Gravísima",
        checklistDebidoProceso: [
          {
            id: "hito",
            label: "Hito",
            descripcion: "",
            completado: false,
            requeridoPor: "Ley 21809",
          },
        ],
      }),
      causa({ id: "DC-2026-002" }),
      causa({ id: "DC-2026-003", estudianteCurso: "7°A" }),
    ]);

    assert.equal(insights[0]?.priority, "Alta");
    assert.equal(
      insights.some((item) => item.title.includes("7°A")),
      true,
    );
    assert.equal(
      insights.every(
        (item) => item.limitation.length > 0 && item.action.length > 0,
      ),
      true,
    );
  });

  it("explica cuando no hay evidencia en los filtros", () => {
    const [insight] = buildDecisionInsights([]);

    assert.match(insight?.title ?? "", /evidencia suficiente/i);
    assert.match(insight?.limitation ?? "", /ausencia/i);
  });
});
