/** @license SPDX-License-Identifier: Apache-2.0 */

import type { SheetData } from 'write-excel-file/browser';
import type { Causa } from '../../shared/lib/types';
import type { ReportFilters } from '../../shared/api/services/reports.service';

export function filterReportCausas(causas: Causa[], filters: ReportFilters): Causa[] {
  const from = filters.fromDate ? new Date(`${filters.fromDate}T00:00:00`).getTime() : -Infinity;
  const to = filters.toDate ? new Date(`${filters.toDate}T23:59:59`).getTime() : Infinity;
  return causas.filter((causa) => {
    const opened = new Date(causa.fechaApertura).getTime();
    return (
      (!filters.course || causa.estudianteCurso === filters.course) &&
      (!filters.status || causa.estadoActual === filters.status) &&
      (!filters.responsible || causa.responsable === filters.responsible) &&
      !Number.isNaN(opened) &&
      opened >= from &&
      opened <= to
    );
  });
}

function buildReportRows(causas: Causa[]): Array<Array<string | number>> {
  return causas.map((causa) => [
    causa.id,
    causa.estudianteCurso,
    causa.estadoActual,
    causa.responsable,
    causa.tipoInfraccion,
    causa.fechaApertura,
    causa.fechaUltimaActualizacion,
  ]);
}

export function buildReportSheet(causas: Causa[], generatedAt: Date): SheetData {
  const headerStyle = {
    backgroundColor: '#1E3A5F',
    textColor: '#FFFFFF',
    fontWeight: 'bold' as const,
  };
  return [
    [
      { value: 'Centro de reportes — Expedientes', columnSpan: 7, ...headerStyle },
      null,
      null,
      null,
      null,
      null,
      null,
    ],
    [
      {
        value: `Registros: ${causas.length} · Generado: ${generatedAt.toLocaleString('es-CL')}`,
        columnSpan: 7,
      },
      null,
      null,
      null,
      null,
      null,
      null,
    ],
    [
      'Identificador',
      'Curso',
      'Estado',
      'Responsable',
      'Gravedad',
      'Apertura',
      'Actualización',
    ].map((value) => ({ value, ...headerStyle })),
    ...buildReportRows(causas),
  ];
}

export function buildReportFileName(generatedAt: Date): string {
  return `reporte_expedientes_${generatedAt.toISOString().slice(0, 10)}.xlsx`;
}
