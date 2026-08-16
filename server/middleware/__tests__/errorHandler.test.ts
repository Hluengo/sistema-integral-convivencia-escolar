/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../errorHandler';
import { RequestValidationError } from '../../lib/validators';

interface MockState {
  statusCode?: number;
  body?: unknown;
}

/** Minimal mock Response (only the parts we use). */
function mockRes(): Response {
  const state: MockState = {};
  const res = {
    statusCode: 200,
    status(this: { statusCode: number }, code: number) {
      this.statusCode = code;
      return this;
    },
    json(this: MockState & Record<string, unknown>, data: unknown) {
      state.body = data;
      return this;
    },
  } as unknown as Response;
  Object.defineProperty(res, 'state', { get: () => state });
  return res;
}

const mockReq = {} as Request;
const mockNext = (() => {}) as NextFunction;

describe('errorHandler', () => {
  it('returns 500 with generic message for unknown errors', () => {
    const res = mockRes();
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    errorHandler(new Error('something broke'), mockReq, res, mockNext);

    assert.equal(res.statusCode, 500);
    assert.deepEqual((res as unknown as { state: { body: unknown } }).state.body, {
      error: 'Error interno del servidor.',
    });

    process.env.NODE_ENV = prevEnv;
  });

  it('includes error message in development mode', () => {
    const res = mockRes();
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    errorHandler(new Error('detalles del error'), mockReq, res, mockNext);

    assert.equal(res.statusCode, 500);
    assert.deepEqual((res as unknown as { state: { body: unknown } }).state.body, {
      error: 'detalles del error',
    });

    process.env.NODE_ENV = prevEnv;
  });

  it('returns 400 for RequestValidationError', () => {
    const res = mockRes();
    const err = new RequestValidationError('Campo requerido: name', 'name');

    errorHandler(err, mockReq, res, mockNext);

    assert.equal(res.statusCode, 400);
    assert.deepEqual((res as unknown as { state: { body: unknown } }).state.body, {
      error: 'Campo requerido: name',
    });
  });

  it('returns 400 for JSON SyntaxError', () => {
    const res = mockRes();
    const err = new SyntaxError('Unexpected token') as Error & { body?: true };
    err.body = true; // Signal that it's a body parse error

    errorHandler(err, mockReq, res, mockNext);

    assert.equal(res.statusCode, 400);
    assert.deepEqual((res as unknown as { state: { body: unknown } }).state.body, {
      error: 'JSON malformado en el cuerpo de la solicitud.',
    });
  });

  it('returns 500 for SyntaxError without body property (non-JSON)', () => {
    const res = mockRes();
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const err = new SyntaxError('some other syntax error');

    errorHandler(err, mockReq, res, mockNext);

    assert.equal(res.statusCode, 500);
    assert.deepEqual((res as unknown as { state: { body: unknown } }).state.body, {
      error: 'Error interno del servidor.',
    });

    process.env.NODE_ENV = prevEnv;
  });

  it('logs error to console.error', () => {
    const mockConsole = mock.method(console, 'error', () => {});
    const res = mockRes();

    errorHandler(new Error('log test'), mockReq, res, mockNext);

    assert.equal(mockConsole.mock.callCount(), 1);
    const callArg = mockConsole.mock.calls[0]?.arguments[1];
    assert.ok(typeof callArg === 'string' && callArg.includes('log test'));
  });
});
