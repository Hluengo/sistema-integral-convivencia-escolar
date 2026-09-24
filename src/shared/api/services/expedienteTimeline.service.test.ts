/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { CreateExpedienteEventInput } from "./expedienteEvents.service";

process.env.VITE_SUPABASE_URL ??= "https://example.supabase.co";
process.env.VITE_SUPABASE_ANON_KEY ??= "anon-key-for-unit-tests";

const migration = readFileSync(
  "supabase/migrations/20260923120000_add_expediente_events_documents.sql",
  "utf8",
);

const eventInput: CreateExpedienteEventInput = {
  causaId: "DC-2026-001",
  occurredAt: "2026-09-23T12:00:00.000Z",
  eventType: "descargo_recibido",
  title: "Descargos recibidos",
  description: "Se incorporan los descargos al expediente.",
  milestoneId: "chk_inv_8",
  participants: ["estudiante"],
};

describe("expediente events y documents", () => {
  it("construye eventos vigentes y correcciones enlazadas", async () => {
    const { buildExpedienteEventPayload } =
      await import("./expedienteEvents.service");
    assert.deepEqual(buildExpedienteEventPayload(eventInput), {
      causa_id: "DC-2026-001",
      incidente_id: null,
      occurred_at: "2026-09-23T12:00:00.000Z",
      event_type: "descargo_recibido",
      title: "Descargos recibidos",
      description: "Se incorporan los descargos al expediente.",
      milestone_id: "chk_inv_8",
      hecho_id: null,
      source_table: null,
      source_id: null,
      participants: ["estudiante"],
      metadata: {},
    });

    const correction = buildExpedienteEventPayload(eventInput, {
      previousEventId: "event-1",
      status: "invalidado",
      reason: "Se registró por error en la causa incorrecta.",
    });
    assert.equal(correction.previous_event_id, "event-1");
    assert.equal(correction.status, "invalidado");
    assert.equal(
      correction.correction_reason,
      "Se registró por error en la causa incorrecta.",
    );
  });

  it("exige una referencia procedimental para indexar documentos", async () => {
    const { buildExpedienteDocumentPayload } =
      await import("./expedienteDocuments.service");
    assert.throws(() =>
      buildExpedienteDocumentPayload({
        causaId: "DC-2026-001",
        originalName: "descargo.pdf",
        storagePath: "DC-2026-001/documentos/descargo.pdf",
      }),
    );

    const payload = buildExpedienteDocumentPayload({
      causaId: "DC-2026-001",
      originalName: "descargo.pdf",
      storagePath: "DC-2026-001/documentos/descargo.pdf",
      eventId: "event-1",
      origin: "externo",
      scope: "individual",
      byteSize: 2048,
    });
    assert.equal(payload.event_id, "event-1");
    assert.equal(payload.origin, "externo");
    assert.equal(payload.byte_size, 2048);
  });

  it("protege tenant, RLS, referencias y ausencia de borrado de eventos", () => {
    assert.match(
      migration,
      /create table if not exists public\.expediente_events/,
    );
    assert.match(
      migration,
      /create table if not exists public\.expediente_documents/,
    );
    assert.match(
      migration,
      /alter table public\.expediente_events enable row level security/,
    );
    assert.match(
      migration,
      /alter table public\.expediente_documents enable row level security/,
    );
    assert.match(migration, /expediente_events_tenant_insert/);
    assert.match(migration, /expediente_documents_tenant_update/);
    assert.match(
      migration,
      /milestone_id is not null or event_id is not null or hecho_id is not null/,
    );
    assert.doesNotMatch(migration, /grant .*delete .*expediente_events/i);
    assert.match(
      migration,
      /previous_event_id uuid references public\.expediente_events/,
    );
    assert.match(migration, /storage_path text not null/);
  });
});
