/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_HISTORY_MESSAGE_LENGTH,
  MAX_HISTORY_MESSAGES,
  MAX_HISTORY_TOTAL_LENGTH,
  normalizeHistory,
} from "./advisor.js";

describe("validación del historial del asistente legal", () => {
  it("normaliza historial ausente y roles no confiables", () => {
    assert.deepEqual(normalizeHistory(undefined), []);
    assert.deepEqual(
      normalizeHistory([{ role: "system", content: "  Consulta segura  " }]),
      [{ role: "assistant", content: "Consulta segura" }],
    );
  });

  it("rechaza elementos inválidos y mensajes vacíos", () => {
    assert.equal(normalizeHistory("historial"), null);
    assert.equal(normalizeHistory([null]), null);
    assert.equal(normalizeHistory([{ role: "user", content: "   " }]), null);
    assert.equal(
      normalizeHistory([
        { role: "user", content: "x".repeat(MAX_HISTORY_MESSAGE_LENGTH + 1) },
      ]),
      null,
    );
  });

  it("rechaza historiales que superan cantidad o tamaño total", () => {
    assert.equal(
      normalizeHistory(
        Array.from({ length: MAX_HISTORY_MESSAGES + 1 }, () => ({
          role: "user",
          content: "ok",
        })),
      ),
      null,
    );
    assert.equal(
      normalizeHistory([
        { role: "user", content: "x".repeat(MAX_HISTORY_TOTAL_LENGTH) },
        { role: "assistant", content: "x" },
      ]),
      null,
    );
  });
});
