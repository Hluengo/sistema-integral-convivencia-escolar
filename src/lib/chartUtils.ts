/**
 * Chart utility functions — kept separate from component files
 * so Fast Refresh can work cleanly on BarChart.tsx.
 */

export interface DataPoint {
  label: string;
  value: number;
}

/** Generate an array of 30 DataPoints representing the last 30 days of activity. */
export function generateLast30Days(
  causas: { fechaApertura: string; fechaUltimaActualizacion: string }[]
): DataPoint[] {
  const days: DataPoint[] = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const dateStr = date.toISOString().split('T')[0];
    const dayName = date
      .toLocaleDateString('es-CL', { weekday: 'short' })
      .slice(0, 3);

    const count = causas.filter((c) => {
      const fecha = c.fechaUltimaActualizacion || c.fechaApertura;
      return fecha === dateStr;
    }).length;

    const showDayName = i < 7 || i % 5 === 0;
    days.push({
      label: showDayName ? dayName.toUpperCase() : '',
      value: count,
    });
  }

  return days;
}
