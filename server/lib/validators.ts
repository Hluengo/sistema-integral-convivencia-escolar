/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const MAX_STR = 10000;
const CONTROL_CHARS = new RegExp(`[${String.fromCharCode(0)}-${String.fromCharCode(31)}${String.fromCharCode(127)}-${String.fromCharCode(159)}]`, 'g');

export const sanitize = (s: unknown): string => {
  if (typeof s !== 'string') {
    return '';
  }
  return s.slice(0, MAX_STR).replace(CONTROL_CHARS, '');
};

export const requireStr = (obj: Record<string, unknown>, key: string, max = 200): string => {
  const v = sanitize(obj[key]);
  if (!v) {
    throw new Error(`Campo requerido faltante: ${key}`);
  }
  return v.slice(0, max);
};

export const optStr = (obj: Record<string, unknown>, key: string, max = MAX_STR): string =>
  sanitize(obj[key]).slice(0, max);

export const optArr = (obj: Record<string, unknown>, key: string): unknown[] =>
  Array.isArray(obj[key]) ? (obj[key] as unknown[]) : [];

export function sanitizeForAI(text: unknown): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return (
    text
      .replace(/\[INST\]|\[\/INST\]|<<SYS>>|<<\/SYS>>/gi, '')
      .replace(/<\|im_start\|>|<\|im_end\|>/gi, '')
      .replace(/<\|system\|>|<\|user\|>|<\|assistant\|>/gi, '')
      .replace(
        /^(ignore|olvida|disregard|anula).{0,50}(instrucciones|instructions|reglas|rules|sistema|system)/gim,
        ''
      )
      .replace(
        /(eres|you are|act as|actúa como|actuá como).{0,30}(un|a|el|la|un(a)?\s+abogado|lawyer|juez|judge)/gim,
        ''
      )
      .replace(/\n{3,}/g, '\n\n')
      .slice(0, MAX_STR)
  );
}
