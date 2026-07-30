/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Prueba de integración: verifica que el error handler Express
 * atrape un error lanzado en una ruta y devuelva JSON 500.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import { errorHandler } from '../errorHandler';

describe('errorHandler integration — route that throws', () => {
  it('returns JSON 500 when a route throws synchronously', async () => {
    const app = express();

    app.get('/api/throw-sync', () => {
      throw new Error('algo explotó');
    });

    app.use(errorHandler);

    const server: Server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });

    try {
      const addr = server.address() as { port: number };
      const res = await fetch(`http://127.0.0.1:${addr.port}/api/throw-sync`);
      const body = (await res.json()) as { error?: string };

      assert.equal(res.status, 500);
      assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
      assert.equal(body.error, 'Error interno del servidor.');
    } finally {
      server.close();
    }
  });

  it('returns JSON 500 when an async route calls next(err)', async () => {
    const app = express();

    app.get('/api/throw-async', async (_req, _res, next) => {
      await Promise.resolve();
      next(new Error('error asíncrono'));
    });

    app.use(errorHandler);

    const server: Server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });

    try {
      const addr = server.address() as { port: number };
      const res = await fetch(`http://127.0.0.1:${addr.port}/api/throw-async`);
      const body = (await res.json()) as { error?: string };

      assert.equal(res.status, 500);
      assert.equal(body.error, 'Error interno del servidor.');
    } finally {
      server.close();
    }
  });

  it('returns JSON 500 when a route calls next(err)', async () => {
    const app = express();

    app.get('/api/next-error', (_req, _res, next) => {
      next(new Error('error via next'));
    });

    app.use(errorHandler);

    const server: Server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });

    try {
      const addr = server.address() as { port: number };
      const res = await fetch(`http://127.0.0.1:${addr.port}/api/next-error`);
      const body = (await res.json()) as { error?: string };

      assert.equal(res.status, 500);
      assert.equal(body.error, 'Error interno del servidor.');
    } finally {
      server.close();
    }
  });
});
