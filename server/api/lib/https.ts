/** @license SPDX-License-Identifier: Apache-2.0 */

async function readCappedText(res: Response, maxBytes: number, hostname: string): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new Error(`La respuesta desde ${hostname} excede el tamaño máximo.`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function readCappedBuffer(
  res: Response,
  maxBytes: number,
  onTooLarge: () => Error,
): Promise<Buffer> {
  const reader = res.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      throw onTooLarge();
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

function timeoutError(hostname: string, prefix: string): Error {
  return new Error(`${prefix} a ${hostname} excedió el tiempo máximo.`);
}

async function request(
  hostname: string,
  pathname: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  try {
    return await fetch(`https://${hostname}${pathname}`, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw timeoutError(hostname, 'La solicitud');
    }
    throw error;
  }
}

export async function httpsPost(
  hostname: string,
  pathname: string,
  body: unknown,
  headers?: Record<string, string>,
  timeoutMs = 20_000,
  maxBytes = 2 * 1024 * 1024,
): Promise<{ status: number; body: unknown }> {
  const res = await request(
    hostname,
    pathname,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );
  const text = await readCappedText(res, maxBytes, hostname);
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
}

export async function httpsGet(
  hostname: string,
  pathname: string,
  headers?: Record<string, string>,
  timeoutMs = 10_000,
  maxBytes = 2 * 1024 * 1024,
): Promise<unknown> {
  const res = await request(hostname, pathname, { method: 'GET', headers: headers || {} }, timeoutMs);
  const text = await readCappedText(res, maxBytes, hostname);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`HTTP ${res.status}: respuesta no válida.`);
  }
}

export async function httpsGetBuffer(
  hostname: string,
  pathname: string,
  headers?: Record<string, string>,
  maxBytes = 10 * 1024 * 1024,
  timeoutMs = 6_000,
): Promise<{ status: number; body: Buffer }> {
  let res: Response;
  try {
    res = await fetch(`https://${hostname}${pathname}`, {
      method: 'GET',
      headers: headers || {},
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw timeoutError(hostname, 'La descarga desde');
    }
    throw error;
  }
  const body = await readCappedBuffer(res, maxBytes, () => new Error('La descarga excede el tamaño máximo permitido.'));
  return { status: res.status, body };
}

export async function httpsPatch(
  hostname: string,
  pathname: string,
  body: unknown,
  headers?: Record<string, string>,
  timeoutMs = 10_000,
): Promise<{ status: number; body: unknown }> {
  const res = await request(
    hostname,
    pathname,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    throw new Error(`HTTP ${res.status}: respuesta no válida.`);
  }
}
