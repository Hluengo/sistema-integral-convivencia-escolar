import type { SeguimientoEstado } from "./seguimiento.service";

export type SeguimientoPlazo =
  "sin_plazo" | "vigente" | "proximo" | "vencido" | "cerrado";

export function getSeguimientoPlazo(
  fechaFin: string | null,
  estado: SeguimientoEstado,
  today = new Date(),
): SeguimientoPlazo {
  if (estado === "cumplido" || estado === "evaluado") return "cerrado";
  if (!fechaFin) return "sin_plazo";

  const end = Date.parse(`${fechaFin}T23:59:59`);
  const now = today.getTime();
  if (Number.isNaN(end)) return "sin_plazo";
  if (end < now) return "vencido";
  if (end - now <= 3 * 24 * 60 * 60 * 1000) return "proximo";
  return "vigente";
}
