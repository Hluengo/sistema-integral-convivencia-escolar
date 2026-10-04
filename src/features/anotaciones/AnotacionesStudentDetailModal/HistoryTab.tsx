/** @license SPDX-License-Identifier: Apache-2.0 */

import { useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  FileSearch,
  FileText,
  History,
  Loader2,
  NotebookPen,
  Plus,
  ScrollText,
  Search,
  Upload,
} from "lucide-react";
import type {
  CartaDisciplinaria,
  DocumentAnalysis,
  EtapaDisciplinaria,
} from "@/shared/lib/types";
import type {
  CartaEvent,
  DisciplinaryFileRecord,
  DisciplinaryProcessRecord,
  LetterOutputEvent,
} from "@/shared/api/services/cartas.service";
import { resolveCartaWorkflowStatus } from "@/shared/api/services/cartas.service";
import { formatDate } from "./constants";
import { useStudentHistoryEntries } from "@/shared/lib/hooks/useStudentHistoryEntries";
import ManualHistoryEntryForm from "./ManualHistoryEntryForm";
import {
  filterHistoryItems,
  getHistoryBadge,
  groupHistoryItemsByMonth,
  sortHistoryItems,
  type HistoryFilterKind,
  type HistorySortDirection,
  type HistoryTimelineKind,
} from "./historyTimeline";

interface TimelineItem {
  id: string;
  kind: HistoryTimelineKind;
  date: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  tone: string;
}

interface HistoryTabProps {
  studentId: string;
  cartas: CartaDisciplinaria[];
  documentAnalyses: DocumentAnalysis[];
  etapas: EtapaDisciplinaria[];
  processes: DisciplinaryProcessRecord[];
  files: DisciplinaryFileRecord[];
  letterOutputEvents: LetterOutputEvent[];
  cartaEvents: CartaEvent[];
}

function describeCartaEvent(
  event: CartaEvent,
  carta?: CartaDisciplinaria,
): TimelineItem {
  const letterType = carta?.letter_type || "Carta disciplinaria";
  const base = {
    id: `carta-event-${event.id}`,
    kind: "Cartas" as const,
    date: event.created_at,
    icon: <FileText className="h-4 w-4" />,
  };

  if (event.event_type === "printed") {
    return {
      ...base,
      title: `Carta emitida: ${letterType}`,
      description: "Medio de validación: impresión.",
      tone: "bg-leve-50 text-leve-700",
    };
  }
  if (event.event_type === "processed_manually") {
    return {
      ...base,
      title: `Carta procesada manualmente: ${letterType}`,
      description: `Observación: ${event.event_detail || "Sin observación."}`,
      tone: "bg-leve-50 text-leve-700",
    };
  }
  if (event.event_type === "archived") {
    return {
      ...base,
      title: `Carta archivada: ${letterType}`,
      description:
        event.event_detail || "Carta firmada y archivada en expediente físico.",
      tone: "bg-leve-50 text-leve-700",
    };
  }
  if (event.event_type === "convivencia_interviewed") {
    return {
      ...base,
      title: "Entrevista con Convivencia realizada",
      description:
        event.event_detail || "Entrevista registrada por Convivencia Escolar.",
      tone: "bg-leve-50 text-leve-700",
    };
  }
  if (event.event_type === "registered") {
    const isPhysical = event.metadata?.origin === "physical";
    return {
      ...base,
      title: `${isPhysical ? "Carta física registrada" : "Carta registrada"}: ${letterType}`,
      description:
        event.event_detail ||
        (isPhysical
          ? "Constancia registrada sin modificar anotaciones."
          : "Registro en Supabase confirmado."),
      tone: "bg-leve-50 text-leve-700",
    };
  }
  if (event.event_type === "annulled") {
    return {
      ...base,
      title: `Carta anulada: ${letterType}`,
      description: event.event_detail || "Sin motivo registrado.",
      tone: "bg-neutral-100 text-neutral-600",
    };
  }
  return {
    ...base,
    title: `Evento de carta: ${letterType}`,
    description: event.event_detail || "Sin detalle registrado.",
    tone: "bg-neutral-100 text-neutral-600",
  };
}

export default function HistoryTab({
  studentId,
  cartas,
  documentAnalyses,
  etapas,
  processes,
  files,
  letterOutputEvents,
  cartaEvents,
}: HistoryTabProps) {
  const [kindFilter, setKindFilter] = useState<HistoryFilterKind>("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDirection, setSortDirection] =
    useState<HistorySortDirection>("desc");
  const manualHistory = useStudentHistoryEntries(studentId);
  const relevantCartaEvents = cartaEvents.filter(
    (event) =>
      event.event_type !== "created" && event.event_type !== "suggested",
  );
  const cartasWithEvents = new Set(
    relevantCartaEvents.map((event) => event.carta_id),
  );
  const syntheticCartaItems = cartas.reduce<TimelineItem[]>((items, carta) => {
    if (cartasWithEvents.has(carta.id)) return items;
    const status = resolveCartaWorkflowStatus(carta);
    if (status === "archived") {
      items.push({
        id: `carta-${carta.id}`,
        kind: "Cartas" as const,
        date: carta.archived_at || carta.created_at || carta.emission_date,
        icon: <FileText className="h-4 w-4" />,
        title: `Carta archivada: ${carta.letter_type}`,
        description:
          carta.archived_note ||
          "Carta firmada y archivada en expediente físico.",
        tone: "bg-leve-50 text-leve-700",
      });
      return items;
    }
    if (status === "completed") {
      items.push({
        id: `carta-${carta.id}`,
        kind: "Cartas" as const,
        date: carta.created_at || carta.emission_date,
        icon: <FileText className="h-4 w-4" />,
        title: `Carta realizada: ${carta.letter_type}`,
        description: "Medio de validación registrado en la carta.",
        tone: "bg-leve-50 text-leve-700",
      });
      return items;
    }
    if (status === "annulled") {
      items.push({
        id: `carta-${carta.id}`,
        kind: "Cartas" as const,
        date: carta.created_at || carta.emission_date,
        icon: <FileText className="h-4 w-4" />,
        title: `Carta anulada: ${carta.letter_type}`,
        description:
          carta.annulled_reason ||
          carta.observations ||
          "Sin motivo registrado.",
        tone: "bg-neutral-100 text-neutral-600",
      });
      return items;
    }
    return items;
  }, []);

  const allItems: TimelineItem[] = useMemo(() => {
    const cartasByIdInner = new Map(cartas.map((carta) => [carta.id, carta]));
    const all: TimelineItem[] = [
      ...manualHistory.entries.map((entry) => ({
        id: `manual-${entry.id}`,
        kind: "Manual" as const,
        date: entry.created_at,
        icon: <NotebookPen className="h-4 w-4" />,
        title: entry.title,
        description: entry.description,
        tone: "bg-grave-50 text-grave-700",
      })),
      ...files.map((file) => ({
        id: `file-${file.id}`,
        kind: "PDF" as const,
        date: file.uploaded_at,
        icon: <Upload className="h-4 w-4" />,
        title: "PDF subido",
        description:
          file.original_file_name || file.file_name || file.storage_path,
        tone: "bg-blue-50 text-blue-700",
      })),
      ...documentAnalyses.map((analysis) => ({
        id: `analysis-${analysis.id}`,
        kind: "PDF" as const,
        date: analysis.analyzed_at,
        icon: <FileSearch className="h-4 w-4" />,
        title: "PDF analizado",
        description: `${analysis.file_name || "Documento"} · ${analysis.negativas} negativas, ${analysis.positivas} positivas, ${analysis.informativas} informativas`,
        tone: "bg-brand-50 text-brand-700",
      })),
      ...processes.map((process) => ({
        id: `process-${process.id}`,
        kind: "PDF" as const,
        date: process.completed_at || process.created_at,
        icon: <CheckCircle2 className="h-4 w-4" />,
        title: process.is_completed
          ? "Actualización PDF confirmada"
          : "Proceso PDF creado",
        description: `${process.process_number} · ${process.total_negativas} negativas · sugerencia: ${process.final_letter_type || process.suggested_letter_type || "sin carta"}`,
        tone: "bg-leve-50 text-leve-700",
      })),
      ...relevantCartaEvents.map((event) =>
        describeCartaEvent(event, cartasByIdInner.get(event.carta_id)),
      ),
      ...letterOutputEvents.map((event) => ({
        id: `letter-output-${event.id}`,
        kind: "Cartas" as const,
        date: event.created_at,
        icon: <FileText className="h-4 w-4" />,
        title:
          event.event_name === "letter_printed"
            ? "Carta impresa"
            : "Carta descargada",
        description: `${event.properties.letterType || "Carta"} · evento legacy de uso`,
        tone: "bg-cyan-50 text-cyan-700",
      })),
      ...syntheticCartaItems,
      ...etapas.map((etapa) => ({
        id: `etapa-${etapa.id}`,
        kind: "Etapas" as const,
        date: etapa.transition_date || etapa.created_at,
        icon: <ScrollText className="h-4 w-4" />,
        title: `Cambio de etapa disciplinaria: ${etapa.stage_name}`,
        description: `${etapa.responsible || "Sin responsable"}${etapa.comment ? ` · ${etapa.comment}` : ""}`,
        tone: "bg-purple-50 text-purple-700",
      })),
    ];
    return all;
  }, [
    manualHistory.entries,
    files,
    documentAnalyses,
    processes,
    relevantCartaEvents,
    letterOutputEvents,
    syntheticCartaItems,
    etapas,
    cartas,
  ]);

  const visibleItems = useMemo(
    () =>
      sortHistoryItems(
        filterHistoryItems(allItems, kindFilter, searchQuery),
        sortDirection,
      ),
    [allItems, kindFilter, searchQuery, sortDirection],
  );
  const groups = useMemo(
    () => groupHistoryItemsByMonth(visibleItems),
    [visibleItems],
  );
  const hasActiveFilters =
    kindFilter !== "Todos" || searchQuery.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-xl border border-dashed border-sky-300 bg-sky-50/70 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-600 font-bold text-lg text-white shadow-sm"
          >
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-neutral-900">
              ¿Deseas registrar un nuevo evento o actualización?
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              Ingresa actas de entrevistas, acuerdos con apoderados o cartas
              físicas emitidas.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-lg bg-white px-3 py-2 text-xs font-semibold text-neutral-600 shadow-sm sm:self-auto">
          <NotebookPen className="h-4 w-4" aria-hidden="true" />
          Registro manual
        </span>
      </div>
      <ManualHistoryEntryForm
        studentId={studentId}
        isSaving={manualHistory.isCreating}
        error={manualHistory.createError}
        onSave={manualHistory.createEntry}
        onResetError={manualHistory.resetCreateError}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
        <div className="flex min-w-52 flex-1 items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
            <label htmlFor="history-kind-filter">Filtrar:</label>
            <select
              id="history-kind-filter"
              value={kindFilter}
              onChange={(e) =>
                setKindFilter(e.target.value as HistoryFilterKind)
              }
              className="rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 font-medium text-xs normal-case tracking-normal text-neutral-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              {(["Todos", "Cartas", "PDF", "Etapas", "Manual"] as const).map(
                (kind) => (
                  <option key={kind} value={kind}>
                    {kind === "Todos" ? "Todos los eventos" : kind}
                  </option>
                ),
              )}
            </select>
          </div>
          <div className="relative max-w-sm flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-neutral-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por palabra clave..."
              aria-label="Buscar en el historial por palabra clave"
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-1.5 pr-3 pl-8 text-xs text-neutral-700 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <span role="status">
            <strong className="text-neutral-800">{visibleItems.length}</strong>{" "}
            eventos registrados
          </span>
          <span className="border-l border-neutral-200 pl-3">
            Orden:{" "}
            <button
              type="button"
              onClick={() =>
                setSortDirection((direction) =>
                  direction === "desc" ? "asc" : "desc",
                )
              }
              className="font-medium text-neutral-700 hover:text-sky-600"
            >
              {sortDirection === "desc"
                ? "Más recientes primero"
                : "Más antiguos primero"}
            </button>
          </span>
        </div>
      </div>

      {manualHistory.loadError && (
        <p
          role="alert"
          className="rounded-xl bg-gravisima-50 px-4 py-3 text-gravisima-700 text-sm"
        >
          {manualHistory.loadError}
        </p>
      )}

      {manualHistory.isLoading && visibleItems.length === 0 ? (
        <div
          role="status"
          className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white p-8 text-neutral-500 text-sm"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando historial...
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-xs">
          <History className="mx-auto mb-3 h-12 w-12 text-neutral-300" />
          <p className="text-sm text-neutral-500">
            {hasActiveFilters
              ? "Sin resultados para los filtros aplicados."
              : "No hay eventos disciplinarios registrados para este estudiante."}
          </p>
        </div>
      ) : (
        <div className="relative space-y-6">
          <div
            aria-hidden="true"
            className="absolute top-8 bottom-4 left-6 w-0.5 bg-neutral-200"
          />
          {groups.map((group) => (
            <div key={group.key}>
              <div className="relative z-10 flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  {group.label}
                </span>
                <div
                  aria-hidden="true"
                  className="h-px flex-1 bg-neutral-200"
                />
              </div>
              <div className="mt-4 space-y-4">
                {group.items.map((item) => {
                  const badge = getHistoryBadge(item);
                  return (
                    <article
                      key={item.id}
                      className="relative flex items-start gap-4"
                    >
                      <div
                        aria-hidden="true"
                        className={`z-10 mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 bg-white shadow-sm ${badge.iconClass}`}
                      >
                        {item.icon}
                      </div>
                      <div className="flex-1 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                        <div className="mb-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded border px-2 py-0.5 font-semibold text-[11px] ${badge.badgeClass}`}
                            >
                              {badge.label}
                            </span>
                            <h3 className="font-bold text-sm text-neutral-900">
                              {item.title}
                            </h3>
                          </div>
                          <span className="shrink-0 text-xs text-neutral-500">
                            {formatDate(item.date)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-xs leading-relaxed text-neutral-600">
                          {item.description}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="flex items-center justify-center gap-2 pt-2 pb-4 text-center text-xs text-neutral-400">
            <CheckCircle2
              className="h-3.5 w-3.5 text-neutral-300"
              aria-hidden="true"
            />
            Has llegado al inicio del registro de este período lectivo
          </p>
        </div>
      )}
    </div>
  );
}
