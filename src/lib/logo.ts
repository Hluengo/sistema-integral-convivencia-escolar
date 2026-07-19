/** @license SPDX-License-Identifier: Apache-2.0 */

import { LOGO_BASE64 } from './logoBase64';

let cachedLogoBytes: Uint8Array | null = null;

function base64ToBytes(b64: string): Uint8Array {
  const raw = b64.includes(',') ? b64.split(',')[1] : b64;
  const bin = atob(raw);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function getLogoBytes(): Uint8Array {
  if (!cachedLogoBytes) cachedLogoBytes = base64ToBytes(LOGO_BASE64);
  return cachedLogoBytes;
}
