/** @license SPDX-License-Identifier: Apache-2.0 */

import { memo, useMemo, useState } from "react";
import type { Causa, BitacoraEntry, UserRole } from "../../shared/lib/types";
import {
  Bell,
  Calendar,
  Download,
  File,
  FileText,
  Handshake,
  History,
  Mail,
  MessageSquare,
  NotebookPen,
  Phone,
  Scale,
  Search,
  Upload,
} from "lucide-react";
import {
  DOCUMENT_UPLOAD_ACCEPT,
  DOCUMENT_UPLOAD_PLACEHOLDER,
  openDocument,
} from "../../shared/api/services/storage.service";
import { formatChileDateTime } from "../../shared/lib/dateTime";
import HistoryEntryForm from "../../shared/ui/HistoryEntryForm";
import type { ManualBitacoraEntryInput } from "../../shared/lib/hooks/useBitacoraLog";
import { useChecklistProgress } from "../../shared/lib/hooks/useChecklistProgress";

interface BitacoraTabProps {
  causa: Causa;
  currentRole: UserRole;
  onCreateManualEntry: (input: ManualBitacoraEntryInput) => Promise<void>;
  isSavingManualEntry: boolean;
  manualEntryError: string | null;
  onResetManualEntryError: () => void;
}

const ENTRY_STYLE: Record<
  BitacoraEntry["tipo"],
  { tone: string; Icon: typeof History; label: string }
> = {
  Entrevista: {
    tone: "bg-brand-50 text-brand-700 border-brand-200",
    Icon: NotebookPen,
    label: "Entrevista",
  },
  Evidencia: {
    tone: "bg-amber-50 text-amber-700 border-amber-200",
    Icon: FileText,
    label: "Evidencia",
  },
  Notificación: {
    tone: "bg-purple-50 text-purple-700 border-purple-200",
    Icon: Bell,
    label: "Notificación",
  },
  Mediación: {
    tone: "bg-teal-50 text-teal-700 border-teal-200",
    Icon: Handshake,
    label: "Mediación",
  },
  Resolución: {
    tone: "bg-brand-50 text-brand-700 border-brand-200",
    Icon: Scale,
    label: "Resolución",
  },
  Citación: {
    tone: "bg-indigo-50 text-indigo-700 border-indigo-200",
    Icon: Calendar,
    label: "Citación",
  },
  Correo: {
    tone: "bg-blue-50 text-blue-700 border-blue-200",
    Icon: Mail,
    label: "Correo",
  },
  Descargo: {
    tone: "bg-orange-50 text-orange-700 border-orange-200",
    Icon: MessageSquare,
    label: "Descargo",
  },
  Otro: {
    tone: "bg-neutral-100 text-neutral-700 border-neutral-150",
    Icon: History,
    label: "Otro",
  },
};

const FILTER_OPTIONS: Array<{
  id: BitacoraEntry["tipo"] | "Todos";
  label: string;
}> = [
  { id: "Todos", label: "Todos" },
  { id: "Notificación", label: "Notificaciones" },
  { id: "Citación", label: "Citaciones" },
  { id: "Entrevista", label: "Entrevistas" },
  { id: "Descargo", label: "Descargos" },
  { id: "Correo", label: "Correos" },
  { id: "Evidencia", label: "Evidencias" },
  { id: "Resolución", label: "Resoluciones" },
];

export default memo(function BitacoraTab({
  causa,
  currentRole,
  onCreateManualEntry,
  isSavingManualEntry,
  manualEntryError,
  onResetManualEntryError,
}: BitacoraTabProps) {
  const [logType, setLogType] = useState<BitacoraEntry["tipo"]>("Entrevista");
  const [participants, setParticipants] = useState("");
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [manualFileName, setManualFileName] = useState("");
  const [documentScope, setDocumentScope] = useState<"causa" | "incidente">(
    "causa",
  );
  const [filter, setFilter] = useState<BitacoraEntry["tipo"] | "Todos">(
    "Todos",
  );
  const [search, setSearch] = useState("");

  const { entries: progressEntries, isLoading: isLoadingProgress } =
    useChecklistProgress(causa.id, causa.incidenteId);
  const checklistLabels = new Map(
    causa.checklistDebidoProceso.map((item) => [item.id, item.label]),
  );

  const entries = useMemo(
    () =>
      [...causa.bitacora].sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
      ),
    [causa.bitacora],
  );

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filter !== "Todos" && e.tipo !== filter) {
        // Descargo puede venir como Otro con "descargo" en título
        if (
          filter === "Descargo" &&
          e.tipo === "Otro" &&
          /descargo/i.test(e.titulo + e.descripcion)
        )
          return true;
        return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        e.titulo.toLowerCase().includes(q) ||
        e.descripcion.toLowerCase().includes(q) ||
        e.participantes.join(",").toLowerCase().includes(q)
      );
    });
  }, [entries, filter, search]);

  const stats = useMemo(() => {
    const byTipo = entries.reduce<Record<string, number>>((acc, e) => {
      acc[e.tipo] = (acc[e.tipo] ?? 0) + 1;
      return acc;
    }, {});
    return {
      total: entries.length,
      notificaciones: byTipo["Notificación"] ?? 0,
      citaciones: byTipo["Citación"] ?? 0,
      entrevistas: byTipo["Entrevista"] ?? 0,
      correos: byTipo["Correo"] ?? 0,
      conDocumento: entries.filter((e) => e.documentoAdjunto).length,
    };
  }, [entries]);

  return (
    <div className="space-y-4">
      {/* Header centro */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-sm text-neutral-900">
              <Mail className="size-4 text-brand-600" /> Centro de
              comunicaciones
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Cronología de notificaciones, citaciones, entrevistas, descargos y
              correos. Cada registro queda en el historial y puede llevar
              respaldo documental.
            </p>
          </div>
          {causa.apoderadoEmail && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              <Mail className="size-3.5" /> Apoderado: {causa.apoderadoEmail}
            </span>
          )}
        </div>

        <p className="mt-3 text-xs text-neutral-600">
          <strong className="text-neutral-900">{stats.total}</strong>{" "}
          comunicaciones · {stats.notificaciones} notifs. · {stats.entrevistas}{" "}
          entrevs. · {stats.conDocumento} con doc.
        </p>

        {/* Filtros + búsqueda */}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  setFilter(opt.id as BitacoraEntry["tipo"] | "Todos")
                }
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                  filter === opt.id
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-neutral-150 bg-white text-neutral-600 hover:bg-neutral-50"
                }`}
                aria-pressed={filter === opt.id}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en comunicaciones…"
              className="w-full rounded-lg border border-neutral-150 bg-white py-2 pl-8 pr-3 text-sm outline-none placeholder:text-neutral-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              aria-label="Buscar en comunicaciones"
            />
          </div>
        </div>
      </div>

      {/* Form registro — renombrado */}
      {currentRole !== "docente" && (
        <HistoryEntryForm
          idPrefix="causa-history"
          isSaving={isSavingManualEntry}
          error={manualEntryError}
          helperText="Registra una comunicación. Quedará en la cronología y puede compartirse con el incidente grupal."
          onSave={async ({ title, description }) => {
            await onCreateManualEntry({
              title,
              description,
              type: logType,
              participants,
              documentFile: manualFile,
              documentScope,
            });
            setParticipants("");
            setLogType("Entrevista");
            setManualFile(null);
            setManualFileName("");
            setDocumentScope("causa");
          }}
          onResetError={onResetManualEntryError}
          onClose={() => {
            setParticipants("");
            setLogType("Entrevista");
            setManualFile(null);
            setManualFileName("");
            setDocumentScope("causa");
          }}
          additionalFields={
            <details
              open
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5"
            >
              <summary className="cursor-pointer font-semibold text-neutral-700 text-sm">
                Detalles del registro
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="block font-semibold text-neutral-700 text-sm">
                    Tipo
                  </span>
                  <select
                    value={logType}
                    onChange={(event) =>
                      setLogType(event.target.value as BitacoraEntry["tipo"])
                    }
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-neutral-900 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="Entrevista">Entrevista</option>
                    <option value="Evidencia">Evidencia</option>
                    <option value="Notificación">Notificación</option>
                    <option value="Citación">Citación</option>
                    <option value="Correo">Correo</option>
                    <option value="Descargo">Descargo</option>
                    <option value="Mediación">Mediación</option>
                    <option value="Resolución">Resolución</option>
                    <option value="Otro">Otro</option>
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="block font-semibold text-neutral-700 text-sm">
                    Participantes / destinatarios
                  </span>
                  <input
                    aria-label="Participantes"
                    type="text"
                    spellCheck={false}
                    value={participants}
                    onChange={(event) => setParticipants(event.target.value)}
                    placeholder="Ej: Apoderado, estudiante, inspector"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-neutral-900 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                  />
                </label>
                <label className="space-y-1.5 sm:col-span-2">
                  <span className="block font-semibold text-neutral-700 text-sm">
                    Documento de respaldo
                  </span>
                  <span className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-3 py-2.5 text-neutral-600 text-sm transition hover:border-brand-300 hover:bg-brand-50/40">
                    <Upload
                      className="h-4 w-4 text-brand-600"
                      aria-hidden="true"
                    />
                    <span className="truncate">
                      {manualFileName || DOCUMENT_UPLOAD_PLACEHOLDER}
                    </span>
                    <input
                      aria-label="Documento de respaldo"
                      type="file"
                      className="sr-only"
                      accept={DOCUMENT_UPLOAD_ACCEPT}
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setManualFile(file);
                        setManualFileName(file?.name ?? "");
                        onResetManualEntryError();
                      }}
                    />
                  </span>
                </label>
                {causa.incidenteId && (
                  <label
                    htmlFor="manual-log-share"
                    className="flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50/50 p-2.5 text-10px text-brand-950 sm:col-span-2"
                  >
                    <input
                      id="manual-log-share"
                      aria-label="Compartir avance con el incidente grupal"
                      type="checkbox"
                      checked={documentScope === "incidente"}
                      onChange={(event) =>
                        setDocumentScope(
                          event.target.checked ? "incidente" : "causa",
                        )
                      }
                      className="mt-0.5 h-3.5 w-3.5 rounded border-brand-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span>
                      Compartir esta comunicación y su documento con el
                      incidente grupal.
                    </span>
                  </label>
                )}
              </div>
            </details>
          }
        />
      )}

      {progressEntries.length > 0 && (
        <section
          className="rounded-xl border border-brand-200 bg-brand-50/40 p-4"
          aria-labelledby="progress-history-title"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3
                id="progress-history-title"
                className="font-semibold text-brand-950 text-sm"
              >
                Avances vinculados a hitos
              </h3>
              <p className="mt-0.5 text-brand-900/70 text-11px">
                Cada registro conserva el hito al que pertenece.
              </p>
            </div>
            {isLoadingProgress && (
              <span className="text-10px text-brand-800">Actualizando…</span>
            )}
          </div>
          <div className="mt-3 space-y-2">
            {progressEntries
              .filter((entry) => !entry.invalidatedAt)
              .map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-lg border border-brand-100 bg-white p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-neutral-900 text-xs">
                        {entry.title}
                      </p>
                      <p className="mt-0.5 text-10px text-brand-800">
                        {checklistLabels.get(entry.checklistItemId) ||
                          "Hito del expediente"}
                      </p>
                    </div>
                    <time className="font-mono text-9px text-neutral-500">
                      {formatChileDateTime(entry.occurredAt)}
                    </time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-neutral-600 text-xs">
                    {entry.description}
                  </p>
                  {entry.documentName && entry.documentUrl && (
                    <button
                      type="button"
                      onClick={() => void openDocument(entry.documentUrl || "")}
                      className="mt-2 inline-flex items-center gap-1 font-semibold text-info-700 text-10px hover:underline"
                    >
                      <File className="size-3" aria-hidden="true" />{" "}
                      {entry.documentName}
                    </button>
                  )}
                </article>
              ))}
          </div>
        </section>
      )}

      {/* Cronología */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs text-neutral-500">
            Mostrando{" "}
            <strong className="text-neutral-700">{filtered.length}</strong> de{" "}
            {entries.length} comunicaciones
            {filter !== "Todos" ? ` · filtro: ${filter}` : ""}
          </p>
          {filtered.map((entry) => {
            const style = ENTRY_STYLE[entry.tipo] ?? ENTRY_STYLE.Otro;
            const Icon = style.Icon;
            const isNotificacion = entry.tipo === "Notificación";
            const hasCorreo = entry.tipo === "Correo";
            return (
              <article
                key={entry.id}
                className="flex gap-3 rounded-xl border border-neutral-150 bg-white p-4 shadow-xs"
              >
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${style.tone}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-neutral-900">
                        {entry.titulo}
                      </h3>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-10px font-semibold ${style.tone}`}
                      >
                        {style.label}
                      </span>
                      {isNotificacion && causa.apoderadoEmail && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-10px font-medium text-blue-700">
                          <Mail className="size-3" /> Enviado a{" "}
                          {causa.apoderadoEmail}
                        </span>
                      )}
                      {hasCorreo && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-10px font-medium text-emerald-700">
                          <Phone className="size-3" /> Correo registrado
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-neutral-400">
                      {formatChileDateTime(entry.fecha)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">
                    {entry.descripcion}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-400">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    {entry.participantes.length > 0
                      ? entry.participantes.join(", ")
                      : "Sin participantes"}
                  </p>
                  {entry.documentoAdjunto && (
                    <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-2 text-xs">
                      <File
                        className="h-3.5 w-3.5 shrink-0 text-brand-500"
                        aria-hidden="true"
                      />
                      <span className="truncate font-medium text-brand-700">
                        Documento adjunto
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (entry.documentoAdjunto)
                            void openDocument(entry.documentoAdjunto);
                        }}
                        className="ml-auto flex shrink-0 items-center gap-1 font-semibold text-brand-600 hover:underline"
                        aria-label="Ver documento adjunto"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                        Ver
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-150 bg-white p-8 text-center shadow-xs">
          <History
            className="mx-auto mb-3 h-12 w-12 text-neutral-200"
            aria-hidden="true"
          />
          <p className="text-sm text-neutral-500">
            {entries.length === 0
              ? "No hay comunicaciones registradas. Registra la primera notificación o entrevista."
              : `Sin resultados para "${search}" en ${filter}.`}
          </p>
        </div>
      )}
    </div>
  );
});
