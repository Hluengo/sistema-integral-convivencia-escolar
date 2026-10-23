/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { before, after, describe, it, mock } from "node:test";
import express, { type RequestHandler } from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

const pass: RequestHandler = (_req, _res, next) => next();
await mock.module("../../middleware/auth.js", {
  namedExports: { requireAuth: pass },
});
await mock.module("../../middleware/requireTenant.js", {
  namedExports: { requireTenant: pass },
});
await mock.module("../../middleware/rateLimit.js", {
  namedExports: { rateLimit: pass },
});
await mock.module("../../middleware/requireMembership.js", {
  namedExports: { requireMembership: () => pass, CONVIVENCIA_MEMBERSHIP: {} },
});
await mock.module("../services/legalSources.js", {
  namedExports: {
    getRelevantLegalSources: async () => "Normativa ficticia de prueba",
  },
});
await mock.module("../lib/https.js", {
  namedExports: { httpsGet: async () => [] },
});
await mock.module("../services/caseDocuments.js", {
  namedExports: {
    extractCaseDocuments: async () => [
      {
        name: "camila_valdes_12.345.678-9.pdf",
        text: "camila valdes relató un hecho que debe conservarse.",
      },
    ],
  },
});
const outgoing: string[] = [];
await mock.module("../services/gemini.js", {
  namedExports: {
    callGeminiComplexGeneration: async (...input: unknown[]) => {
      outgoing.push(JSON.stringify(input));
      return "Informe simulado";
    },
    callGeminiLegalDraft: async (...input: unknown[]) => {
      outgoing.push(JSON.stringify(input));
      return "Borrador simulado";
    },
  },
});
await mock.module("../services/openrouter.js", {
  namedExports: {
    callOpenRouter: async (...input: unknown[]) => {
      outgoing.push(JSON.stringify(input));
      return "Respuesta simulada";
    },
  },
});
await mock.module("@supabase/supabase-js", {
  namedExports: {
    createClient: () => ({
      from: (table: string) => {
        const rows: Record<string, unknown> = {
          causas: {
            id: "causa-test",
            student_id: "student-test",
            tipo_infraccion: "Grave",
            observaciones:
              "camila valdes relató un hecho que debe conservarse.",
            estado_actual: "Recepción",
            fecha_apertura: "2026-04-15",
          },
          students: { full_name: "Camila Valdés", rut: "12.345.678-9" },
          checklist_items: [
            {
              id: "check-test",
              label: "Comunicación de los hechos",
              documento_nombre: "camila_valdes.pdf",
            },
          ],
          bitacora_entries: [
            {
              tipo: "Entrevista",
              titulo: "Entrevista",
              descripcion:
                "camila valdes relató un hecho que debe conservarse.",
              documento_adjunto: "tenant-test/camila_valdes.pdf",
              participantes: ["Camila Valdés"],
            },
          ],
          checklist_progress_entries: [],
        };
        const query = {
          select: () => query,
          eq: () => query,
          order: () => query,
          limit: () => query,
          maybeSingle: () => query,
          then: (
            resolve: (result: { data: unknown; error: null }) => unknown,
          ) => Promise.resolve(resolve({ data: rows[table], error: null })),
        };
        return query;
      },
    }),
  },
});
const { default: advisor } = await import("./advisor");
const { default: audit } = await import("./audit");
const { default: draft } = await import("./draft");
let server: Server;
let base: string;
before(async () => {
  process.env.VITE_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "clave-ficticia-solo-test";
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    Object.assign(req, {
      tenantId: "tenant-test",
      user: { sub: "user-test" },
      authToken: "ficticio",
    });
    next();
  });
  app.use("/api", advisor, audit, draft);
  server = await new Promise<Server>((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});
after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});
async function post(route: string, body: unknown) {
  const response = await fetch(base + route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, 200);
  await response.text();
  return outgoing.at(-1)!;
}

describe("privacidad del payload completo al proveedor simulado", () => {
  it("redacta mensaje e historial del asesor antes de OpenRouter", async () => {
    const result = await post("/advisor-chat", {
      message: "La alumna Camila Valdés relató el hecho.",
      history: [
        {
          role: "user",
          content: "Correo camila@example.com, RUN 12.345.678-9.",
        },
      ],
    });
    assert.doesNotMatch(
      result,
      /Camila Valdés|camila@example.com|12\.345\.678-9/,
    );
  });
  it("omite identificadores y nombres de documentos del dossier persistido de auditoría", async () => {
    const result = await post("/audit-due-process", { causaId: "causa-test" });
    assert.doesNotMatch(result, /camila|valdes|12\.345\.678-9|tenant-test\//i);
    assert.match(result, /relató un hecho que debe conservarse/);
    assert.match(result, /Grave/);
  });
  it("redacta también archivos, texto extraído y campos auxiliares del borrador", async () => {
    const result = await post("/draft-document", {
      docType: "informe_cierre_indagacion",
      id: "causa-test",
      studentName: "Camila Valdés",
      course: "8 A",
      fatherName: "Adulto Ficticio",
      managerName: "Inspectoría",
      observations: "camila valdes relató un hecho que debe conservarse.",
      bitacora: [
        {
          titulo: "Entrevista",
          descripcion: "Hecho revisado.",
          participantes: ["Camila Valdés"],
          documentoAdjunto: "tenant-test/camila_valdes.pdf",
        },
      ],
      checklist: [
        {
          label: "Comunicación",
          documentoNombre: "camila_valdes.pdf",
          documentoUrl: "tenant-test/camila_valdes.pdf",
        },
      ],
    });
    assert.doesNotMatch(result, /camila|valdes|12\.345\.678-9|tenant-test\//i);
    assert.match(result, /relató un hecho que debe conservarse/);
  });
});
