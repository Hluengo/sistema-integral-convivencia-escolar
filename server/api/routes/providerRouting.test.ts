/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("AI provider routing", () => {
  it("no mantiene respaldo OpenRouter para documentos legales complejos", () => {
    const openRouterService = source("server/api/services/openrouter.ts");

    assert.doesNotMatch(openRouterService, /LEGAL_DRAFT_OPENROUTER_MODEL/);
    assert.doesNotMatch(openRouterService, /callOpenRouterLegalDraft/);
  });
});
