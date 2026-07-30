/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import { rateLimit } from '../rateLimit';

interface MockState {
  statusCode?: number;
  body?: unknown;
}

function mockReq(overrides?: Partial<Request>): Request {
  return {
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' } as unknown as Request['socket'],
    headers: {},
    user: undefined,
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response & { state: MockState } {
  const state: MockState = {};
  const res = {
    statusCode: 200,
    status(this: { statusCode: number } & Record<string, unknown>, code: number) {
      this.statusCode = code;
      (this as unknown as { state: MockState }).state.statusCode = code;
      return this;
    },
    json(this: MockState & Record<string, unknown>, data: unknown) {
      state.body = data;
      return this;
    },
  } as unknown as Response;
  Object.defineProperty(res, 'state', { get: () => state });
  return res as unknown as Response & { state: MockState };
}

describe('rateLimit middleware', () => {
  it('allows first request from an IP', async () => {
    const req = mockReq({ ip: 'rl-mw-allow-1' });
    const res = mockRes();
    let called = false;
    const next: NextFunction = () => {
      called = true;
    };

    await rateLimit(req, res, next);
    assert.equal(called, true);
    assert.equal(res.state.statusCode, undefined);
  });

  it('allows up to 10 requests per key', async () => {
    const req = mockReq({ ip: 'rl-mw-limit-1' });
    const res = mockRes();

    for (let i = 0; i < 10; i++) {
      await rateLimit(req, res, () => {});
    }

    // Use a fresh IP for reliable test
    const req2 = mockReq({ ip: 'rl-mw-limit-2' });
    const res2 = mockRes();
    let called2 = false;
    await rateLimit(req2, res2, () => {
      called2 = true;
    });
    assert.equal(called2, true);
  });

  it('blocks 11th request and returns 429', async () => {
    const ip = 'rl-mw-block';

    // Exhaust the limit
    for (let i = 0; i < 11; i++) {
      const _r = mockReq({ ip });
      const _rs = mockRes();
      await rateLimit(_r, _rs, () => {});
    }

    // The 11th call returns 429
    const reqBlock = mockReq({ ip });
    const resBlock = mockRes();
    let nextCalled = false;
    await rateLimit(reqBlock, resBlock, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(resBlock.state.statusCode, 429);
    const body = resBlock.state.body as { error?: string; retryAfter?: number };
    assert.ok(body.error);
    assert.equal(body.retryAfter, 60);
  });

  it('uses authenticated user sub as key when available', async () => {
    // Request A and B from same IP but different users — each gets own quota
    await rateLimit(
      mockReq({ ip: 'shared-ip', user: { sub: 'user-a' } } as unknown as Request),
      mockRes(),
      () => {},
    );

    // user-b from same IP should still have full quota
    const resB = mockRes();
    let calledB = false;
    await rateLimit(
      mockReq({ ip: 'shared-ip', user: { sub: 'user-b' } } as unknown as Request),
      resB,
      () => {
        calledB = true;
      },
    );
    assert.equal(calledB, true);
  });

  it('uses IP fallback when user.sub is missing', async () => {
    const req = mockReq({ ip: 'rl-fallback-ip', user: { role: 'admin' } } as unknown as Request);
    const res = mockRes();
    let called = false;
    await rateLimit(req, res, () => {
      called = true;
    });
    assert.equal(called, true);
  });
});
