/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, type FormEvent } from 'react';
import { CalendarPlus, Check, FileText, Plus, Upload, X } from 'lucide-react';
import type { BitacoraEntry, ChecklistItem } from '../../shared/lib/types';
import { useChecklistProgress } from '../../shared/lib/hooks/useChecklistProgress';
import Button from '../../shared/ui/Button';
import {
  DOCUMENT_UPLOAD_ACCEPT,
  DOCUMENT_UPLOAD_HELPER_TEXT,
  openDocument,
} from '../../shared/api/services/storage.service';

interface ChecklistProgressPanelProps {
  causaId: string;
  incidenteId?: string;
  item: ChecklistItem;
  canRegister: boolean;
}

const ENTRY_TYPES: BitacoraEntry['tipo'][] = [
  'Entrevista',
  'Evidencia',
  'Notificación',
  'Mediación',
  'Resolución',
  'Otro',
];

function initialDateTime(): string {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export default function ChecklistProgressPanel({
  causaId,
  incidenteId,
  item,
  canRegister,
}: ChecklistProgressPanelProps) {
  const { entries, isLoading, error, createEntry, isCreating } = useChecklistProgress(causaId);
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [entryType, setEntryType] = useState<BitacoraEntry['tipo']>('Evidencia');
  const [occurredAt, setOccurredAt] = useState(initialDateTime);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [documentScope, setDocumentScope] = useState<'causa' | 'incidente'>('causa');
  const itemEntries = entries.filter(
    (entry) => entry.checklistItemId === item.id && !entry.invalidatedAt,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !description.trim()) {
      setFormError('Ingrese un título y una descripción para el avance.');
      return;
    }
    setFormError(null);
    try {
      await createEntry({
        causaId,
        checklistItemId: item.id,
        title,
        description,
        entryType,
        occurredAt: new Date(occurredAt).toISOString(),
        documentFile,
        documentScope,
        incidenteId,
      });
      setTitle('');
      setDescription('');
      setDocumentFile(null);
      setOccurredAt(initialDateTime());
      setIsOpen(false);
    } catch (submitError) {
      setFormError(
        submitError instanceof Error ? submitError.message : 'No fue posible guardar el avance.',
      );
    }
  }

  return (
    <section
      className="mt-4 rounded-lg border border-info-200 bg-white p-3"
      aria-label={`Avances de ${item.label}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-info-800 text-xs">Avances de este hito</p>
          <p className="mt-0.5 text-10px text-neutral-500">
            {itemEntries.length === 0
              ? 'Aún no hay avances registrados.'
              : `${itemEntries.length} avance${itemEntries.length === 1 ? '' : 's'} registrado${itemEntries.length === 1 ? '' : 's'}.`}
          </p>
        </div>
        {canRegister && (
          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            className="inline-flex w-fit items-center gap-1.5 rounded border border-info-200 bg-white px-2.5 py-1.5 font-semibold text-info-700 text-11px transition-colors hover:bg-info-50"
          >
            {isOpen ? (
              <X className="size-3.5" aria-hidden="true" />
            ) : (
              <Plus className="size-3.5" aria-hidden="true" />
            )}
            {isOpen ? 'Cerrar' : 'Agregar avance'}
          </button>
        )}
      </div>

      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-3 grid gap-3 rounded border border-info-200 bg-white p-3 sm:grid-cols-2"
        >
          <label htmlFor={`progress-title-${item.id}`} className="space-y-1.5">
            <span className="block font-semibold text-9px text-neutral-700 uppercase">
              Título del avance:
            </span>
            <input
              aria-label="Título del avance"
              id={`progress-title-${item.id}`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-1.5 font-medium text-neutral-800 text-xs placeholder-neutral-400 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              placeholder="Ej. Entrevista con apoderado"
            />
          </label>
          <label htmlFor={`progress-type-${item.id}`} className="space-y-1.5">
            <span className="block font-semibold text-9px text-neutral-700 uppercase">Tipo:</span>
            <select
              aria-label="Tipo de avance"
              id={`progress-type-${item.id}`}
              value={entryType}
              onChange={(event) => setEntryType(event.target.value as BitacoraEntry['tipo'])}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-1.5 font-medium text-neutral-800 text-xs transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              {ENTRY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor={`progress-description-${item.id}`} className="block font-semibold text-neutral-700 text-xs">
              Descripción / observaciones:
            </label>
            <textarea
              id={`progress-description-${item.id}`}
              aria-label="Descripción / observaciones"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-1.5 font-medium text-neutral-800 text-xs placeholder-neutral-400 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              placeholder="Describa lo realizado y sus antecedentes."
            />
          </div>
          <label htmlFor={`progress-date-${item.id}`} className="space-y-1.5">
            <span className="flex items-center gap-1 font-semibold text-9px text-neutral-700 uppercase">
              <CalendarPlus className="size-3.5" aria-hidden="true" /> Fecha y hora
            </span>
            <input
              aria-label="Fecha y hora del avance"
              id={`progress-date-${item.id}`}
              type="datetime-local"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-1.5 font-medium text-neutral-800 text-xs transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </label>
          <label htmlFor={`progress-document-${item.id}`} className="space-y-1.5">
            <span className="flex items-center gap-1 font-semibold text-9px text-neutral-700 uppercase">
              <FileText className="size-3.5" aria-hidden="true" /> Documento
            </span>
            <span id={`progress-document-label-${item.id}`} className="sr-only">
              Documento de respaldo
            </span>
            <span className="relative mt-1 flex items-center justify-center rounded-lg border-2 border-neutral-300 border-dashed bg-neutral-50/50 px-2 py-1.5 transition-colors hover:bg-neutral-50">
              <span className="flex cursor-pointer items-center gap-1.5 font-medium text-11px text-neutral-500">
                <Upload className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
                {documentFile?.name || DOCUMENT_UPLOAD_HELPER_TEXT}
                <input
                  id={`progress-document-${item.id}`}
                  type="file"
                  accept={DOCUMENT_UPLOAD_ACCEPT}
                  onChange={(event) => setDocumentFile(event.target.files?.[0] || null)}
                  className="sr-only"
                  aria-labelledby={`progress-document-label-${item.id}`}
                />
              </span>
            </span>
          </label>
          {incidenteId && (
            <label htmlFor={`progress-share-${item.id}`} className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50/50 p-2.5 text-10px text-sky-950 sm:col-span-2">
              <input
                id={`progress-share-${item.id}`}
                aria-label="Compartir documento con el incidente grupal"
                type="checkbox"
                checked={documentScope === 'incidente'}
                onChange={(event) =>
                  setDocumentScope(event.target.checked ? 'incidente' : 'causa')
                }
                className="mt-0.5 h-3.5 w-3.5 rounded border-sky-300 text-brand-600 focus:ring-brand-500"
              />
              <span>
                Compartir este documento con el incidente grupal y sus expedientes vinculados.
              </span>
            </label>
          )}
          {(formError || error) && (
            <p
              role="alert"
              className="sm:col-span-2 rounded-lg border border-danger-200 bg-danger-50 px-2.5 py-2 text-danger-700 text-10px"
            >
              {formError ||
                (error instanceof Error ? error.message : 'No fue posible cargar los avances.')}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1 sm:col-span-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button size="sm" type="submit" disabled={isCreating}>
              {isCreating ? (
                'Guardando...'
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" /> Guardar avance
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="mt-3 text-10px text-neutral-500">Cargando avances…</p>
      ) : (
        itemEntries.length > 0 && (
          <ol className="mt-4 space-y-3 border-info-200 border-l pl-4">
            {itemEntries.map((entry) => (
              <li
                key={entry.id}
                className="relative rounded border border-neutral-200 bg-neutral-50/40 p-3"
              >
                <span
                  className="absolute -left-[1.3rem] top-4 size-2 rounded-full bg-info-500"
                  aria-hidden="true"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-neutral-900 text-11px">{entry.title}</p>
                  <time className="font-mono text-10px text-neutral-500">
                    {new Date(entry.occurredAt).toLocaleString('es-CL')}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-neutral-600 text-11px leading-relaxed">
                  {entry.description}
                </p>
                {entry.documentName && entry.documentUrl && (
                  <button
                    type="button"
                    onClick={() => void openDocument(entry.documentUrl || '')}
                    className="mt-2 inline-flex items-center gap-1 font-semibold text-info-700 text-10px hover:underline"
                  >
                    <FileText className="size-3" aria-hidden="true" /> {entry.documentName}
                  </button>
                )}
              </li>
            ))}
          </ol>
        )
      )}
    </section>
  );
}
