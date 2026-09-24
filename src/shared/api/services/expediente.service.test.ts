/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ExpedienteCompleto } from "./expediente.service";
import type { Causa } from "../../lib/types";

process.env.VITE_SUPABASE_URL ??= "https://example.supabase.co";
process.env.VITE_SUPABASE_ANON_KEY ??= "anon-key-for-unit-tests";

describe("expediente agregado", () => {
  it("une actuaciones, bitácora y avances en orden descendente", async () => {
    const { buildExpedienteHistory } = await import("./expediente.service");
    const expediente = createExpediente();
    const entries = buildExpedienteHistory(expediente);

    assert.deepEqual(
      entries.map((entry) => entry.id),
      ["event:event-1", "avance:progress-1", "bitacora:log-1"],
    );
    assert.equal(entries[0]?.documentNames[0], "Resolución.pdf");
    assert.equal(entries[0]?.documentPaths[0], "DC-2026-001/resolucion.pdf");
    assert.equal(entries[1]?.status, "invalidado");
    assert.equal(entries[2]?.origin, "grupal");
  });

  it("incorpora reconsideraciones y seguimientos persistidos al historial", async () => {
    const { buildExpedienteHistory } = await import("./expediente.service");
    const expediente = createExpediente();
    expediente.reconsideraciones = [
      {
        id: "rec-1",
        tipo: "reconsideracion",
        estado: "pendiente",
        solicitadaAt: "2026-09-24T12:00:00.000Z",
        resueltaAt: null,
        solicitadaPor: "apoderado",
        solicitud: "Solicita revisar la medida.",
        resolucion: "",
        documentoNombre: "solicitud.pdf",
      },
    ];
    expediente.seguimientos = [
      {
        id: "seg-1",
        estado: "en_curso",
        fecha: "2026-09-25",
        descripcion: "Revisión quincenal.",
        titulo: "Acompañamiento",
        responsable: "Orientación",
        fechaFin: null,
        cumplimiento: "",
        evaluacion: "",
      },
    ];

    const entries = buildExpedienteHistory(expediente);
    assert.equal(
      entries.some((entry) => entry.id === "reconsideracion:rec-1"),
      true,
    );
    assert.equal(
      entries.some((entry) => entry.id === "seguimiento:seg-1"),
      true,
    );
  });

  it("filtra por texto, tipo, fechas y estado sin ocultar invalidaciones", async () => {
    const { buildExpedienteHistory, filterExpedienteHistory } =
      await import("./expediente.service");
    const entries = buildExpedienteHistory(createExpediente());

    const filtered = filterExpedienteHistory(entries, {
      search: "descargos",
      type: "Descargo",
      dateFrom: "2026-09-23",
      dateTo: "2026-09-23",
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.title, "Descargos recibidos");

    const invalidated = filterExpedienteHistory(entries, {
      status: "invalidado",
    });
    assert.equal(invalidated.length, 1);
    assert.equal(invalidated[0]?.id, "avance:progress-1");
  });
});

function createExpediente(): ExpedienteCompleto {
  const causa = {
    id: "DC-2026-001",
    bitacora: [
      {
        id: "log-1",
        fecha: "2026-09-22T10:00:00.000Z",
        tipo: "Entrevista",
        titulo: "Entrevista grupal",
        descripcion: "Registro compartido.",
        participantes: ["estudiante"],
        compartidoGrupal: true,
      },
    ],
    checklistDebidoProceso: [],
  } as unknown as Causa;

  return {
    causa,
    hitos: [],
    actuaciones: [
      {
        id: "event-1",
        tenant_id: "tenant-1",
        causa_id: causa.id,
        incidente_id: null,
        occurred_at: "2026-09-23T12:00:00.000Z",
        recorded_at: "2026-09-23T12:01:00.000Z",
        recorded_by: "inspector-1",
        event_type: "Descargo",
        title: "Descargos recibidos",
        description: "Se incorporan los descargos.",
        milestone_id: "chk_inv_8",
        hecho_id: null,
        source_table: "bitacora_entries",
        source_id: "log-2",
        participants: ["estudiante"],
        status: "vigente",
        previous_event_id: null,
        correction_reason: null,
        metadata: {},
      },
    ],
    avances: [
      {
        id: "progress-1",
        causaId: causa.id,
        checklistItemId: "chk_inv_8",
        title: "Avance invalidado",
        description: "Registro corregido.",
        entryType: "Otro",
        occurredAt: "2026-09-23T11:00:00.000Z",
        createdAt: "2026-09-23T11:02:00.000Z",
        invalidatedAt: "2026-09-23T11:03:00.000Z",
        invalidationReason: "Duplicado",
      },
    ],
    hechos: [],
    vinculosHechoEvidencia: [],
    documentos: [
      {
        id: "document-1",
        tenant_id: "tenant-1",
        causa_id: causa.id,
        incidente_id: null,
        original_name: "resolucion.pdf",
        display_name: "Resolución.pdf",
        mime_type: "application/pdf",
        byte_size: 100,
        storage_path: "DC-2026-001/resolucion.pdf",
        milestone_id: null,
        event_id: "event-1",
        hecho_id: null,
        document_date: null,
        incorporated_at: "2026-09-23T12:01:00.000Z",
        incorporated_by: "inspector-1",
        origin: "externo",
        scope: "individual",
        version: 1,
        status: "vigente",
        invalidated_at: null,
        invalidated_by: null,
        invalidation_reason: null,
        sha256: null,
        metadata: {},
      },
    ],
    reconsideraciones: [],
    seguimientos: [],
  };
}
