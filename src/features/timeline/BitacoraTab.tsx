/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { memo, useState } from 'react';
import type { Causa, BitacoraEntry, UserRole } from '../../types';
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
} from 'lucide-react';
import { openDocument } from '../../shared/api/services/storage.service';
import { formatChileDateTime } from '../../shared/lib/dateTime';
import HistoryEntryForm from '../../shared/ui/HistoryEntryForm';
import type { ManualBitacoraEntryInput } from '../../shared/lib/hooks/useBitacoraLog';

interface BitacoraTabProps {
  causa: Causa;
  currentRole: UserRole;
  onCreateManualEntry: (input: ManualBitacoraEntryInput) => Promise<void>;
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
}: BitacoraTabProps) {
  const [logType, setLogType] = useState<BitacoraEntry['tipo']>('Entrevista');
  const [participants, setParticipants] = useState('');
  const entries = [...causa.bitacora].sort(
    (first, second) => new Date(second.fecha).getTime() - new Date(first.fecha).getTime(),
  );

  return (
    <div className="space-y-4">
      {currentRole !== 'docente' && (
        <HistoryEntryForm
          idPrefix="causa-history"
          isSaving={false}
          error={null}
          helperText="No modifica etapas ni elimina antecedentes del expediente."
          onSave={async ({ title, description }) => {
            await onCreateManualEntry({ title, description, type: logType, participants });
            setParticipants('');
            setLogType('Entrevista');
          }}
          onResetError={() => undefined}
          onClose={() => {
            setParticipants('');
            setLogType('Entrevista');
          }}
          additionalFields={
            <details className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
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
              </div>
            </details>
          }
        />
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
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold text-[10px] ${tone}`}
                      >
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
                        onClick={() => void openDocument(entry.documentoAdjunto!)}
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
