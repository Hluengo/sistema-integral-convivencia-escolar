/** @license SPDX-License-Identifier: Apache-2.0 */

import https from 'node:https';

export function httpsPost(
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
      method: 'POST',
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
