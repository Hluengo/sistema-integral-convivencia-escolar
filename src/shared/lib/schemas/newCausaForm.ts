/** @license SPDX-License-Identifier: Apache-2.0 */

import { z } from "zod";
import type { Causa } from "../types";

const CHILEAN_RUT_FORMAT_RE = /^\d{7,8}-[\dK]$/;

export const tipoInfraccionValues = [
  "Leve",
  "Grave",
  "Muy Grave",
  "Gravísima",
] as const satisfies [
  Causa["tipoInfraccion"],
  Causa["tipoInfraccion"],
  Causa["tipoInfraccion"],
  Causa["tipoInfraccion"],
];

export function normalizeRutInput(value: string): string {
  const compact = value
    .trim()
    .replace(/\./g, "")
    .replace(/\s+/g, "")
    .toUpperCase();
  if (!compact) {
    return "";
  }
  if (compact.includes("-")) {
    const [body = "", verifier = ""] = compact.split("-");
    return `${body}-${verifier}`;
  }
  if (compact.length < 2) {
    return compact;
  }
  return `${compact.slice(0, -1)}-${compact.slice(-1)}`;
}

export function isChileanRutFormat(value: string): boolean {
  return CHILEAN_RUT_FORMAT_RE.test(normalizeRutInput(value));
}

/** Valida el dígito verificador del RUN mediante el algoritmo módulo 11. */
export function isValidRut(value: string): boolean {
  const [body = "", dv = ""] = normalizeRutInput(value).split("-");
  if (body.length < 7 || !/^\d+$/.test(body)) return false;

  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expected = 11 - (sum % 11);
  const expectedDv =
    expected === 11 ? "0" : expected === 10 ? "K" : String(expected);
  return expectedDv === dv;
}

export const newCausaFormSchema = z.object({
  selectedCourseId: z.string().trim().min(1, "Seleccione un curso."),
  selectedStudentId: z.string().trim().optional(),
  newEstNombre: z.string().trim().min(2, "Ingrese el nombre del estudiante."),
  newEstRut: z
    .string()
    .trim()
    .transform(normalizeRutInput)
    .pipe(
      z
        .string()
        .regex(CHILEAN_RUT_FORMAT_RE, "Ingrese un RUN chileno válido.")
        .refine(isValidRut, "El dígito verificador del RUN no coincide."),
    ),
  newInfTipo: z.enum(tipoInfraccionValues),
  conductaRiceId: z.string().optional(),
  newAulaSegura: z.boolean(),
  newObs: z
    .string()
    .trim()
    .min(10, "Describa los hechos con al menos 10 caracteres."),
  newResponsable: z.string().trim().min(3, "Ingrese el fiscalizador a cargo."),
});

export type NewCausaFormValues = z.infer<typeof newCausaFormSchema>;
