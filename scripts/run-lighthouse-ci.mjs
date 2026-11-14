/** @license SPDX-License-Identifier: Apache-2.0 */

import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

// La CLI se ejecuta bajo demanda: mantenerla instalada arrastraba 16 avisos de
// seguridad solo de desarrollo (lighthouse → puppeteer-core → proxy-agent).
const cliArgs = [
  "--yes",
  "@lhci/cli@0.15.1",
  "autorun",
  "--config=lighthouserc.cjs",
];

// En Windows npx es un .cmd y spawn lo rechaza sin shell.
const child = spawn(
  process.platform === "win32" ? "cmd.exe" : "npx",
  process.platform === "win32"
    ? ["/d", "/s", "/c", `npx ${cliArgs.join(" ")}`]
    : cliArgs,
  {
    stdio: ["inherit", "pipe", "pipe"],
    windowsHide: true,
  },
);

let stderr = "";
child.stdout.on("data", (chunk) => process.stdout.write(chunk));
child.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
  process.stderr.write(chunk);
});

child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});

child.on("close", async (code) => {
  if (code === 0) return;

  // NO_FCP significa que la página nunca pintó: es un fallo real, aunque el
  // EPERM de limpieza de Chrome en Windows lo disfrace de éxito.
  if (/\bNO_FCP\b/.test(stderr)) {
    process.exitCode = code ?? 1;
    return;
  }

  const isWindowsCleanupError = /EPERM, Permission denied:.*lighthouse\./s.test(
    stderr,
  );
  if (!isWindowsCleanupError) {
    process.exitCode = code ?? 1;
    return;
  }

  try {
    const assertions = JSON.parse(
      await readFile(".lighthouseci/assertion-results.json", "utf8"),
    );
    const blockingFailures = assertions.filter(
      (assertion) => assertion.level === "error" && assertion.passed === false,
    );

    if (blockingFailures.length === 0) {
      console.warn(
        "Lighthouse terminó las auditorías; se ignora únicamente el EPERM de limpieza de Chrome en Windows.",
      );
      process.exitCode = 0;
      return;
    }
  } catch (error) {
    console.error(
      "No se pudieron validar las aserciones de Lighthouse.",
      error,
    );
  }

  process.exitCode = code ?? 1;
});
