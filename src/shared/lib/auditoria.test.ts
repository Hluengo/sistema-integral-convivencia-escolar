/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import test from "node:test";
import { EstadoCausa, type Causa } from "./types";
import { auditarExpediente } from "./auditoria";

function causaConRecepcion(): Causa {
  return {
    id: "DC-2026-001",
    estudianteNombre: "Estudiante",
    estudianteCurso: "8° Básico A",
    nnaProtectedName: "E.",
    runEstudiante: "23.456.789-K",
    fechaApertura: "2026-09-17",
    estadoActual: EstadoCausa.DENUNCIA_RECEPCIONADA,
    tipoInfraccion: "Grave",
    responsable: "Inspectoría",
    comprometeAulaSegura: false,
    fechaUltimaActualizacion: "2026-09-17",
    observaciones: "",
    bitacora: [],
    checklistDebidoProceso: [
      {
        id: "chk_rec_1",
        label: "Recepción de Denuncia",
        descripcion: "",
        completado: true,
        requeridoPor: "Circular 482",
      },
    ],
  };
}

test("auditoría considera Recepción de Denuncia como comunicación de hechos", () => {
  const audit = auditarExpediente(causaConRecepcion(), [], []);
  const check = audit.checks.find((item) => item.id === "comunicacion");

  assert.equal(check?.estado, "verificada");
  assert.equal(check?.detalle, "Recepción de denuncia registrada");
});

test("auditoría reconoce el hito de entrevista disciplinaria realizada", () => {
  const causa = causaConRecepcion();
  causa.checklistDebidoProceso.push({
    id: "chk_res_4",
    label: "Entrevista Disciplinaria Realizada",
    descripcion: "",
    completado: true,
    requeridoPor: "Ambas",
  });

  const audit = auditarExpediente(causa, [], []);
  const check = audit.checks.find((item) => item.id === "ser_oido");

  assert.equal(check?.estado, "verificada");
  assert.equal(check?.detalle, "Entrevista registrada");
});

test("auditoría reconoce descargos del estudiante como derecho a ser oído", () => {
  const causa = causaConRecepcion();
  causa.bitacora.push({
    id: "b_desc_1",
    fecha: "2026-09-18T10:00:00.000Z",
    tipo: "Otro",
    titulo: "Descargos del estudiante",
    descripcion: "El estudiante presenta sus descargos por escrito.",
    participantes: ["Estudiante"],
  });

  const audit = auditarExpediente(causa, [], []);
  const serOido = audit.checks.find((item) => item.id === "ser_oido");
  const descargos = audit.checks.find((item) => item.id === "descargos");

  assert.equal(serOido?.estado, "verificada");
  assert.equal(serOido?.detalle, "Descargos registrados");
  assert.equal(descargos?.estado, "verificada");
});
