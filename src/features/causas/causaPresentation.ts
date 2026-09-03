/** @license SPDX-License-Identifier: Apache-2.0 */

import { getFaseForEstado } from '../../shared/lib/data';
import { remainingProcedureDays, toDateOnly } from '../../shared/lib/dateUtils';
import { calcularFechaLimiteInvestigacion } from '../../shared/lib/legalCompliance/deadlineCalculators';
import { agregarDiasHabiles } from '../../shared/lib/legalCompliance/dateUtils';
import {
  PLAZO_INVESTIGACION_ALTA_COMPLEJIDAD_DIAS,
  getMaxPlazoInvestigacionDias,
} from '../../shared/lib/legalCompliance/constants';
import { getInvestigationClosureDate } from '../../shared/lib/legalCompliance/deadlineValidators';
import { EstadoCausa, type Causa, type FaseProcedimental } from '../../shared/lib/types';

export interface DeadlinePresentation {
  remainingDays: number;
  text: string;
  tone: 'normal' | 'warning' | 'overdue';
}

function presentDeadlineDate(fechaLimite: string, today: Date): DeadlinePresentation | null {
  const deadline = Date.parse(`${fechaLimite}T12:00:00Z`);
  if (Number.isNaN(deadline)) return null;
  const todayDate = Date.parse(`${toDateOnly(today)}T12:00:00Z`);
  const remainingDays = Math.round((deadline - todayDate) / 86_400_000);
  if (remainingDays < 0) return { remainingDays, text: 'Plazo excedido', tone: 'overdue' };
  if (remainingDays === 0) return { remainingDays, text: 'Vence hoy', tone: 'warning' };
  if (remainingDays <= 5) return { remainingDays, text: `${remainingDays} días`, tone: 'warning' };
  return { remainingDays, text: `${remainingDays} días`, tone: 'normal' };
}

function presentClosedDeadlineDate(
  fechaLimite: string,
  fechaCierre: string,
): DeadlinePresentation | null {
  const deadline = Date.parse(`${fechaLimite}T12:00:00Z`);
  const closed = Date.parse(`${fechaCierre}T12:00:00Z`);
  if (Number.isNaN(deadline) || Number.isNaN(closed)) return null;
  const remainingDays = Math.round((deadline - closed) / 86_400_000);
  if (remainingDays < 0) return { remainingDays, text: 'Cerró fuera de plazo', tone: 'overdue' };
  return { remainingDays, text: 'Cerró en plazo', tone: 'normal' };
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
  const defaultMaxDays = getMaxPlazoInvestigacionDias(
    causa.tipoInfraccion,
    causa.comprometeAulaSegura,
  );
  const isHighSeverity = defaultMaxDays === PLAZO_INVESTIGACION_ALTA_COMPLEJIDAD_DIAS;
  const fechaCierreInvestigacion = getInvestigationClosureDate(causa);
  if (
    causa.fechaLimiteInvestigacion &&
    (!isHighSeverity || causa.plazoInvestigacionDias === defaultMaxDays)
  ) {
    if (fechaCierreInvestigacion) {
      const closedPresentation = presentClosedDeadlineDate(
        causa.fechaLimiteInvestigacion,
        fechaCierreInvestigacion,
      );
      if (closedPresentation) return closedPresentation;
    }
    const presentation = presentDeadlineDate(causa.fechaLimiteInvestigacion, today);
    if (presentation) return presentation;
  }
  if (isHighSeverity) {
    const startDate = causa.fechaInicioInvestigacion || causa.fechaApertura;
    const fechaLimite = calcularFechaLimiteInvestigacion(
      startDate,
      causa.tipoInfraccion,
      causa.comprometeAulaSegura,
    );
    if (fechaCierreInvestigacion) {
      const closedPresentation = presentClosedDeadlineDate(fechaLimite, fechaCierreInvestigacion);
      if (closedPresentation) return closedPresentation;
    }
    const presentation = presentDeadlineDate(
      fechaLimite,
      today,
    );
    if (presentation) return presentation;
  }
  const maxDays =
    isHighSeverity
      ? defaultMaxDays
      : (causa.plazoInvestigacionDias ?? defaultMaxDays);
  const startDate = causa.fechaInicioInvestigacion || causa.fechaApertura;
  if (fechaCierreInvestigacion) {
    const fechaLimite = agregarDiasHabiles(startDate, maxDays - 1);
    const closedPresentation = presentClosedDeadlineDate(fechaLimite, fechaCierreInvestigacion);
    if (closedPresentation) return closedPresentation;
  }
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
