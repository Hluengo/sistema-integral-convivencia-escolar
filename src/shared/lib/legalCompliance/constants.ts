/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Constantes legales - Circular 482 / Ley 21809
 */
import type { TipoInfraccion } from '../types';

/** Máximo días de investigación para estudiantes (Ley 21809, Art. 16E, letra g) */
export const MAX_PLAZO_INVESTIGACION_DIAS = 60;
export const PLAZO_INVESTIGACION_ALTA_COMPLEJIDAD_DIAS = 10;

/** Máximo días de suspensión (Ley 21809, Art. 16E, letra j) */
export const MAX_PLAZO_SUSPENSION_DIAS = 15;

/** Plazo para notificar a Superintendencia en casos de expulsión (5 días hábiles) */
export const MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS = 5;

/** Alertar cuando queden N días para vencer el plazo */
export const DIAS_ALERTA_PLAZO_CRITICO = 3;

export function getMaxPlazoInvestigacionDias(
  tipoInfraccion: TipoInfraccion,
  comprometeAulaSegura = false,
): number {
  return comprometeAulaSegura || tipoInfraccion === 'Muy Grave' || tipoInfraccion === 'Gravísima'
    ? PLAZO_INVESTIGACION_ALTA_COMPLEJIDAD_DIAS
    : MAX_PLAZO_INVESTIGACION_DIAS;
}
