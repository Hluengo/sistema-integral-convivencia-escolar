export const toDateOnly = (date: Date): string => date.toISOString().split('T')[0];

export const toIsoWithoutMilliseconds = (date: Date): string =>
  date.toISOString().replace('.000Z', 'Z');

export const nowDateOnly = (): string => toDateOnly(new Date());

export const nowIso = (): string => toIsoWithoutMilliseconds(new Date());

export const daysElapsedCeil = (startDate: string, today: Date = new Date()): number => {
  if (!startDate) return 0;
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return 0;
  const diffTime = today.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const remainingProcedureDays = (
  startDate: string,
  maxDays: number,
  today: Date = new Date()
): number => maxDays - daysElapsedCeil(startDate, today);
