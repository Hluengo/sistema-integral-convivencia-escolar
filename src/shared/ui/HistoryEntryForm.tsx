/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { Loader2, NotebookPen, Plus, X } from 'lucide-react';

export interface HistoryEntryFormInput {
  title: string;
  description: string;
}

interface HistoryEntryFormProps {
  idPrefix: string;
  isSaving: boolean;
  error: string | null;
  helperText: string;
  onSave: (input: HistoryEntryFormInput) => Promise<unknown>;
  onResetError: () => void;
  onClose?: () => void;
  additionalFields?: ReactNode;
}

export default function HistoryEntryForm({
  idPrefix,
  isSaving,
  error,
  helperText,
  onSave,
  onResetError,
  onClose,
  additionalFields,
}: HistoryEntryFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const closeForm = () => {
    if (isSaving) return;
    setIsOpen(false);
    setTitle('');
    setDescription('');
    onResetError();
    onClose?.();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await onSave({ title, description });
      closeForm();
    } catch {
      // El error tipado de la mutación se muestra debajo del formulario.
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          onResetError();
          setIsOpen(true);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand-300 bg-brand-50/60 px-4 py-3 font-semibold text-brand-700 text-sm transition-colors hover:border-brand-400 hover:bg-brand-50"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Registrar entrada manual
      </button>
    );
  }

  const canSave = title.trim().length >= 3 && description.trim().length >= 3 && !isSaving;
  const titleId = `${idPrefix}-title`;
  const descriptionId = `${idPrefix}-description`;

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-4 rounded-xl border border-brand-200 bg-brand-50/50 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-5 w-5 text-brand-600" aria-hidden="true" />
          <div>
            <h3 className="font-bold text-neutral-900 text-sm">Nueva entrada en el historial</h3>
            <p className="mt-0.5 text-neutral-500 text-xs">{helperText}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={closeForm}
          disabled={isSaving}
          aria-label="Cerrar formulario"
          className="rounded-lg p-1.5 text-neutral-400 hover:bg-white hover:text-neutral-700 disabled:opacity-40"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <label htmlFor={titleId} className="font-semibold text-neutral-700 text-sm">
            Título
          </label>
          <span className="text-neutral-400 text-xs">{title.length}/120</span>
        </div>
        <input
          id={titleId}
          aria-label="Título de la entrada"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          required
          disabled={isSaving}
          placeholder="Ej.: Entrevista con apoderado"
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-neutral-900 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <label htmlFor={descriptionId} className="font-semibold text-neutral-700 text-sm">
            Descripción
          </label>
          <span className="text-neutral-400 text-xs">{description.length}/2.000</span>
        </div>
        <textarea
          id={descriptionId}
          aria-label="Descripción de la entrada"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={2000}
          rows={4}
          required
          disabled={isSaving}
          placeholder="Describe el hecho, acuerdo, entrevista o seguimiento realizado."
          className="w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-neutral-900 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
        />
      </div>

      {additionalFields}

      {error && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700 text-sm">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={closeForm}
          disabled={isSaving}
          className="rounded-xl px-4 py-2 font-medium text-neutral-600 text-sm hover:bg-white disabled:opacity-40"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!canSave}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 font-semibold text-sm text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Guardar en historial
        </button>
      </div>
    </form>
  );
}
