import logoUrl from '../assets/veritas.png';

let cachedLogoBytes: Uint8Array | null = null;

export async function getLogoBytes(): Promise<Uint8Array> {
  if (cachedLogoBytes) { return cachedLogoBytes; }
  const res = await fetch(logoUrl);
  const buf = await res.arrayBuffer();
  cachedLogoBytes = new Uint8Array(buf);
  return cachedLogoBytes;
}
