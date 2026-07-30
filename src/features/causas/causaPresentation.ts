/** @license SPDX-License-Identifier: Apache-2.0 */

import { getFaseForEstado } from '../../data';
import { remainingProcedureDays } from '../../lib/dateUtils';
import { EstadoCausa, type Causa, type FaseProcedimental } from '../../types';

export interface DeadlinePresentation {
  remainingDays: number;
  text: string;
  tone: 'normal' | 'warning' | 'overdue';
}

export function getCausaPhase(causa: Causa): FaseProcedimental {
  return getFaseForEstado(causa.estadoActual) as FaseProcedimental;
}

export function getCausaStatus(causa: Causa): string {
  if (causa.estadoActual === EstadoCausa.CAUSA_CERRADA) return 'Cerrada';
  if (causa.estadoActual === EstadoCausa.RESOLUCION_EJECUTORIADA) return 'Ejecutoriada';
  if (
    causa.estadoActual === EstadoCausa.EN_PLAZO_APELACION ||
    causa.estadoActual === EstadoCausa.APELACION_RECEPCIONADA ||
    causa.estadoActual === EstadoCausa.APELACION_REVISION_RECTORIA ||
    causa.estadoActual === EstadoCausa.APELACION_RESUELTA
  ) {
    return 'En apelación';
  }
  return 'Activa';
}

export function getCausaDeadline(causa: Causa, today = new Date()): DeadlinePresentation {
  const maxDays = causa.plazoInvestigacionDias ?? (causa.comprometeAulaSegura ? 10 : 60);
  const startDate = causa.fechaInicioInvestigacion || causa.fechaApertura;
  const remainingDays = remainingProcedureDays(startDate, maxDays, today);

  if (remainingDays < 0) {
    return { remainingDays, text: 'Plazo excedido', tone: 'overdue' };
  }
  if (remainingDays === 0) {
    return { remainingDays, text: 'Vence hoy', tone: 'warning' };
  }
  if (remainingDays <= 5) {
    return { remainingDays, text: `${remainingDays} días`, tone: 'warning' };
  }
  return { remainingDays, text: `${remainingDays} días`, tone: 'normal' };
}
