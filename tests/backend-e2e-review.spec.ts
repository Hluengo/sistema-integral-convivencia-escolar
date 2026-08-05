/** @license SPDX-License-Identifier: Apache-2.0 */

import crypto from 'node:crypto';
import { expect, test } from '@playwright/test';
import type { APIResponse } from '@playwright/test';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const STUDENT_ID = '00000000-0000-0000-0000-000000000010';

async function createJwt(role: string): Promise<string> {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error('SUPABASE_JWT_SECRET no está configurado');

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: `00000000-0000-0000-0000-0000000000${role === 'teacher' ? '04' : '02'}`,
    exp: Math.floor(Date.now() / 1000) + 3600,
    app_metadata: {
      tenant_id: TENANT_ID,
      role,
    },
  };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return `${data}.${Buffer.from(signature).toString('base64url')}`;
}

async function parseJson(response: APIResponse) {
  return response.json().catch(() => ({}));
}

test.describe('Revisión E2E backend', () => {
  test('health check responde sin autenticación', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.ok()).toBe(true);
    expect(await response.json()).toEqual({ ok: true });
  });

  test('rutas protegidas rechazan acceso anónimo antes de ejecutar lógica de negocio', async ({
    request,
  }) => {
    const protectedRequests = [
      {
        path: '/api/improve-text',
        data: { text: 'Mejorar esta observación.' },
      },
      {
        path: '/api/advisor-chat',
        data: { message: '¿Cuál es el siguiente paso?' },
      },
      {
        path: '/api/audit-due-process',
        data: { id: 'DC-2026-001', infractionType: 'Falta grave' },
      },
      {
        path: '/api/draft-document',
        data: {
          docType: 'notificacion_apertura',
          id: 'DC-2026-001',
          studentName: 'Estudiante de prueba',
        },
      },
      {
        path: '/api/process-disciplinary-pdf',
        data: {
          bucket: 'disciplinary-processes',
          storagePath: `${TENANT_ID}/${STUDENT_ID}/draft/anotaciones.pdf`,
          fileName: 'anotaciones.pdf',
        },
      },
      {
        path: '/api/process-disciplinary-pdf/confirm',
        data: {
          bucket: 'disciplinary-processes',
          storagePath: `${TENANT_ID}/${STUDENT_ID}/draft/anotaciones.pdf`,
          fileName: 'anotaciones.pdf',
          fileHash: 'hash-de-prueba',
          studentId: STUDENT_ID,
          annotations: [],
        },
      },
    ];

    for (const [index, item] of protectedRequests.entries()) {
      const response = await request.post(item.path, {
        data: item.data,
        headers: {
          'X-Forwarded-For': `127.0.10.${index + 1}`,
        },
      });
      const body = (await parseJson(response)) as {
        error?: string;
      };

      expect(response.status(), item.path).toBe(401);
      expect(body.error, item.path).toMatch(/Autenticación requerida/i);
    }
  });

  test('confirmación PDF bloquea roles básicos antes de tocar Storage', async ({ request }) => {
    test.skip(
      !process.env.SUPABASE_JWT_SECRET,
      'Requiere SUPABASE_JWT_SECRET para firmar JWT E2E.',
    );

    const token = await createJwt('teacher');
    const response = await request.post('/api/process-disciplinary-pdf/confirm', {
      data: {
        bucket: 'disciplinary-processes',
        storagePath: `${TENANT_ID}/${STUDENT_ID}/draft/anotaciones.pdf`,
        fileName: 'anotaciones.pdf',
        fileHash: 'hash-de-prueba',
        studentId: STUDENT_ID,
        annotations: [],
      },
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Forwarded-For': '127.0.10.20',
      },
    });
    const body = (await parseJson(response)) as {
      error?: string;
    };

    expect(response.status()).toBe(403);
    expect(body.error).toMatch(/permiso|membresía/i);
  });
});
