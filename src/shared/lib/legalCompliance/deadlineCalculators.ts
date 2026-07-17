/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Calculadoras de fechas límite legales
 */

import { agregarDiasHabiles } from './dateUtils';
import {
  MAX_PLAZO_INVESTIGACION_DIAS,
  MAX_PLAZO_SUSPENSION_DIAS,
  MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS,
} from './constants';

/**
 * Calcula fecha límite de investigación (60 días hábiles desde apertura)
 */
export function calcularFechaLimiteInvestigacion(fechaApertura: string): string {
  return agregarDiasHabiles(fechaApertura, MAX_PLAZO_INVESTIGACION_DIAS);
}

/**
 * Calcula fecha límite de notificación a Superintendencia (5 días hábiles desde resolución)
 */
export function calcularFechaLimiteNotificacionSuperintendencia(
  fechaResolucion: string
): string {
  return agregarDiasHabiles(
    fechaResolucion,
    MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS
  );
}