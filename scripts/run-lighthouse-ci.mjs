/** @license SPDX-License-Identifier: Apache-2.0 */

import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const child = spawn(
  process.execPath,
  ['node_modules/@lhci/cli/src/cli.js', 'autorun', '--config=lighthouserc.cjs'],
  {
    stdio: ['inherit', 'pipe', 'pipe'],
    windowsHide: true,
  },
);

let stderr = '';
child.stdout.on('data', (chunk) => process.stdout.write(chunk));
child.stderr.on('data', (chunk) => {
  stderr += chunk.toString();
  process.stderr.write(chunk);
});

child.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});

child.on('close', async (code) => {
  if (code === 0) return;

  const isWindowsCleanupError = /EPERM, Permission denied:.*lighthouse\./s.test(stderr);
  if (!isWindowsCleanupError) {
    process.exitCode = code ?? 1;
    return;
  }

  try {
    const assertions = JSON.parse(await readFile('.lighthouseci/assertion-results.json', 'utf8'));
    const blockingFailures = assertions.filter(
      (assertion) => assertion.level === 'error' && assertion.passed === false,
    );

    if (blockingFailures.length === 0) {
      console.warn(
        'Lighthouse terminó las auditorías; se ignora únicamente el EPERM de limpieza de Chrome en Windows.',
      );
      process.exitCode = 0;
      return;
    }
  } catch (error) {
    console.error('No se pudieron validar las aserciones de Lighthouse.', error);
  }

  process.exitCode = code ?? 1;
});
