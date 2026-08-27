/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { memo, useState } from 'react';
import type { Causa, BitacoraEntry, UserRole } from '../../shared/lib/types';
import {
  Bell,
  Calendar,
  Download,
  File,
  FileText,
  Handshake,
  History,
  NotebookPen,
  Scale,
  Upload,
} from 'lucide-react';
import {
  DOCUMENT_UPLOAD_ACCEPT,
  DOCUMENT_UPLOAD_PLACEHOLDER,
  openDocument,
} from '../../shared/api/services/storage.service';
import { formatChileDateTime } from '../../shared/lib/dateTime';
import HistoryEntryForm from '../../shared/ui/HistoryEntryForm';
import type { ManualBitacoraEntryInput } from '../../shared/lib/hooks/useBitacoraLog';
import { useChecklistProgress } from '../../shared/lib/hooks/useChecklistProgress';

interface BitacoraTabProps {
  causa: Causa;
  currentRole: UserRole;
  onCreateManualEntry: (input: ManualBitacoraEntryInput) => Promise<void>;
  isSavingManualEntry: boolean;
  manualEntryError: string | null;
  onResetManualEntryError: () => void;
}

const ENTRY_STYLE: Record<BitacoraEntry['tipo'], { tone: string; Icon: typeof History }> = {
  Entrevista: { tone: 'bg-info-50 text-info-700', Icon: NotebookPen },
  Evidencia: { tone: 'bg-grave-50 text-grave-700', Icon: FileText },
  Notificación: { tone: 'bg-purple-50 text-purple-700', Icon: Bell },
  Mediación: { tone: 'bg-leve-50 text-leve-700', Icon: Handshake },
  Resolución: { tone: 'bg-brand-50 text-brand-700', Icon: Scale },
  Otro: { tone: 'bg-neutral-100 text-neutral-700', Icon: History },
};

export default memo(function BitacoraTab({
  causa,
  currentRole,
  onCreateManualEntry,
  isSavingManualEntry,
  manualEntryError,
  onResetManualEntryError,
}: BitacoraTabProps) {
  const [logType, setLogType] = useState<BitacoraEntry['tipo']>('Entrevista');
  const [participants, setParticipants] = useState('');
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [manualFileName, setManualFileName] = useState('');
  const [documentScope, setDocumentScope] = useState<'causa' | 'incidente'>('causa');
  const { entries: progressEntries, isLoading: isLoadingProgress } = useChecklistProgress(
    causa.id,
    causa.incidenteId,
  );
  const checklistLabels = new Map(
    causa.checklistDebidoProceso.map((item) => [item.id, item.label]),
  );
  const entries = [...causa.bitacora].sort(
    (first, second) => new Date(second.fecha).getTime() - new Date(first.fecha).getTime(),
  );

  return (
    <div className="space-y-4">
      {currentRole !== 'docente' && (
        <HistoryEntryForm
          idPrefix="causa-history"
          isSaving={isSavingManualEntry}
          error={manualEntryError}
          helperText="No modifica etapas ni elimina antecedentes del expediente."
          onSave={async ({ title, description }) => {
            await onCreateManualEntry({
              title,
              description,
              type: logType,
              participants,
              documentFile: manualFile,
              documentScope,
            });
            setParticipants('');
            setLogType('Entrevista');
            setManualFile(null);
            setManualFileName('');
            setDocumentScope('causa');
          }}
          onResetError={onResetManualEntryError}
          onClose={() => {
            setParticipants('');
            setLogType('Entrevista');
            setManualFile(null);
            setManualFileName('');
            setDocumentScope('causa');
          }}
          additionalFields={
            <details open className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
              <summary className="cursor-pointer font-semibold text-neutral-700 text-sm">
                Detalles del registro
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="block font-semibold text-neutral-700 text-sm">Tipo</span>
                  <select
                    value={logType}
                    onChange={(event) => setLogType(event.target.value as BitacoraEntry['tipo'])}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-neutral-900 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="Entrevista">Entrevista</option>
                    <option value="Evidencia">Evidencia</option>
                    <option value="Notificación">Notificación</option>
                    <option value="Mediación">Mediación</option>
                    <option value="Resolución">Resolución</option>
                    <option value="Otro">Otro</option>
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="block font-semibold text-neutral-700 text-sm">
                    Participantes
                  </span>
                  <input
                    aria-label="Participantes"
                    type="text"
                    spellCheck={false}
                    value={participants}
                    onChange={(event) => setParticipants(event.target.value)}
                    placeholder="Separados por comas"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-neutral-900 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                  />
                </label>
                <label className="space-y-1.5 sm:col-span-2">
                  <span className="block font-semibold text-neutral-700 text-sm">
                    Documento de respaldo
                  </span>
                  <span className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-3 py-2.5 text-neutral-600 text-sm transition hover:border-brand-300 hover:bg-brand-50/40">
                    <Upload className="h-4 w-4 text-brand-600" aria-hidden="true" />
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
                        setManualFileName(file?.name ?? '');
                        onResetManualEntryError();
                      }}
                    />
                  </span>
                </label>
                {causa.incidenteId && (
                  <label htmlFor="manual-log-share" className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50/50 p-2.5 text-10px text-sky-950 sm:col-span-2">
                    <input
                      id="manual-log-share"
                      aria-label="Compartir avance con el incidente grupal"
                      type="checkbox"
                      checked={documentScope === 'incidente'}
                      onChange={(event) =>
                        setDocumentScope(event.target.checked ? 'incidente' : 'causa')
                      }
                      className="mt-0.5 h-3.5 w-3.5 rounded border-sky-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span>
                      Compartir este avance y su documento con el incidente grupal y sus expedientes vinculados.
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
          className="rounded-xl border border-sky-200 bg-sky-50/40 p-4"
          aria-labelledby="progress-history-title"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 id="progress-history-title" className="font-semibold text-sky-950 text-sm">
                Avances vinculados a hitos
              </h3>
              <p className="mt-0.5 text-sky-900/70 text-11px">
                Cada registro conserva el hito al que pertenece.
              </p>
            </div>
            {isLoadingProgress && <span className="text-10px text-sky-800">Actualizando…</span>}
          </div>
          <div className="mt-3 space-y-2">
            {progressEntries
              .filter((entry) => !entry.invalidatedAt)
              .map((entry) => (
                <article key={entry.id} className="rounded-lg border border-sky-100 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-neutral-900 text-xs">{entry.title}</p>
                      <p className="mt-0.5 text-10px text-sky-800">
                        {checklistLabels.get(entry.checklistItemId) || 'Hito del expediente'}
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
                      onClick={() => void openDocument(entry.documentUrl || '')}
                      className="mt-2 inline-flex items-center gap-1 font-semibold text-info-700 text-10px hover:underline"
                    >
                      <File className="size-3" aria-hidden="true" /> {entry.documentName}
                    </button>
                  )}
                </article>
              ))}
          </div>
        </section>
      )}

      {entries.length > 0 ? (
        <div className="space-y-3">
          {entries.map((entry) => {
            const { tone, Icon } = ENTRY_STYLE[entry.tipo];
            return (
              <article
                key={entry.id}
                className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-xs"
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-neutral-900">{entry.titulo}</h3>
                      <span className={`rounded-full px-2 py-0.5 font-semibold text-10px ${tone}`}>
                        {entry.tipo}
                      </span>
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
                    {entry.participantes.join(', ')}
                  </p>
                  {entry.documentoAdjunto && (
                    <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-info-200 bg-info-50 px-2.5 py-2 text-xs">
                      <File className="h-3.5 w-3.5 shrink-0 text-info-500" aria-hidden="true" />
                      <span className="truncate font-medium text-info-700">Documento adjunto</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (entry.documentoAdjunto) void openDocument(entry.documentoAdjunto);
                        }}
                        className="ml-auto flex shrink-0 items-center gap-1 font-semibold text-info-600 hover:underline"
                        aria-label="Ver documento adjunto"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" /> Ver
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-xs">
          <History className="mx-auto mb-3 h-12 w-12 text-neutral-300" aria-hidden="true" />
          <p className="text-sm text-neutral-500">
            No hay registros en el historial del expediente.
          </p>
        </div>
      )}
    </div>
  );
});
