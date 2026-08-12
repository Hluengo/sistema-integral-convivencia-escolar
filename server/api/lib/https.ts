/** @license SPDX-License-Identifier: Apache-2.0 */

import https from 'node:https';

export function httpsPost(
  hostname: string,
  pathname: string,
  body: unknown,
  headers?: Record<string, string>,
  timeoutMs = 20_000,
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    let settled = false;
    const opts = {
      hostname,
      path: pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadlineTimer);
      callback();
    };
    const req = https.request(opts, (res) => {
      let chunks = '';
      res.on('data', (chunk: string) => (chunks += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(chunks);
          finish(() => resolve({ status: res.statusCode ?? 500, body: parsed }));
        } catch {
          finish(() => reject(new Error(`HTTP ${res.statusCode}: ${chunks}`)));
        }
      });
    });
    req.on('error', (error) => finish(() => reject(error)));
    req.setTimeout(timeoutMs, () =>
      req.destroy(new Error(`La solicitud a ${hostname} excedió el tiempo máximo.`)),
    );
    const deadlineTimer = setTimeout(() => {
      req.destroy(new Error(`La solicitud a ${hostname} excedió el tiempo máximo.`));
    }, timeoutMs);
    req.write(data);
    req.end();
  });
}

export function httpsGet(
  hostname: string,
  pathname: string,
  headers?: Record<string, string>,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname,
      path: pathname,
      method: 'GET',
      headers: headers || {},
    };
    const req = https.request(opts, (res) => {
      let chunks = '';
      res.on('data', (chunk: string) => (chunks += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(chunks));
        } catch {
          reject(new Error(`HTTP ${res.statusCode}: ${chunks}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

export function httpsGetBuffer(
  hostname: string,
  pathname: string,
  headers?: Record<string, string>,
  maxBytes = 10 * 1024 * 1024,
  timeoutMs = 6_000,
): Promise<{ status: number; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname, path: pathname, method: 'GET', headers: headers || {} },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            req.destroy(new Error('La descarga excede el tamaño máximo permitido.'));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 500, body: Buffer.concat(chunks) }),
        );
      },
    );
    req.on('error', reject);
    req.setTimeout(timeoutMs, () =>
      req.destroy(new Error(`La descarga desde ${hostname} excedió el tiempo máximo.`)),
    );
    req.end();
  });
}

export function httpsPatch(
  hostname: string,
  pathname: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname,
      path: pathname,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    const req = https.request(opts, (res) => {
      let chunks = '';
      res.on('data', (chunk: string) => (chunks += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode ?? 500, body: JSON.parse(chunks) });
        } catch {
          reject(new Error(`HTTP ${res.statusCode}: ${chunks}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}
