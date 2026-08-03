/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EstadoCausa,
  type Annotation,
  type Causa,
  type TipoInfraccion,
} from '../../shared/lib/types';

const SCHOOL_YEAR_START_MONTH_INDEX = 2;
const SCHOOL_YEAR_END_MONTH_INDEX = 11;
const SCHOOL_YEAR_MONTHS = SCHOOL_YEAR_END_MONTH_INDEX - SCHOOL_YEAR_START_MONTH_INDEX + 1;
const HIGH_SEVERITY_TYPES = new Set<TipoInfraccion>(['Muy Grave', 'Gravísima']);
const NEGATIVE_ANNOTATION_TYPE: Annotation['type'] = 'Negativa';

export interface AnnotationTrendRecord {
  dateTime: string;
  severity: TipoInfraccion;
  type: Annotation['type'];
}

export interface DashboardTrendPoint {
  key: string;
  label: string;
  opened: number;
  closed: number;
  highSeverity: number;
  annotations: number;
  negativeAnnotations: number;
  highSeverityAnnotations: number;
}

export interface DashboardTrendSummary {
  schoolYear: number;
  points: DashboardTrendPoint[];
  currentOpened: number;
  previousOpened: number;
  openedDelta: number;
  highSeverityShare: number;
  closureRate: number;
  busiestMonthLabel: string;
  busiestMonthTotal: number;
  annotationTotal: number;
  negativeAnnotationTotal: number;
  highSeverityAnnotationTotal: number;
  busiestAnnotationMonthLabel: string;
  busiestAnnotationMonthTotal: number;
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

export function getDashboardSchoolYear(referenceDate = new Date()): number {
  return referenceDate.getUTCMonth() < SCHOOL_YEAR_START_MONTH_INDEX
    ? referenceDate.getUTCFullYear() - 1
    : referenceDate.getUTCFullYear();
}

function isClosed(causa: Causa): boolean {
  return (
    causa.estadoActual === EstadoCausa.CAUSA_CERRADA ||
    causa.estadoActual === EstadoCausa.RESOLUCION_EJECUTORIADA
  );
}

export function buildDashboardTrendSummary(
  causas: Causa[],
  annotations: AnnotationTrendRecord[] = [],
  referenceDate?: Date,
): DashboardTrendSummary {
  const schoolYear = getDashboardSchoolYear(referenceDate);
  const firstMonth = startOfUtcMonth(
    new Date(Date.UTC(schoolYear, SCHOOL_YEAR_START_MONTH_INDEX, 1)),
  );
  const points = Array.from({ length: SCHOOL_YEAR_MONTHS }, (_, index) => {
    const date = addUtcMonths(firstMonth, index);
    return {
      key: monthKey(date),
      label: monthLabel(date),
      opened: 0,
      closed: 0,
      highSeverity: 0,
      annotations: 0,
      negativeAnnotations: 0,
      highSeverityAnnotations: 0,
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

  for (const annotation of annotations) {
    const registeredAt = parseDate(annotation.dateTime);
    if (!registeredAt) continue;
    const point = pointsByKey.get(monthKey(registeredAt));
    if (!point) continue;

    point.annotations += 1;
    if (annotation.type === NEGATIVE_ANNOTATION_TYPE) {
      point.negativeAnnotations += 1;
    }
    if (HIGH_SEVERITY_TYPES.has(annotation.severity)) {
      point.highSeverityAnnotations += 1;
    }
  }

  const currentWindow = points.slice(5);
  const previousWindow = points.slice(0, 5);
  const currentOpened = currentWindow.reduce((sum, point) => sum + point.opened, 0);
  const previousOpened = previousWindow.reduce((sum, point) => sum + point.opened, 0);
  const openedTotal = points.reduce((sum, point) => sum + point.opened, 0);
  const closedTotal = points.reduce((sum, point) => sum + point.closed, 0);
  const highSeverityTotal = points.reduce((sum, point) => sum + point.highSeverity, 0);
  const annotationTotal = points.reduce((sum, point) => sum + point.annotations, 0);
  const negativeAnnotationTotal = points.reduce((sum, point) => sum + point.negativeAnnotations, 0);
  const highSeverityAnnotationTotal = points.reduce(
    (sum, point) => sum + point.highSeverityAnnotations,
    0,
  );
  const busiestMonth = points.reduce((currentBusiest, point) =>
    point.opened > currentBusiest.opened ? point : currentBusiest,
  );
  const busiestAnnotationMonth = points.reduce((currentBusiest, point) =>
    point.annotations > currentBusiest.annotations ? point : currentBusiest,
  );

  return {
    schoolYear,
    points,
    currentOpened,
    previousOpened,
    openedDelta: currentOpened - previousOpened,
    highSeverityShare: openedTotal > 0 ? Math.round((highSeverityTotal / openedTotal) * 100) : 0,
    closureRate: openedTotal > 0 ? Math.round((closedTotal / openedTotal) * 100) : 0,
    busiestMonthLabel: busiestMonth.label,
    busiestMonthTotal: busiestMonth.opened,
    annotationTotal,
    negativeAnnotationTotal,
    highSeverityAnnotationTotal,
    busiestAnnotationMonthLabel: busiestAnnotationMonth.label,
    busiestAnnotationMonthTotal: busiestAnnotationMonth.annotations,
  };
}
