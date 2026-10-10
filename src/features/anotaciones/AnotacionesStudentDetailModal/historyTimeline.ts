/** @license SPDX-License-Identifier: Apache-2.0 */

/** Filtros por tipo de evento del historial disciplinario. */
export type HistoryFilterKind =
  "Todos" | "Cartas" | "PDF" | "Etapas" | "Manual";

/** Categoría explícita de un evento (sin "Todos", que solo filtra). */
export type HistoryTimelineKind = Exclude<HistoryFilterKind, "Todos">;

export type HistorySortDirection = "desc" | "asc";

export interface HistoryTimelineItemLike {
  id: string;
  date: string;
  title: string;
  description: string;
  /** Categoría explícita; si falta se infiere del prefijo del id (legacy). */
  kind?: HistoryTimelineKind;
}

export interface HistoryMonthGroup<T> {
  key: string;
  label: string;
  items: T[];
}

export interface HistoryBadge {
  label: string;
  badgeClass: string;
  iconClass: string;
}

const MESES_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** Inferencia legacy por prefijo del id; preferir el campo `kind`. */
export function resolveKindFromId(id: string): HistoryTimelineKind | null {
  if (id.startsWith("carta-") || id.startsWith("letter-output-"))
    return "Cartas";
  if (id.startsWith("manual-")) return "Manual";
  if (
    id.startsWith("file-") ||
    id.startsWith("analysis-") ||
    id.startsWith("process-")
  )
    return "PDF";
  if (id.startsWith("etapa-")) return "Etapas";
  return null;
}

function resolveKind(item: Pick<HistoryTimelineItemLike, "id" | "kind">) {
  return item.kind ?? resolveKindFromId(item.id);
}

/** Categoría visual de un evento (mismo criterio del filtro). */
export function getHistoryBadge(
  item: Pick<HistoryTimelineItemLike, "id" | "kind">,
): HistoryBadge {
  const kind = resolveKind(item);
  if (kind === "Cartas") {
    return {
      label: "Documento Oficial",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      iconClass: "border-emerald-500 text-emerald-600",
    };
  }
  if (kind === "Manual") {
    return {
      label: "Seguimiento y Entrevista",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      iconClass: "border-amber-500 text-amber-600",
    };
  }
  if (kind === "PDF") {
    return {
      label: "Procesamiento Automatizado",
      badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
      iconClass: "border-sky-500 text-sky-600",
    };
  }
  if (kind === "Etapas") {
    return {
      label: "Hito de proceso",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
      iconClass: "border-purple-500 text-purple-600",
    };
  }
  return {
    label: "Registro",
    badgeClass: "bg-neutral-100 text-neutral-600 border-neutral-200",
    iconClass: "border-neutral-300 text-neutral-500",
  };
}

function matchesKind(
  item: Pick<HistoryTimelineItemLike, "id" | "kind">,
  kind: HistoryFilterKind,
): boolean {
  if (kind === "Todos") return true;
  return resolveKind(item) === kind;
}

/** Filtra por tipo y por texto libre en título o descripción. */
export function filterHistoryItems<T extends HistoryTimelineItemLike>(
  items: T[],
  kind: HistoryFilterKind,
  query: string,
): T[] {
  const normalized = query.trim().toLocaleLowerCase("es-CL");
  return items.filter((item) => {
    if (!matchesKind(item, kind)) return false;
    if (!normalized) return true;
    return (
      item.title.toLocaleLowerCase("es-CL").includes(normalized) ||
      item.description.toLocaleLowerCase("es-CL").includes(normalized)
    );
  });
}

export interface CartaEventLike {
  carta_id: string;
  event_type: string;
  created_at: string;
}

/**
 * Colapsa eventos repetidos por doble registro (misma carta y tipo dentro de
 * 60 segundos): se conserva el primero. Solo oculta en la vista, no borra.
 */
export function collapseNearDuplicateEvents<T extends CartaEventLike>(
  events: T[],
): T[] {
  const sorted = [...events].sort(
    (a, b) => +new Date(a.created_at) - +new Date(b.created_at),
  );
  const last: Record<string, number> = {};
  const out: T[] = [];
  for (const event of sorted) {
    const time = +new Date(event.created_at);
    if (Number.isNaN(time)) {
      out.push(event);
      continue;
    }
    const key = `${event.carta_id}|${event.event_type}`;
    if (last[key] !== undefined && time - last[key] < 60000) continue;
    last[key] = time;
    out.push(event);
  }
  return out;
}

/** Ordena por fecha (copia nueva); fechas inválidas van al final. */
export function sortHistoryItems<T extends { date: string }>(
  items: T[],
  direction: HistorySortDirection,
): T[] {
  const factor = direction === "desc" ? -1 : 1;
  return [...items].sort((first, second) => {
    const firstTime = new Date(first.date).getTime();
    const secondTime = new Date(second.date).getTime();
    if (Number.isNaN(firstTime) && Number.isNaN(secondTime)) return 0;
    if (Number.isNaN(firstTime)) return 1;
    if (Number.isNaN(secondTime)) return -1;
    return (firstTime - secondTime) * factor;
  });
}

function monthKeyOf(date: string): string | null {
  const time = new Date(date);
  if (Number.isNaN(time.getTime())) return null;
  const month = String(time.getUTCMonth() + 1).padStart(2, "0");
  return `${time.getUTCFullYear()}-${month}`;
}

function monthLabelOf(key: string): string {
  const [year, month] = key.split("-");
  const name = MESES_ES[Number(month) - 1] || "";
  return name ? `${name} ${year}` : key;
}

/** Agrupa manteniendo el orden recibido; fechas inválidas van a "Sin fecha". */
export function groupHistoryItemsByMonth<T extends { date: string }>(
  items: T[],
): HistoryMonthGroup<T>[] {
  const groups = new Map<string, HistoryMonthGroup<T>>();
  for (const item of items) {
    const key = monthKeyOf(item.date) || "sin-fecha";
    const group = groups.get(key);
    if (group) {
      group.items.push(item);
      continue;
    }
    groups.set(key, {
      key,
      label: key === "sin-fecha" ? "Sin fecha" : monthLabelOf(key),
      items: [item],
    });
  }
  return [...groups.values()];
}
