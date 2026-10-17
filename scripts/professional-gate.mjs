/** @license SPDX-License-Identifier: Apache-2.0 */

import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
if (args.has("--help") || args.has("-h")) {
  console.log(
    [
      "Uso: npm run professional-gate [-- --e2e] [-- --remote]",
      "Ejecuta los controles locales y, opcionalmente, E2E y seguridad remota.",
    ].join(String.fromCharCode(10)),
  );
  process.exit(0);
}

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const checks = [
  ["lint", ["run", "lint"]],
  ["tests y cobertura", ["run", "test:coverage"]],
  ["archivos y dependencias", ["run", "knip:ci"]],
  ["build", ["run", "build"]],
  ["auditoría de dependencias", ["run", "security-audit"]],
];

if (args.has("--e2e"))
  checks.push(["E2E y accesibilidad", ["run", "test:e2e"]]);
if (args.has("--remote")) {
  if (process.env.ALLOW_REMOTE_SECURITY_CHECKS !== "true") {
    throw new Error(
      "La validación remota requiere ALLOW_REMOTE_SECURITY_CHECKS=true. Nunca se ejecuta por accidente.",
    );
  }
  checks.push(["aislamiento multi-tenant", ["run", "test:multitenant"]]);
  checks.push(["roles de producción", ["run", "test:roles"]]);
}

for (const [label, command] of checks) {
  console.log(`\n[gate] ${label}: npm ${command.join(" ")}`);
  const result = spawnSync(
    isWindows ? (process.env.ComSpec ?? "cmd.exe") : npmCommand,
    isWindows
      ? ["/d", "/s", "/c", [npmCommand, ...command].join(" ")]
      : command,
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("\nREADY: controles profesionales aprobados.");
