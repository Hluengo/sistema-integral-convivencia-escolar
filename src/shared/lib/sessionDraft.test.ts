/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { z } from "zod";
import * as drafts from "./sessionDraft";

const schema = z
  .object({ text: z.string(), selected: z.array(z.string()) })
  .partial();
const fallback = { text: "", selected: [] as string[] };
let storage: Map<string, string>;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

beforeEach(() => {
  storage = new Map();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      sessionStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        key: (index: number) => [...storage.keys()][index] ?? null,
        get length() {
          return storage.size;
        },
      },
    },
  });
});
afterEach(() => {
  if (originalWindow)
    Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

describe("borradores privados por sesión", () => {
  it("recupera una confirmación registrada antes de recargar la pestaña", () => {
    const key = drafts.getSessionDraftKey(
      "causa-history",
      "tenant-a",
      "user-a",
      "case-a",
    )!;
    drafts.writeSessionDraft(key, { text: "enviado" });
    storage.set(
      key + ":pending-save",
      JSON.stringify({ raw: storage.get(key), result: "entrada-confirmada" }),
    );
    drafts.confirmSessionDraftSave(key, "entrada-confirmada");
    assert.equal(storage.has(key), false);
    assert.equal(storage.has(key + ":pending-save"), false);
  });

  it("registrar después de una subida lenta conserva el snapshot enviado, no la edición posterior", () => {
    drafts.writeSessionDraft("draft-lento", { text: "enviado" });
    const submitted = storage.get("draft-lento")!;
    drafts.writeSessionDraft("draft-lento", { text: "edición posterior" });
    drafts.registerSessionDraftSave("draft-lento", "entrada-lenta", submitted);
    drafts.confirmSessionDraftSave("draft-lento", "entrada-lenta");
    assert.equal(
      JSON.parse(storage.get("draft-lento")!).text,
      "edición posterior",
    );
  });

  it("rechaza tipos inválidos y descarta claves desconocidas", () => {
    storage.set("draft-test", JSON.stringify({ text: 42, selected: null }));
    assert.deepEqual(
      drafts.readSessionDraft("draft-test", fallback, schema),
      fallback,
    );
    storage.set(
      "draft-test",
      JSON.stringify({ text: "trabajo", password: "no guardar" }),
    );
    assert.deepEqual(drafts.readSessionDraft("draft-test", fallback, schema), {
      ...fallback,
      text: "trabajo",
    });
  });

  it("separa usuario, colegio y registro; no hay clave sin identidad", () => {
    const key = drafts.getSessionDraftKey("new-causa", "tenant-a", "user-a");
    assert.notEqual(
      key,
      drafts.getSessionDraftKey("new-causa", "tenant-a", "user-b"),
    );
    assert.notEqual(
      key,
      drafts.getSessionDraftKey("new-causa", "tenant-b", "user-a"),
    );
    assert.notEqual(
      key,
      drafts.getSessionDraftKey("new-causa", "tenant-a", "user-a", "record-a"),
    );
    assert.equal(drafts.getSessionDraftKey("new-causa", null, "user-a"), null);
    assert.equal(
      drafts.getSessionDraftKey("new-causa", "tenant-a", null),
      null,
    );
  });

  it("limpia solo borradores del usuario saliente, sin tocar credenciales ni legacy", () => {
    const own = drafts.getSessionDraftKey("new-causa", "tenant-a", "user-a")!;
    const other = drafts.getSessionDraftKey("new-causa", "tenant-a", "user-b")!;
    drafts.writeSessionDraft(own, { text: "propio" });
    drafts.writeSessionDraft(other, { text: "ajeno" });
    storage.set("supabase-auth", "no tocar");
    storage.set("draft:new-causa", "sin propietario verificable");
    drafts.clearUserSessionDrafts("user-a");
    assert.equal(storage.has(own), false);
    assert.equal(storage.has(other), true);
    assert.equal(storage.get("supabase-auth"), "no tocar");
    assert.equal(storage.has("draft:new-causa"), true);
  });

  it("tolera JSON corrupto y almacenamiento bloqueado sin fingir éxito", () => {
    storage.set("draft-test", "{");
    assert.deepEqual(
      drafts.readSessionDraft("draft-test", fallback, schema),
      fallback,
    );
    Object.defineProperty(window, "sessionStorage", {
      get() {
        throw new Error("bloqueado");
      },
    });
    assert.deepEqual(
      drafts.readSessionDraft("draft-test", fallback, schema),
      fallback,
    );
    assert.equal(drafts.writeSessionDraft("draft-test", fallback), false);
    assert.equal(drafts.clearSessionDraft("draft-test"), false);
    assert.equal(drafts.clearUserSessionDrafts("user-a"), false);
  });

  it("una confirmación antigua no elimina una edición nueva", () => {
    drafts.writeSessionDraft("draft-test", { text: "primero" });
    const submitted = storage.get("draft-test")!;
    drafts.writeSessionDraft("draft-test", { text: "segundo" });
    assert.equal(drafts.clearSessionDraft("draft-test", submitted), false);
    assert.equal(JSON.parse(storage.get("draft-test")!).text, "segundo");
    assert.equal(
      drafts.clearSessionDraft("draft-test", storage.get("draft-test")!),
      true,
    );
  });

  it("no lee ni escribe un borrador sin clave verificada", () => {
    assert.equal(drafts.writeSessionDraft(null, fallback), false);
    assert.deepEqual(drafts.readSessionDraft(null, fallback, schema), fallback);
    assert.equal(storage.size, 0);
  });

  it("solo elimina el respaldo al confirmar el resultado remoto correspondiente", () => {
    drafts.writeSessionDraft("draft-test", { text: "pendiente" });
    drafts.registerSessionDraftSave("draft-test", "resultado-1");
    assert.equal(storage.has("draft-test"), true);
    drafts.confirmSessionDraftSave("draft-test", "otro-resultado");
    assert.equal(storage.has("draft-test"), true);
    drafts.confirmSessionDraftSave("draft-test", "resultado-1");
    assert.equal(storage.has("draft-test"), false);
  });

  it("la confirmación remota no borra el texto escrito durante una petición lenta", () => {
    drafts.writeSessionDraft("draft-test", { text: "enviado" });
    drafts.registerSessionDraftSave("draft-test", "resultado-2");
    drafts.writeSessionDraft("draft-test", { text: "edición nueva" });
    drafts.confirmSessionDraftSave("draft-test", "resultado-2");
    assert.equal(JSON.parse(storage.get("draft-test")!).text, "edición nueva");
  });
});
