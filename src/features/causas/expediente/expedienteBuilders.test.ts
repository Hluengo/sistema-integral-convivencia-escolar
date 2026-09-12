/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { EstadoCausa, type Causa } from "@/shared/lib/types";

process.env.VITE_SUPABASE_URL ??= "https://example.supabase.co";
process.env.VITE_SUPABASE_ANON_KEY ??= "anon-key-for-unit-tests";

import type * as BuildersModule from "./expedienteBuilders";

type Builders = typeof BuildersModule;

let builders: Builders;
before(async () => {
  builders = await import("./expedienteBuilders");
});

function baseCausa(): Causa {
  return {
    id: "DC-2026-014",
    estudianteNombre: "Valentina Rojas Soto",
    estudianteCurso: "8° Básico A",
    nnaProtectedName: "V.R.S.",
    runEstudiante: "21.345.678-9",
    fechaApertura: "2026-07-15",
    estadoActual: EstadoCausa.EN_PROCESO_INDAGACION,
    tipoInfraccion: "Grave",
    responsable: "María González (Convivencia)",
    comprometeAulaSegura: false,
    fechaUltimaActualizacion: "2026-07-20",
    observaciones: "Agresión verbal entre pares durante el recreo.",
    bitacora: [
      {
        id: "b_1",
        fecha: "2026-07-17T09:30:00-04:00",
        tipo: "Entrevista",
        titulo: "Entrevista a testigos",
        descripcion: "Relatos coincidentes.",
        participantes: ["María González"],
        documentoAdjunto: "DC-2026-014/documentos/111_acta.pdf",
      },
      {
        id: "b_0",
        fecha: "2026-07-16T10:00:00-04:00",
        tipo: "Evidencia",
        titulo: "Registro patio",
        descripcion: "Cámara registra el incidente.",
        participantes: ["Inspectoría"],
      },
    ],
    checklistDebidoProceso: [
      {
        id: "chk_rec_3",
        label: "Notificación de Inicio de Indagación",
        descripcion: "Se informa al apoderado.",
        completado: true,
        fechaCompletado: "2026-07-18",
        requeridoPor: "Circular 482",
        registradoPor: "María González",
        documentoNombre: "notificacion.pdf",
        documentoUrl: "DC-2026-014/documentos/222_notificacion.pdf",
      },
    ],
  };
}

describe("expedienteBuilders", () => {
  it("lista anexos de checklist y bitácora deduplicados", () => {
    const causa = baseCausa();
    causa.bitacora = [...causa.bitacora, causa.bitacora[0]!];
    const anexos = builders.listExpedienteAnexos(causa);
    assert.equal(anexos.length, 2);
    assert.ok(anexos.some((a) => a.origen === "checklist"));
    assert.ok(anexos.some((a) => a.origen === "bitacora"));
  });

  it("respeta privacidad en markdown y json", () => {
    const causa = baseCausa();
    const md = builders.buildExpedienteMarkdown(causa, true, {
      generatedAt: "2026-09-11",
      generatedBy: "test",
    });
    assert.match(md, /V\.R\.S\./);
    assert.doesNotMatch(md, /Valentina Rojas Soto/);
    assert.doesNotMatch(md, /21\.345/);
    const json = builders.buildExpedienteJson(causa, true, {
      generatedAt: "x",
      generatedBy: "y",
    });
    assert.equal(json["estudiante"], "V.R.S.");
  });

  it("ordena la bitácora cronológicamente en el markdown", () => {
    const md = builders.buildExpedienteMarkdown(baseCausa(), false, {
      generatedAt: "x",
      generatedBy: "y",
    });
    assert.ok(
      md.indexOf("Registro patio") < md.indexOf("Entrevista a testigos"),
    );
  });

  it("declara brechas en vez de inventar datos", () => {
    const causa = {
      ...baseCausa(),
      conductaRiceId: undefined,
      apoderadoEmail: undefined,
    };
    const md = builders.buildExpedienteMarkdown(causa, false, {
      generatedAt: "x",
      generatedBy: "y",
    });
    assert.match(md, /Falta tipificación de conducta RICE/);
    assert.match(md, /Falta correo de apoderado/);
  });

  it("genera índice, manifiesto y nombres seguros", () => {
    const causa = baseCausa();
    const anexos = builders.listExpedienteAnexos(causa);
    assert.match(
      builders.buildExpedienteIndice(causa, false, anexos),
      /03_Anexos/,
    );
    const man = builders.buildExpedienteManifiesto(causa.id, "2026-09-11", [
      { nombre: "a.pdf", estado: "incluido" },
      { nombre: "b.pdf", estado: "faltante", detalle: "Object not found" },
    ]);
    assert.match(man, /incluidos: 1\/2/);
    assert.equal(builders.sanitizeFileName("DC-2026-014 ñ"), "DC-2026-014_n");
    assert.equal(
      builders.expedienteBaseName("DC-2026-014", "2026-09-11"),
      "Expediente_DC-2026-014_20260911",
    );
  });
});
