/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

/**
 * El primer import de main.tsx debe ser schemas/index: lo fija `jitless` al
 * evaluarse y z.object() prueba `new Function` al definirse. Si un schema se
 * define antes, el CSP (script-src sin 'unsafe-eval') reporta el error en el
 * vendor aunque la validación igual funcione.
 */
describe("main.tsx", () => {
  it("importa schemas/index antes que cualquier otro módulo", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(dir, "main.tsx"), "utf8");
    const firstImport = source
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith("import "));
    assert.equal(firstImport, 'import "../shared/lib/schemas/index";');
  });
});
