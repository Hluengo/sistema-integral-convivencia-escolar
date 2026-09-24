/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import test from "node:test";
import { getBaseChecklist } from "../data";
import { EstadoCausa, type Causa } from "../types";
import type {
  HechoEvidenciaRow,
  HechoRow,
} from "../../api/services/hechos.service";
import {
  canCloseCase,
  canCloseInvestigation,
  canNotifyDecision,
  getNextRequiredAction,
} from "./proceduralTransitions";

const causa = (): Causa => ({
  id: "DC-2026-001",
  proceduralModelVersion: 2,
  estudianteNombre: "Estudiante",
  estudianteCurso: "8° Básico A",
  nnaProtectedName: "E.",
  runEstudiante: "23.456.789-K",
  fechaApertura: "2026-09-17",
  estadoActual: EstadoCausa.EN_PROCESO_INDAGACION,
  tipoInfraccion: "Grave",
  responsable: "Inspectoría",
  comprometeAulaSegura: false,
  fechaUltimaActualizacion: "2026-09-17",
  observaciones: "",
  bitacora: [],
  checklistDebidoProceso: getBaseChecklist(2),
});

const hecho = (overrides: Partial<HechoRow> = {}): HechoRow => ({
  id: "h-1",
  tenant_id: "tenant-1",
  causa_id: "DC-2026-001",
  incidente_id: null,
  titulo: "Hecho",
  descripcion: "Descripción",
  estado: "acreditado",
  participacion_acreditada: true,
  rice_articulo: "RICE 12",
  agravantes: [],
  atenuantes: [],
  medida_seleccionada: "Medida",
  analisis_proporcionalidad: "Proporcional",
  decision_fundada: "Fundamento",
  created_at: "2026-09-17T10:00:00Z",
  updated_at: "2026-09-17T10:00:00Z",
  ...overrides,
});

const vinculo: HechoEvidenciaRow = {
  id: "v-1",
  tenant_id: "tenant-1",
  causa_id: "DC-2026-001",
  hecho_id: "h-1",
  evidencia_path: "evidencia/h-1.pdf",
  evidencia_nombre: "Evidencia.pdf",
  created_at: "2026-09-17T10:00:00Z",
};

function complete(cause: Causa, ids: string[]) {
  cause.checklistDebidoProceso = cause.checklistDebidoProceso.map((item) =>
    ids.includes(item.id) ? { ...item, completado: true } : item,
  );
}

test("canCloseInvestigation exige garantías de investigación", () => {
  const result = canCloseInvestigation(causa(), { hechos: [hecho()] });

  assert.equal(result.allowed, false);
  assert.match(result.reason, /notificar/i);
  assert.match(result.blockers.join(" "), /evidencia vinculada/i);
});

test("canCloseInvestigation permite cerrar con hechos concluidos y evidencia", () => {
  const cause = causa();
  complete(cause, ["chk_rec_3", "chk_inv_8"]);

  const result = canCloseInvestigation(cause, {
    hechos: [hecho()],
    vinculos: [vinculo],
  });

  assert.deepEqual(result, {
    allowed: true,
    reason: "Requisitos procedimentales cumplidos.",
    blockers: [],
  });
});

test("getNextRequiredAction prioriza el siguiente hito bloqueado", () => {
  const cause = causa();
  assert.equal(
    getNextRequiredAction(cause),
    "Cerrar formalmente la indagación",
  );
});

test("canCloseCase bloquea el cierre reforzado hasta resolver apelación y seguimiento", () => {
  const cause = causa();
  const result = canCloseCase(cause);

  assert.equal(result.allowed, false);
  assert.match(result.blockers.join(" "), /reconsideración|seguimiento/i);
});

test("canCloseCase considera reconsideraciones persistidas pendientes", () => {
  const cause = causa();
  const result = canCloseCase(cause, {
    reconsideraciones: [
      {
        id: "rec-1",
        tipo: "reconsideracion",
        estado: "pendiente",
        solicitadaAt: "2026-09-20T10:00:00Z",
        resueltaAt: null,
        solicitadaPor: "Apoderado",
        solicitud: "Solicita revisión",
        resolucion: "",
        documentoNombre: null,
      },
    ],
  });

  assert.match(result.blockers.join(" "), /pendiente de resolución/i);
});

test("canNotifyDecision exige análisis y decisión fundada", () => {
  const cause = causa();
  complete(cause, ["chk_res_4"]);

  const result = canNotifyDecision(cause);

  assert.equal(result.allowed, false);
  assert.match(result.blockers.join(" "), /decisión fundada/i);
});
