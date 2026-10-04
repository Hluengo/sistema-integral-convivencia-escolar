/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useState } from "react";
import { AlertTriangle, Download, FileText, History } from "lucide-react";
import {
  fetchExpedienteCompleto,
  buildExpedienteHistory,
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
        (entries.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-neutral-500">
              Mostrando{" "}
              <strong className="text-neutral-700">{entries.length}</strong> de{" "}
              {entries.length} registros.
            </p>
            {entries.map((entry) => {
              const [fecha, hora] = formatChileDateTime(entry.occurredAt)
                .split(",")
                .map((part) => part.trim());
              return (
                <article
                  key={entry.id}
                  className={`rounded-lg border p-5 shadow-sm ${entry.status === "invalidado" ? "border-grave-200 bg-grave-50/60" : entry.status === "rectificado" ? "border-warning-200 bg-warning-50/50" : "border-neutral-150 bg-white"}`}
                >
                  <div className="flex flex-col gap-6 md:flex-row">
                    <div className="shrink-0 border-b border-neutral-100 pb-2 md:w-32 md:border-b-0 md:border-r md:pb-0 md:pr-4">
                      <span className="block font-mono text-xs font-medium text-neutral-600">
                        {fecha}
                      </span>
                      {hora && (
                        <span className="mt-0.5 block font-mono text-[11px] text-neutral-400">
                          {hora}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-neutral-900 text-sm">
                          {entry.title}
                        </h4>
                        <span className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 font-medium text-[10px] text-neutral-600">
                          {entry.type}
                        </span>
                        <span className="rounded border border-brand-200 bg-brand-50 px-1.5 py-0.5 font-medium text-[10px] text-brand-700">
                          {entry.origin === "grupal" ? "Grupal" : "Individual"}
                        </span>
                        <span className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-medium text-[10px] text-neutral-600">
                          {STATUS_LABELS[entry.status]}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed text-neutral-600 text-xs">
                        {entry.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-10px text-neutral-500">
                        {entry.responsible && (
                          <span>Responsable: {entry.responsible}</span>
                        )}
                        {entry.participants.length > 0 && (
                          <span>
                            Participantes: {entry.participants.join(", ")}
                          </span>
                        )}
                        {entry.milestoneId && (
                          <span>Hito: {entry.milestoneId}</span>
                        )}
                        {entry.hechoId && <span>Hecho: {entry.hechoId}</span>}
                        {entry.recordedAt &&
                          entry.recordedAt !== entry.occurredAt && (
                            <span>
                              Registrado:{" "}
                              {formatChileDateTime(entry.recordedAt)}
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
                                <FileText
                                  className="size-3"
                                  aria-hidden="true"
                                />
                                {name}
                                <Download
                                  className="size-3"
                                  aria-hidden="true"
                                />
                              </button>
                            ) : (
                              <span
                                key={name}
                                className="inline-flex items-center gap-1.5 text-10px font-medium text-neutral-600"
                              >
                                <FileText
                                  className="size-3"
                                  aria-hidden="true"
                                />
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
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg border border-neutral-150 bg-white p-6 text-center text-sm text-neutral-500">
            No hay registros en el historial.
          </p>
        ))}
    </section>
  );
}
