/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";
import express, { type RequestHandler } from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { configureJsonBody } from "../../middleware/jsonBody";

const pass: RequestHandler = (_req, _res, next) => next();
await mock.module("../../middleware/auth.js", {
  namedExports: { requireAuth: pass },
});
await mock.module("../../middleware/requireTenant.js", {
  namedExports: { requireTenant: pass },
});
await mock.module("../../middleware/requireRole.js", {
  namedExports: { requireRole: () => pass },
});
await mock.module("../../middleware/requireMembership.js", {
  namedExports: { requireMembership: () => pass, CONVIVENCIA_MEMBERSHIP: {} },
});
await mock.module("../../middleware/rateLimit.js", {
  namedExports: { rateLimit: pass },
});
await mock.module("@supabase/supabase-js", {
  namedExports: {
    createClient: () => ({
      from: () => {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({
            data: { id: "causa-prueba" },
            error: null,
          }),
          insert: async () => ({ error: null }),
        };
        return query;
      },
    }),
  },
});
const deliveries: Array<{ body: string; isHtml?: boolean }> = [];
await mock.module("../services/composio.js", {
  namedExports: {
    sendCitacionEmail: async (input: { body: string; isHtml?: boolean }) => {
      deliveries.push(input);
      return { id: "correo-simulado" };
    },
  },
});
const { default: router } = await import("./notificaciones");
let server: Server;
let url: string;
before(async () => {
  process.env.VITE_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "clave-ficticia-solo-test";
  const app = express();
  configureJsonBody(app);
  app.use((req, _res, next) => {
    Object.assign(req, { tenantId: "tenant-test" });
    next();
  });
  app.use("/api", router);
  server = await new Promise<Server>((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/notificaciones/documento`;
});
after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});
async function send(html: unknown) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      causaId: "causa-prueba",
      to: "prueba@example.com",
      subject: "Prueba sin envío real",
      html,
    }),
  });
}

describe("documento HTML entregado al proveedor simulado", () => {
  it("conserva íntegro un documento de 22.026 caracteres", async () => {
    const html = `<p>${"x".repeat(21_999)}</p><footer>fin</footer>`;
    assert.equal(html.length, 22_026);
    const response = await send(html);
    assert.equal(response.status, 200);
    assert.equal(deliveries.at(-1)?.body, html);
    assert.equal(deliveries.at(-1)?.isHtml, true);
  });
  it("rechaza HTML excesivo por bytes, inválido o peligroso sin enviar fragmentos", async () => {
    for (const html of [
      "é".repeat(50_001),
      "😀".repeat(25_001),
      "x".repeat(100_001),
      "<script>alert(1)</script>",
      " \n\t ",
      '<a href="java\nscript:alert(1)">abrir</a>',
      '<a href="&#x6a;avascript&#58;alert(1)">abrir</a>',
      null,
    ]) {
      const before = deliveries.length;
      const response = await send(html);
      assert.ok(response.status >= 400 && response.status < 500);
      assert.equal(deliveries.length, before);
    }
  });
  it("acepta la envoltura JSON escapada de un HTML dentro del límite", async () => {
    const html = `<p>${'"'.repeat(99_000)}</p>`;
    const response = await send(html);
    assert.equal(response.status, 200);
    assert.equal(deliveries.at(-1)?.body, html);
  });
});
