/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Causa } from "./types";
import type { GarantiaEstado } from "./auditoria";
import type { EstadoPlazo } from "./legalCompliance/types";
import {
  verificarPlazoInformeConcluyente,
  verificarPlazoInvestigacion,
  verificarPlazoNotificacionSuperintendencia,
  verificarPlazoSuspension,
} from "./legalCompliance/deadlineValidators";

export type Semaforo = "verde" | "amarillo" | "rojo" | "gris";

/** Unifica los estados de plazo en semáforo 🟢🟡🔴⚪. */
export function semaforoDePlazo(estado: EstadoPlazo): Semaforo {
  switch (estado) {
    case "vencido":
      return "rojo";
    case "alerta":
      return "amarillo";
    case "cumplido":
      return "verde";
    case "no_iniciado":
      return "gris";
  }
}

/** Unifica los estados de garantía de auditoría en semáforo. */
export function semaforoDeGarantia(estado: GarantiaEstado): Semaforo {
  switch (estado) {
    case "verificada":
      return "verde";
    case "pendiente":
      return "amarillo";
    case "bloqueante":
      return "rojo";
    case "no_aplica":
      return "gris";
  }
}

export interface PlazoSemaforo {
  id: "indagacion" | "concluyente" | "suspension" | "superintendencia";
  label: string;
  semaforo: Semaforo;
  detalle: string;
}

/** Los 4 plazos del procedimiento con su semáforo y detalle textual. */
export function getSemaforoPlazos(causa: Causa): PlazoSemaforo[] {
  const indagacion = verificarPlazoInvestigacion(causa);
  const concluyente = verificarPlazoInformeConcluyente(causa);
  const suspension = verificarPlazoSuspension(causa);
  const superintendencia = verificarPlazoNotificacionSuperintendencia(causa);
  return [
    {
      id: "indagacion",
      label: "Cierre de indagación",
      semaforo: semaforoDePlazo(indagacion.estado),
      detalle: indagacion.mensaje,
    },
    {
      id: "concluyente",
      label: "Informe concluyente",
      semaforo: semaforoDePlazo(concluyente.estado),
      detalle: concluyente.mensaje,
    },
    {
      id: "suspension",
      label: "Suspensión",
      semaforo: semaforoDePlazo(suspension.estado),
      detalle: suspension.mensaje,
    },
    {
      id: "superintendencia",
      label: "Superintendencia",
      semaforo: semaforoDePlazo(superintendencia.estado),
      detalle: superintendencia.mensaje,
    },
  ];
}
