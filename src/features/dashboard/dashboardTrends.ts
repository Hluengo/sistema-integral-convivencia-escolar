/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EstadoCausa, type Causa, type TipoInfraccion } from '../../shared/lib/types';

const MONTHS_TO_SHOW = 6;
const HIGH_SEVERITY_TYPES = new Set<TipoInfraccion>(['Muy Grave', 'Gravísima']);

export interface DashboardTrendPoint {
  key: string;
  label: string;
  opened: number;
  closed: number;
  highSeverity: number;
}

export interface DashboardTrendSummary {
  points: DashboardTrendPoint[];
  currentOpened: number;
  previousOpened: number;
  openedDelta: number;
  highSeverityShare: number;
  closureRate: number;
  busiestMonthLabel: string;
  busiestMonthTotal: number;
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat('es-CL', {
    month: 'short',
    timeZone: 'UTC',
  })
    .format(date)
    .replace('.', '');
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function isClosed(causa: Causa): boolean {
  return (
    causa.estadoActual === EstadoCausa.CAUSA_CERRADA ||
    causa.estadoActual === EstadoCausa.RESOLUCION_EJECUTORIADA
  );
}

function resolveReferenceDate(causas: Causa[], explicitReferenceDate?: Date): Date {
  if (explicitReferenceDate) return explicitReferenceDate;

  const newestTimestamp = causas.reduce((newest, causa) => {
    const openedAt = parseDate(causa.fechaApertura)?.getTime() ?? 0;
    const updatedAt = parseDate(causa.fechaUltimaActualizacion)?.getTime() ?? 0;
    return Math.max(newest, openedAt, updatedAt);
  }, 0);

  return newestTimestamp > 0 ? new Date(newestTimestamp) : new Date();
}

export function buildDashboardTrendSummary(
  causas: Causa[],
  referenceDate?: Date,
): DashboardTrendSummary {
  const lastMonth = startOfUtcMonth(resolveReferenceDate(causas, referenceDate));
  const firstMonth = addUtcMonths(lastMonth, -(MONTHS_TO_SHOW - 1));
  const points = Array.from({ length: MONTHS_TO_SHOW }, (_, index) => {
    const date = addUtcMonths(firstMonth, index);
    return {
      key: monthKey(date),
      label: monthLabel(date),
      opened: 0,
      closed: 0,
      highSeverity: 0,
    };
  });
  const pointsByKey = new Map(points.map((point) => [point.key, point]));

  for (const causa of causas) {
    const openedAt = parseDate(causa.fechaApertura);
    if (openedAt) {
      const openedPoint = pointsByKey.get(monthKey(openedAt));
      if (openedPoint) {
        openedPoint.opened += 1;
        if (HIGH_SEVERITY_TYPES.has(causa.tipoInfraccion)) {
          openedPoint.highSeverity += 1;
        }
      }
    }

    if (isClosed(causa)) {
      const closedAt = parseDate(causa.fechaUltimaActualizacion);
      const closedPoint = closedAt ? pointsByKey.get(monthKey(closedAt)) : undefined;
      if (closedPoint) {
        closedPoint.closed += 1;
      }
    }
  }

  const currentWindow = points.slice(-3);
  const previousWindow = points.slice(0, 3);
  const currentOpened = currentWindow.reduce((sum, point) => sum + point.opened, 0);
  const previousOpened = previousWindow.reduce((sum, point) => sum + point.opened, 0);
  const openedTotal = points.reduce((sum, point) => sum + point.opened, 0);
  const closedTotal = points.reduce((sum, point) => sum + point.closed, 0);
  const highSeverityTotal = points.reduce((sum, point) => sum + point.highSeverity, 0);
  const busiestMonth = points.reduce((currentBusiest, point) =>
    point.opened > currentBusiest.opened ? point : currentBusiest,
  );

  return {
    points,
    currentOpened,
    previousOpened,
    openedDelta: currentOpened - previousOpened,
    highSeverityShare: openedTotal > 0 ? Math.round((highSeverityTotal / openedTotal) * 100) : 0,
    closureRate: openedTotal > 0 ? Math.round((closedTotal / openedTotal) * 100) : 0,
    busiestMonthLabel: busiestMonth.label,
    busiestMonthTotal: busiestMonth.opened,
  };
}
