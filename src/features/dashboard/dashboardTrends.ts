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
  netLoad: number;
  closureRate: number;
  highSeverity: number;
  annotations: number;
  negativeAnnotations: number;
  highSeverityAnnotations: number;
  negativeAnnotationShare: number;
  highSeverityAnnotationShare: number;
  isObserved: boolean;
  isCurrentMonth: boolean;
}

export interface DashboardTrendSummary {
  schoolYear: number;
  points: DashboardTrendPoint[];
  observedMonthCount: number;
  lastObservedMonthLabel: string;
  openedTotal: number;
  closedTotal: number;
  netLoadTotal: number;
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
  negativeAnnotationShare: number;
  highSeverityAnnotationShare: number;
  busiestAnnotationMonthLabel: string;
  busiestAnnotationMonthTotal: number;
  riskMonthLabel: string;
  riskMonthTotal: number;
  primaryInsight: string;
  secondaryInsight: string;
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

function percentage(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function formatMonthName(label: string): string {
  if (!label) return 'Sin mes';
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
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
  const reference = referenceDate ?? new Date();
  const schoolYear = getDashboardSchoolYear(reference);
  const currentMonthKey = monthKey(reference);
  const firstMonth = startOfUtcMonth(
    new Date(Date.UTC(schoolYear, SCHOOL_YEAR_START_MONTH_INDEX, 1)),
  );
  const points = Array.from({ length: SCHOOL_YEAR_MONTHS }, (_, index) => {
    const date = addUtcMonths(firstMonth, index);
    const key = monthKey(date);
    return {
      key,
      label: monthLabel(date),
      opened: 0,
      closed: 0,
      netLoad: 0,
      closureRate: 0,
      highSeverity: 0,
      annotations: 0,
      negativeAnnotations: 0,
      highSeverityAnnotations: 0,
      negativeAnnotationShare: 0,
      highSeverityAnnotationShare: 0,
      isObserved: date <= startOfUtcMonth(reference),
      isCurrentMonth: key === currentMonthKey,
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

  for (const point of points) {
    point.netLoad = point.opened - point.closed;
    point.closureRate = percentage(point.closed, point.opened);
    point.negativeAnnotationShare = percentage(point.negativeAnnotations, point.annotations);
    point.highSeverityAnnotationShare = percentage(
      point.highSeverityAnnotations,
      point.annotations,
    );
  }

  const observedPoints = points.filter((point) => point.isObserved);
  const currentWindow = points.slice(5);
  const previousWindow = points.slice(0, 5);
  const currentOpened = currentWindow.reduce((sum, point) => sum + point.opened, 0);
  const previousOpened = previousWindow.reduce((sum, point) => sum + point.opened, 0);
  const openedTotal = observedPoints.reduce((sum, point) => sum + point.opened, 0);
  const closedTotal = observedPoints.reduce((sum, point) => sum + point.closed, 0);
  const netLoadTotal = observedPoints.reduce((sum, point) => sum + point.netLoad, 0);
  const highSeverityTotal = observedPoints.reduce((sum, point) => sum + point.highSeverity, 0);
  const annotationTotal = observedPoints.reduce((sum, point) => sum + point.annotations, 0);
  const negativeAnnotationTotal = observedPoints.reduce(
    (sum, point) => sum + point.negativeAnnotations,
    0,
  );
  const highSeverityAnnotationTotal = observedPoints.reduce(
    (sum, point) => sum + point.highSeverityAnnotations,
    0,
  );
  const busiestMonth = observedPoints.reduce((currentBusiest, point) =>
    point.opened > currentBusiest.opened ? point : currentBusiest,
  );
  const busiestAnnotationMonth = observedPoints.reduce((currentBusiest, point) =>
    point.annotations > currentBusiest.annotations ? point : currentBusiest,
  );
  const riskMonth = observedPoints.reduce((currentRiskMonth, point) => {
    const pointRisk =
      point.negativeAnnotations + point.highSeverityAnnotations + point.highSeverity;
    const currentRisk =
      currentRiskMonth.negativeAnnotations +
      currentRiskMonth.highSeverityAnnotations +
      currentRiskMonth.highSeverity;
    return pointRisk > currentRisk ? point : currentRiskMonth;
  });
  const primaryInsight =
    annotationTotal > 0
      ? `${formatMonthName(busiestAnnotationMonth.label)} concentra ${busiestAnnotationMonth.annotations} anotación${busiestAnnotationMonth.annotations === 1 ? '' : 'es'} del ciclo observado.`
      : openedTotal > 0
        ? `${formatMonthName(busiestMonth.label)} concentra más aperturas de expedientes.`
        : 'Aún no hay registros observados para este ciclo escolar.';
  const secondaryInsight =
    openedTotal === 0
      ? 'El panel se activará cuando existan expedientes o anotaciones entre marzo y diciembre.'
      : netLoadTotal > 0
        ? `Hay ${netLoadTotal} apertura${netLoadTotal === 1 ? '' : 's'} más que cierres en los meses observados.`
        : 'El ritmo de cierre acompaña las aperturas registradas.';

  return {
    schoolYear,
    points,
    observedMonthCount: observedPoints.length,
    lastObservedMonthLabel: observedPoints.at(-1)?.label ?? points[0].label,
    openedTotal,
    closedTotal,
    netLoadTotal,
    currentOpened,
    previousOpened,
    openedDelta: currentOpened - previousOpened,
    highSeverityShare: percentage(highSeverityTotal, openedTotal),
    closureRate: percentage(closedTotal, openedTotal),
    busiestMonthLabel: busiestMonth.label,
    busiestMonthTotal: busiestMonth.opened,
    annotationTotal,
    negativeAnnotationTotal,
    highSeverityAnnotationTotal,
    negativeAnnotationShare: percentage(negativeAnnotationTotal, annotationTotal),
    highSeverityAnnotationShare: percentage(highSeverityAnnotationTotal, annotationTotal),
    busiestAnnotationMonthLabel: busiestAnnotationMonth.label,
    busiestAnnotationMonthTotal: busiestAnnotationMonth.annotations,
    riskMonthLabel: riskMonth.label,
    riskMonthTotal:
      riskMonth.negativeAnnotations + riskMonth.highSeverityAnnotations + riskMonth.highSeverity,
    primaryInsight,
    secondaryInsight,
  };
}
