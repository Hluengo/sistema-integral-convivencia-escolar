/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.VITE_SUPABASE_URL ??= "https://example.supabase.co";
process.env.VITE_SUPABASE_ANON_KEY ??= "anon-key-for-unit-tests";

const { shouldLoadNextStudentPage } = await import("./useStudentsQuery");

const base = {
  loadAllPages: true,
  enabled: true,
  hasNextPage: true,
  isFetchingNextPage: false,
  isFetchNextPageError: false,
};

describe("shouldLoadNextStudentPage", () => {
  it("carga la siguiente página mientras falten estudiantes", () => {
    assert.equal(shouldLoadNextStudentPage(base), true);
  });

  it("no carga si no hay filtro activo", () => {
    assert.equal(
      shouldLoadNextStudentPage({ ...base, loadAllPages: false }),
      false,
    );
  });

  it("no carga sin sesión habilitada", () => {
    assert.equal(shouldLoadNextStudentPage({ ...base, enabled: false }), false);
  });

  it("no encadena si ya está cargando", () => {
    assert.equal(
      shouldLoadNextStudentPage({ ...base, isFetchingNextPage: true }),
      false,
    );
  });

  it("se detiene cuando no quedan páginas", () => {
    assert.equal(
      shouldLoadNextStudentPage({ ...base, hasNextPage: false }),
      false,
    );
  });

  it("se detiene si la página falló, para no reintentar en bucle", () => {
    assert.equal(
      shouldLoadNextStudentPage({ ...base, isFetchNextPageError: true }),
      false,
    );
  });
});
