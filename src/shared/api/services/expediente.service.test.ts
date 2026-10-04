/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ExpedienteCompleto } from "./expediente.service";
import type { Causa } from "../../lib/types";

process.env.VITE_SUPABASE_URL ??= "https://example.supabase.co";
process.env.VITE_SUPABASE_ANON_KEY ??= "anon-key-for-unit-tests";

describe("expediente agregado", () => {
  it("une actuaciones, bitácora y avances en orden ascendente", async () => {
    const { buildExpedienteHistory } = await import("./expediente.service");
    const expediente = createExpediente();
    const entries = buildExpedienteHistory(expediente);

    assert.deepEqual(
      entries.map((entry) => entry.id),
      ["bitacora:log-1", "avance:progress-1", "event:event-1"],
    );
    assert.equal(entries[2]?.documentNames[0], "Resolución.pdf");
    assert.equal(entries[2]?.documentPaths[0], "DC-2026-001/resolucion.pdf");
    assert.equal(entries[1]?.status, "invalidado");
    assert.equal(entries[0]?.origin, "grupal");
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

  it("colapsa el par registro/rectificación del mismo hito y minuto", async () => {
    const { buildExpedienteHistory } = await import("./expediente.service");
    const expediente = createExpediente();
    expediente.causa.bitacora.push(
      {
        id: "log-reg",
        fecha: "2026-10-03T16:02:10.000Z",
        tipo: "Notificación",
        titulo: "Registro de Hito: Medida o Plan de Acompañamiento Iniciado",
        descripcion: "Se ha registrado formalmente la finalización.",
        participantes: ["Javiera Klapp"],
        compartidoGrupal: true,
      } as unknown as Causa["bitacora"][number],
      {
        id: "log-rec",
        fecha: "2026-10-03T16:02:40.000Z",
        tipo: "Otro",
        titulo:
          "Rectificación de Hito: Medida o Plan de Acompañamiento Iniciado",
        descripcion: "Se rectificó el registro del hito.",
        participantes: ["Javiera Klapp"],
        compartidoGrupal: true,
      } as unknown as Causa["bitacora"][number],
    );
    const entries = buildExpedienteHistory(expediente);
    const hitos = entries.filter((entry) =>
      /medida o plan de acompañamiento iniciado/i.test(entry.title),
    );
    assert.equal(hitos.length, 1);
    assert.match(hitos[0]?.title ?? "", /rectificación/i);
  });

  it("colapsa el mismo hito compartido aunque difieran el minuto y la hermana", async () => {
    const { buildExpedienteHistory } = await import("./expediente.service");
    const expediente = createExpediente();
    expediente.causa.bitacora.push(
      {
        id: "log-sis-1",
        fecha: "2026-10-03T15:00:00.000Z",
        tipo: "Notificación",
        titulo: "Registro de Hito: Medida o Plan de Acompañamiento Iniciado",
        descripcion: "En seguimiento en agenda abierta.",
        participantes: ["Javiera Klapp", "JOSEFA AGUSTINA CABALÍN VIVEROS"],
        compartidoGrupal: true,
      } as unknown as Causa["bitacora"][number],
      {
        id: "log-sis-2",
        fecha: "2026-10-03T15:37:00.000Z",
        tipo: "Notificación",
        titulo: "Registro de Hito: Medida o Plan de Acompañamiento Iniciado",
        descripcion: "Se comienza con la agenda para entrevista reflexiva.",
        participantes: ["Javiera Klapp", "VICENTE OMAR DELGADO MOLINA"],
        compartidoGrupal: true,
      } as unknown as Causa["bitacora"][number],
    );
    const entries = buildExpedienteHistory(expediente);
    const hitos = entries.filter((entry) =>
      /medida o plan de acompañamiento iniciado/i.test(entry.title),
    );
    assert.equal(hitos.length, 1);
    assert.ok(
      hitos[0]?.participants.includes("JOSEFA AGUSTINA CABALÍN VIVEROS"),
    );
    assert.ok(hitos[0]?.participants.includes("VICENTE OMAR DELGADO MOLINA"));
  });

  it("colapsa el duplicado exacto entre evento y bitácora sin vínculo y conserva el evento", async () => {
    const { buildExpedienteHistory } = await import("./expediente.service");
    const expediente = createExpediente();
    expediente.actuaciones.push({
      id: "event-dup",
      tenant_id: "tenant-1",
      causa_id: expediente.causa.id,
      incidente_id: null,
      occurred_at: "2026-09-24T10:00:50.000Z",
      recorded_at: "2026-09-24T10:00:50.000Z",
      recorded_by: "inspector-1",
      event_type: "Entrevista",
      title: "Entrevista con apoderado",
      description: "Se acuerda plan de acompañamiento.",
      milestone_id: null,
      hecho_id: null,
      source_table: null,
      source_id: null,
      participants: ["apoderado"],
      status: "vigente",
      previous_event_id: null,
      correction_reason: null,
      metadata: {},
    } as unknown as ExpedienteCompleto["actuaciones"][number]);
    expediente.causa.bitacora.push({
      id: "log-dup",
      fecha: "2026-09-24T10:00:30.000Z",
      tipo: "Entrevista",
      titulo: "Entrevista con apoderado",
      descripcion: "Se acuerda plan de acompañamiento.",
      participantes: ["apoderado", "estudiante"],
      compartidoGrupal: false,
    } as unknown as Causa["bitacora"][number]);
    const entries = buildExpedienteHistory(expediente);
    const dupes = entries.filter(
      (entry) => entry.title === "Entrevista con apoderado",
    );
    assert.equal(dupes.length, 1);
    assert.equal(dupes[0]?.source, "event");
    assert.ok(dupes[0]?.participants.includes("estudiante"));
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
