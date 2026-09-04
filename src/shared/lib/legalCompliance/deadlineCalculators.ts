/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Calculadoras de fechas límite legales
 */

import { agregarDiasHabiles } from './dateUtils';
import {
  MAX_PLAZO_INVESTIGACION_DIAS,
  MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS,
  PLAZO_INFORME_CONCLUYENTE_DIAS,
  PLAZO_INVESTIGACION_ALTA_COMPLEJIDAD_DIAS,
  getMaxPlazoInvestigacionDias,
} from './constants';
import type { TipoInfraccion } from '../types';

/**
 * Calcula fecha límite de investigación desde apertura.
 */
export function calcularFechaLimiteInvestigacion(
  fechaApertura: string,
  tipoInfraccion?: TipoInfraccion,
  comprometeAulaSegura = false,
): string {
  const maxDias = tipoInfraccion
    ? getMaxPlazoInvestigacionDias(tipoInfraccion, comprometeAulaSegura)
    : MAX_PLAZO_INVESTIGACION_DIAS;
  return agregarDiasHabiles(fechaApertura, maxDias);
}

export function calcularFechaLimiteInformeConcluyente(fechaCierreIndagacion: string): string {
  return agregarDiasHabiles(fechaCierreIndagacion, PLAZO_INFORME_CONCLUYENTE_DIAS);
}

export function calcularFechaLimiteCierreIndagacion(fechaInicioInvestigacion: string): string {
  return agregarDiasHabiles(fechaInicioInvestigacion, PLAZO_INVESTIGACION_ALTA_COMPLEJIDAD_DIAS);
}

/**
 * Calcula fecha límite de notificación a Superintendencia (5 días hábiles desde resolución)
 */
export function calcularFechaLimiteNotificacionSuperintendencia(fechaResolucion: string): string {
  return agregarDiasHabiles(fechaResolucion, MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS);
}
