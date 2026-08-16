/** @license SPDX-License-Identifier: Apache-2.0 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const cliPort = process.argv.find((argument) => argument.startsWith('--port='))?.split('=')[1];
const port = Number.parseInt(cliPort ?? process.env.PORT ?? '3001', 10);

if (!existsSync(root)) throw new Error('No existe dist/. Ejecute npm run build:web antes.');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const server = createServer((request, response) => {
  const requestPath = decodeURIComponent((request.url ?? '/').split('?')[0]);
  const candidate = path.resolve(root, `.${requestPath}`);
  const filePath =
    candidate.startsWith(root) && existsSync(candidate) && statSync(candidate).isFile()
      ? candidate
      : path.join(root, 'index.html');
  response.setHeader(
    'Content-Type',
    contentTypes[path.extname(filePath)] ?? 'application/octet-stream',
  );
  createReadStream(filePath).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Static dist server running at http://localhost:${port}`);
});
