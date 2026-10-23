/** @license SPDX-License-Identifier: Apache-2.0 */

import { z } from "zod";
import { getConductaReglamentada } from "../../../reglamentoData";
import { tipoInfraccionValues } from "./newCausaForm";

export const groupIncidenteSchema = z
  .object({
    requestId: z.uuid("La solicitud del incidente no es válida."),
    courseId: z.uuid("Seleccione un curso válido."),
    studentIds: z
      .array(z.uuid("Seleccione estudiantes válidos."))
      .min(2)
      .max(100)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "No repita estudiantes en el incidente.",
      ),
    fechaHora: z.iso.datetime({
      offset: true,
      error: "Ingrese una fecha y hora válidas para el incidente.",
    }),
    lugar: z.string().trim().min(1, "Ingrese el lugar del incidente.").max(500),
    tipo: z.string().trim().min(1).max(500),
    descripcion: z
      .string()
      .trim()
      .min(10, "Describa los hechos con al menos 10 caracteres.")
      .max(10000),
    responsable: z
      .string()
      .trim()
      .min(1, "Ingrese el responsable del incidente.")
      .max(500),
    conductaRiceId: z.string(),
    tipoInfraccion: z.enum(tipoInfraccionValues),
    comprometeAulaSegura: z.boolean(),
  })
  .superRefine((input, context) => {
    const conducta = getConductaReglamentada(input.conductaRiceId);
    if (!conducta || conducta.gravedad !== input.tipoInfraccion) {
      context.addIssue({
        code: "custom",
        path: ["conductaRiceId"],
        message: "Revise la falta del reglamento y su gravedad.",
      });
    }
  });
export type CreateGroupIncidenteInput = z.infer<typeof groupIncidenteSchema>;
