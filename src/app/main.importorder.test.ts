/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

/**
 * El primer import de main.tsx debe fijar `jitless` antes de cargar schemas.
 * Si un schema se define antes, el CSP reporta el probe `new Function`.
 */
describe("main.tsx", () => {
  it("configura Zod antes de importar schemas", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(dir, "main.tsx"), "utf8");
    const firstImport = source
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith("import "));
    assert.equal(firstImport, 'import "../shared/lib/schemas/zodCsp";');
  });
});
