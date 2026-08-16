/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const MAX_STR = 10000;
const CONTROL_CHARS = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(31)}${String.fromCharCode(127)}-${String.fromCharCode(159)}]`,
  'g',
);

export class RequestValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
  ) {
    super(message);
    this.name = 'RequestValidationError';
  }
}

export function isRequestValidationError(error: unknown): error is RequestValidationError {
  return error instanceof RequestValidationError;
}

export const sanitize = (s: unknown): string => {
  if (typeof s !== 'string') {
    return '';
  }
  return s.slice(0, MAX_STR).replace(CONTROL_CHARS, '');
};

export const requireStr = (obj: Record<string, unknown>, key: string, max = 200): string => {
  const v = sanitize(obj[key]);
  if (!v) {
    throw new RequestValidationError(`Campo requerido faltante: ${key}`, key);
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
  return text
    .replace(/\[INST\]|\[\/INST\]|<<SYS>>|<<\/SYS>>/gi, '')
    .replace(/<\|im_start\|>|<\|im_end\|>/gi, '')
    .replace(/<\|system\|>|<\|user\|>|<\|assistant\|>/gi, '')
    .replace(
      /^(ignore|ignora|olvida|disregard|anula).{0,50}(instrucciones|instructions|reglas|rules|sistema|system)/gim,
      '',
    )
    .replace(
      /(eres|you are|act as|actúa como|actuá como).{0,30}(un|a|el|la|un(a)?\s+abogado|lawyer|juez|judge)/gim,
      '',
    )
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, MAX_STR);
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const CHILEAN_RUT_RE = /\b(?:\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK]|\d{7,8}-[\dkK])\b/g;
const CHILEAN_PHONE_RE = /(?:\+?56\s*)?(?:9\s*)?\b\d{4}\s*\d{4}\b/g;
const LABELLED_NAME_RE =
  /\b(estudiante|alumno|alumna|apoderado|apoderada|madre|padre)\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ'-]+(?:\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ'-]+){1,4})/g;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function uniqueKnownValues(values: readonly unknown[]): string[] {
  return [
    ...new Set(
      values
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length >= 3),
    ),
  ].sort((a, b) => b.length - a.length);
}

export function redactSensitiveForAI(text: unknown, knownValues: readonly unknown[] = []): string {
  let redacted = sanitizeForAI(text);

  for (const value of uniqueKnownValues(knownValues)) {
    redacted = redacted.replace(new RegExp(escapeRegExp(value), 'gi'), '[dato personal]');
  }

  return redacted
    .replace(EMAIL_RE, '[correo]')
    .replace(CHILEAN_RUT_RE, '[RUT]')
    .replace(CHILEAN_PHONE_RE, '[teléfono]')
    .replace(LABELLED_NAME_RE, '$1 [nombre]')
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, MAX_STR);
}
