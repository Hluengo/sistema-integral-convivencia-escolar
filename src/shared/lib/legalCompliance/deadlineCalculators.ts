/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Calculadoras de fechas límite legales
 */

import { agregarDiasHabiles } from './dateUtils';
import {
  MAX_PLAZO_INVESTIGACION_DIAS,
  MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS,
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
  // La fecha de apertura cuenta como el primer día hábil del plazo.
  return agregarDiasHabiles(fechaApertura, maxDias - 1);
}

/**
 * Calcula fecha límite de notificación a Superintendencia (5 días hábiles desde resolución)
 */
export function calcularFechaLimiteNotificacionSuperintendencia(fechaResolucion: string): string {
  return agregarDiasHabiles(fechaResolucion, MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS);
}
