/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, type FormEvent } from 'react';
import { CalendarPlus, FileText, Plus, X } from 'lucide-react';
import type { BitacoraEntry, ChecklistItem } from '../../shared/lib/types';
import { useChecklistProgress } from '../../shared/lib/hooks/useChecklistProgress';
import {
  DOCUMENT_UPLOAD_ACCEPT,
  DOCUMENT_UPLOAD_HELPER_TEXT,
  openDocument,
} from '../../shared/api/services/storage.service';

interface ChecklistProgressPanelProps {
  causaId: string;
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
      className="mt-3 rounded-lg border border-sky-100 bg-sky-50/40 p-3"
      aria-label={`Avances de ${item.label}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-sky-900 text-xs">Avances de este hito</p>
          <p className="mt-0.5 text-10px text-sky-800/80">
            {itemEntries.length === 0
              ? 'Aún no hay avances registrados.'
              : `${itemEntries.length} avance${itemEntries.length === 1 ? '' : 's'} registrado${itemEntries.length === 1 ? '' : 's'}.`}
          </p>
        </div>
        {canRegister && (
          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            className="inline-flex w-fit items-center gap-1.5 rounded-md border border-sky-200 bg-white px-2.5 py-1.5 font-semibold text-sky-800 text-11px hover:bg-sky-100"
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
          className="mt-3 grid gap-3 rounded-md border border-sky-100 bg-white p-3 sm:grid-cols-2"
        >
          <label htmlFor={`progress-title-${item.id}`} className="space-y-1.5">
            <span className="block font-semibold text-neutral-700 text-11px">Título</span>
            <input
              aria-label="Título del avance"
              id={`progress-title-${item.id}`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-md border border-neutral-200 px-2.5 py-2 text-sm"
              placeholder="Ej. Entrevista con apoderado"
            />
          </label>
          <label htmlFor={`progress-type-${item.id}`} className="space-y-1.5">
            <span className="block font-semibold text-neutral-700 text-11px">Tipo</span>
            <select
              aria-label="Tipo de avance"
              id={`progress-type-${item.id}`}
              value={entryType}
              onChange={(event) => setEntryType(event.target.value as BitacoraEntry['tipo'])}
              className="w-full rounded-md border border-neutral-200 px-2.5 py-2 text-sm"
            >
              {ENTRY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor={`progress-description-${item.id}`} className="space-y-1.5 sm:col-span-2">
            <span className="block font-semibold text-neutral-700 text-11px">Descripción</span>
            <textarea
              aria-label="Descripción del avance"
              id={`progress-description-${item.id}`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full resize-y rounded-md border border-neutral-200 px-2.5 py-2 text-sm"
              placeholder="Describa lo realizado y sus antecedentes."
            />
          </label>
          <label htmlFor={`progress-date-${item.id}`} className="space-y-1.5">
            <span className="flex items-center gap-1 font-semibold text-neutral-700 text-11px">
              <CalendarPlus className="size-3.5" aria-hidden="true" /> Fecha y hora
            </span>
            <input
              aria-label="Fecha y hora del avance"
              id={`progress-date-${item.id}`}
              type="datetime-local"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
              className="w-full rounded-md border border-neutral-200 px-2.5 py-2 text-sm"
            />
          </label>
          <label htmlFor={`progress-document-${item.id}`} className="space-y-1.5">
            <span className="flex items-center gap-1 font-semibold text-neutral-700 text-11px">
              <FileText className="size-3.5" aria-hidden="true" /> Documento
            </span>
            <input
              aria-label="Documento del avance"
              id={`progress-document-${item.id}`}
              type="file"
              accept={DOCUMENT_UPLOAD_ACCEPT}
              onChange={(event) => setDocumentFile(event.target.files?.[0] || null)}
              className="w-full text-11px"
            />
            <span className="block text-9px text-neutral-500">{DOCUMENT_UPLOAD_HELPER_TEXT}</span>
          </label>
          {(formError || error) && (
            <p className="sm:col-span-2 rounded-md bg-danger-50 px-2.5 py-2 text-danger-700 text-11px">
              {formError ||
                (error instanceof Error ? error.message : 'No fue posible cargar los avances.')}
            </p>
          )}
          <div className="flex justify-end sm:col-span-2">
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-md bg-brand-600 px-3 py-2 font-semibold text-white text-11px disabled:opacity-50"
            >
              {isCreating ? 'Guardando…' : 'Guardar avance'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="mt-3 text-10px text-neutral-500">Cargando avances…</p>
      ) : (
        itemEntries.length > 0 && (
          <ol className="mt-3 space-y-2 border-sky-200 border-l pl-3">
            {itemEntries.map((entry) => (
              <li
                key={entry.id}
                className="relative rounded-md border border-neutral-200 bg-white p-2.5"
              >
                <span
                  className="absolute -left-[1.15rem] top-3 size-2 rounded-full bg-sky-500"
                  aria-hidden="true"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-neutral-900 text-11px">{entry.title}</p>
                  <time className="font-mono text-9px text-neutral-500">
                    {new Date(entry.occurredAt).toLocaleString('es-CL')}
                  </time>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-neutral-600 text-11px">
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
