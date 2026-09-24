/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  FileText,
  History,
  Search,
} from "lucide-react";
import {
  fetchExpedienteCompleto,
  buildExpedienteHistory,
  filterExpedienteHistory,
} from "../../../shared/api/services/expediente.service";
import { openDocument } from "../../../shared/api/services/storage.service";
import { formatChileDateTime } from "../../../shared/lib/dateTime";
import type { Causa, ExpedienteHistoryEntry } from "../../../shared/lib/types";

interface ExpedienteHistoryPanelProps {
  causa: Causa;
}

const STATUS_LABELS: Record<ExpedienteHistoryEntry["status"], string> = {
  vigente: "Vigente",
  rectificado: "Rectificado",
  invalidado: "Invalidado",
};

export default function ExpedienteHistoryPanel({
  causa,
}: ExpedienteHistoryPanelProps) {
  const [entries, setEntries] = useState<ExpedienteHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState<ExpedienteHistoryEntry["status"] | "">(
    "",
  );
  const [origin, setOrigin] = useState<ExpedienteHistoryEntry["origin"] | "">(
    "",
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    void fetchExpedienteCompleto(causa.id)
      .then((expediente) => {
        if (active) setEntries(buildExpedienteHistory(expediente));
      })
      .catch(() => {
        if (active) setError("No fue posible cargar el historial unificado.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [causa.id]);

  const types = useMemo(
    () =>
      [...new Set(entries.map((entry) => entry.type))].sort((a, b) =>
        a.localeCompare(b, "es-CL"),
      ),
    [entries],
  );
  const filtered = useMemo(
    () =>
      filterExpedienteHistory(entries, {
        search,
        type: type || undefined,
        status: status || undefined,
        origin: origin || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    [dateFrom, dateTo, entries, origin, search, status, type],
  );

  return (
    <section aria-labelledby="expediente-history-title" className="space-y-3">
      <div className="flex items-start gap-2.5">
        <span
          className="rounded-lg bg-brand-100 p-1.5 text-brand-700"
          aria-hidden="true"
        >
          <History className="size-4" />
        </span>
        <div>
          <h3
            id="expediente-history-title"
            className="font-semibold text-neutral-900 text-sm"
          >
            Historial cronológico unificado
          </h3>
          <p className="mt-0.5 text-neutral-600 text-xs">
            Actuaciones, avances y registros compartidos ordenados por fecha del
            hecho.
          </p>
        </div>
      </div>

      <div className="grid gap-2 rounded-lg border border-neutral-150 bg-white p-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="relative sm:col-span-2 lg:col-span-3">
          <span className="sr-only">Buscar historial</span>
          <Search
            className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-neutral-500"
            aria-hidden="true"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar título, descripción, participante, hito o documento"
            className="min-h-10 w-full rounded-lg border border-neutral-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            aria-label="Buscar historial unificado"
          />
        </label>
        <label className="space-y-1">
          <span className="text-10px font-semibold text-neutral-600">Tipo</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="min-h-10 w-full rounded-lg border border-neutral-200 bg-white px-2.5 text-sm"
          >
            <option value="">Todos</option>
            {types.map((itemType) => (
              <option key={itemType} value={itemType}>
                {itemType}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-10px font-semibold text-neutral-600">
            Estado
          </span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="min-h-10 w-full rounded-lg border border-neutral-200 bg-white px-2.5 text-sm"
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-10px font-semibold text-neutral-600">
            Origen
          </span>
          <select
            value={origin}
            onChange={(event) => setOrigin(event.target.value as typeof origin)}
            className="min-h-10 w-full rounded-lg border border-neutral-200 bg-white px-2.5 text-sm"
          >
            <option value="">Todos</option>
            <option value="individual">Individual</option>
            <option value="grupal">Grupal</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-10px font-semibold text-neutral-600">
            Desde
          </span>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="min-h-10 w-full rounded-lg border border-neutral-200 bg-white px-2.5 text-sm"
            aria-label="Fecha inicial del historial"
          />
        </label>
        <label className="space-y-1">
          <span className="text-10px font-semibold text-neutral-600">
            Hasta
          </span>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="min-h-10 w-full rounded-lg border border-neutral-200 bg-white px-2.5 text-sm"
            aria-label="Fecha final del historial"
          />
        </label>
      </div>

      {isLoading && (
        <p className="rounded-lg border border-neutral-150 bg-white p-4 text-sm text-neutral-600">
          Cargando historial…
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-grave-200 bg-grave-50 p-4 text-sm text-grave-800"
        >
          {error}
        </p>
      )}
      {!isLoading &&
        !error &&
        (filtered.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-neutral-500">
              Mostrando{" "}
              <strong className="text-neutral-700">{filtered.length}</strong> de{" "}
              {entries.length} registros.
            </p>
            {filtered.map((entry) => (
              <article
                key={entry.id}
                className={`rounded-lg border p-3 ${entry.status === "invalidado" ? "border-grave-200 bg-grave-50/60" : entry.status === "rectificado" ? "border-warning-200 bg-warning-50/50" : "border-neutral-150 bg-white"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h4 className="font-semibold text-neutral-900 text-sm">
                        {entry.title}
                      </h4>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-semibold text-10px text-neutral-700">
                        {entry.type}
                      </span>
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-10px text-brand-700">
                        {entry.origin === "grupal" ? "Grupal" : "Individual"}
                      </span>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-semibold text-10px text-neutral-700">
                        {STATUS_LABELS[entry.status]}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-neutral-600 text-xs">
                      {entry.description}
                    </p>
                  </div>
                  <time className="shrink-0 font-mono text-10px text-neutral-500">
                    {formatChileDateTime(entry.occurredAt)}
                  </time>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-10px text-neutral-500">
                  {entry.responsible && (
                    <span>Responsable: {entry.responsible}</span>
                  )}
                  {entry.participants.length > 0 && (
                    <span>Participantes: {entry.participants.join(", ")}</span>
                  )}
                  {entry.milestoneId && <span>Hito: {entry.milestoneId}</span>}
                  {entry.hechoId && <span>Hecho: {entry.hechoId}</span>}
                  {entry.recordedAt &&
                    entry.recordedAt !== entry.occurredAt && (
                      <span>
                        Registrado: {formatChileDateTime(entry.recordedAt)}
                      </span>
                    )}
                </div>
                {entry.documentNames.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {entry.documentNames.map((name, index) => {
                      const path = entry.documentPaths[index];
                      return path ? (
                        <button
                          key={`${path}-${name}`}
                          type="button"
                          onClick={() => void openDocument(path)}
                          className="inline-flex items-center gap-1.5 text-10px font-medium text-brand-700 hover:underline"
                        >
                          <FileText className="size-3" aria-hidden="true" />
                          {name}
                          <Download className="size-3" aria-hidden="true" />
                        </button>
                      ) : (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1.5 text-10px font-medium text-neutral-600"
                        >
                          <FileText className="size-3" aria-hidden="true" />
                          {name}
                        </span>
                      );
                    })}
                  </div>
                )}
                {entry.correctionReason && (
                  <p className="mt-2 flex items-start gap-1.5 text-10px text-grave-800">
                    <AlertTriangle
                      className="mt-0.5 size-3 shrink-0"
                      aria-hidden="true"
                    />
                    {entry.correctionReason}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-neutral-150 bg-white p-6 text-center text-sm text-neutral-500">
            No hay registros para los filtros seleccionados.
          </p>
        ))}
    </section>
  );
}
