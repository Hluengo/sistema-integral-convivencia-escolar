/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("arquitectura FSD: sin capa legacy src/components", () => {
  it("src/components no existe (capa legacy eliminada)", async () => {
    const entries = await readdir(srcDir);
    assert.ok(
      !entries.includes("components"),
      "src/components no debería existir",
    );
  });

  it("los consumidores apuntan a FSD (features/widgets/shared)", async () => {
    const { readFile } = await import("node:fs/promises");
    const lazyComponents = await readFile(
      join(srcDir, "app", "lazyAppComponents.ts"),
      "utf8",
    );
    assert.ok(
      lazyComponents.includes('import("../features/causas/MainContent")') ||
        lazyComponents.includes("import('../features/causas/MainContent')"),
    );
    assert.ok(
      lazyComponents.includes(
        'import("../features/command-palette/CommandPalette")',
      ) ||
        lazyComponents.includes(
          "import('../features/command-palette/CommandPalette')",
        ),
    );
    assert.ok(
      lazyComponents.includes('import("../pages/login/LoginPage")') ||
        lazyComponents.includes("import('../pages/login/LoginPage')"),
    );
  });

  it("mantiene las rutas de notificaciones en ambos entrypoints del servidor", async () => {
    const { readFile } = await import("node:fs/promises");
    const [developmentEntry, serverlessEntry] = await Promise.all([
      readFile(join(srcDir, "..", "server", "index.ts"), "utf8"),
      readFile(join(srcDir, "..", "server", "api", "index.ts"), "utf8"),
    ]);
    for (const entry of [developmentEntry, serverlessEntry]) {
      assert.match(entry, /notificacionesRoutes/);
      assert.match(entry, /app\.use\(['"]\/api['"], notificacionesRoutes\)/);
    }
  });
});
