/** @license SPDX-License-Identifier: Apache-2.0 */

import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const assetsDir = path.resolve('dist/assets');
const maxLargestJsBytes = 650 * 1024;
const maxTotalJsBytes = 3 * 1024 * 1024;
const files = (await readdir(assetsDir)).filter((file) => file.endsWith('.js'));
if (files.length === 0) throw new Error('No se encontraron bundles JavaScript en dist/assets.');
const sizes = await Promise.all(
  files.map(async (file) => ({ file, bytes: (await stat(path.join(assetsDir, file))).size })),
);
const largest = sizes.reduce((current, item) => (item.bytes > current.bytes ? item : current));
const total = sizes.reduce((sum, item) => sum + item.bytes, 0);
if (largest.bytes > maxLargestJsBytes)
  throw new Error(`Bundle individual excede 650 KiB: ${largest.file} (${largest.bytes} bytes).`);
if (total > maxTotalJsBytes)
  throw new Error(`Bundle JavaScript total excede 3 MiB: ${total} bytes.`);
console.log(
  JSON.stringify({
    ok: true,
    files: sizes.length,
    largest,
    totalBytes: total,
    limits: { maxLargestJsBytes, maxTotalJsBytes },
  }),
);
