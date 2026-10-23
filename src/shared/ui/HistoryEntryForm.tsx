/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { z } from "zod";
import { NotebookPen, Plus, X } from "lucide-react";
import { nowDateOnly } from "../lib/dateUtils";
import type { BitacoraEntry, DocumentScope } from "../lib/types";
import {
  clearSessionDraft,
  readSessionDraft,
  writeSessionDraft,
  registerSessionDraftSave,
  SESSION_DRAFT_CLEARED_EVENT,
} from "../lib/sessionDraft";
import Button from "./Button";

interface HistoryEntryFormInput {
  title: string;
  description: string;
  actionDate: string;
  documentText: string;
  entryId: string;
  type: BitacoraEntry["tipo"];
  participants: string;
  documentScope: DocumentScope;
}

const historyDraftSchema = z
  .object({
    title: z.string().max(120),
    description: z.string().max(2000),
    actionDate: z.string(),
    documentText: z.string(),
    entryId: z.string().uuid(),
    type: z.enum([
      "Entrevista",
      "Evidencia",
      "Notificación",
      "Mediación",
      "Resolución",
      "Citación",
      "Correo",
      "Descargo",
      "Otro",
    ]),
    participants: z.string(),
    documentScope: z.enum(["causa", "incidente"]),
  })
  .partial();

function emptyDraft(): HistoryEntryFormInput {
  return {
    title: "",
    description: "",
    actionDate: nowDateOnly(),
    documentText: "",
    entryId: crypto.randomUUID(),
    type: "Entrevista",
    participants: "",
    documentScope: "causa",
  };
}

interface HistoryEntryFormProps {
  idPrefix: string;
  draftKey: string | null;
  isSaving: boolean;
  error: string | null;
  helperText: string;
  onSave: (input: HistoryEntryFormInput) => Promise<string | void>;
  onResetError: () => void;
  onClose?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  additionalFields?: (
    values: HistoryEntryFormInput,
    update: (patch: Partial<HistoryEntryFormInput>) => void,
  ) => ReactNode;
}

export default function HistoryEntryForm(props: HistoryEntryFormProps) {
  return (
    <HistoryEntryFormContent key={props.draftKey ?? "unverified"} {...props} />
  );
}

function HistoryEntryFormContent({
  idPrefix,
  draftKey,
  isSaving,
  error,
  helperText,
  onSave,
  onResetError,
  onClose,
  open,
  onOpenChange,
  additionalFields,
}: HistoryEntryFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setIsOpen = (value: boolean) => {
    if (open === undefined) setInternalOpen(value);
    onOpenChange?.(value);
  };
  const [values, setValues] = useState(() =>
    readSessionDraft(draftKey, emptyDraft(), historyDraftSchema),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const busy = isSaving || isSubmitting;
  const { title, description, actionDate, documentText } = values;
  const updateValues = (patch: Partial<HistoryEntryFormInput>) => {
    const next = { ...values, ...patch };
    setValues(next);
    writeSessionDraft(draftKey, next);
  };
  useEffect(() => {
    const onClear = (event: Event) => {
      const cleared = (
        event as CustomEvent<{ key: string; expectedRaw?: string }>
      ).detail;
      if (cleared.key !== draftKey) return;
      setValues((current) =>
        cleared.expectedRaw === undefined ||
        JSON.stringify(current) === cleared.expectedRaw
          ? emptyDraft()
          : current,
      );
    };
    window.addEventListener(SESSION_DRAFT_CLEARED_EVENT, onClear);
    return () =>
      window.removeEventListener(SESSION_DRAFT_CLEARED_EVENT, onClear);
  }, [draftKey]);

  const closeForm = () => {
    if (busy) return;
    setIsOpen(false);
    onResetError();
    onClose?.();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const submitted = JSON.stringify(values);
    writeSessionDraft(draftKey, values);
    setIsSubmitting(true);
    try {
      const pendingResult = await onSave(values);
      if (typeof pendingResult === "string")
        registerSessionDraftSave(draftKey, pendingResult, submitted);
      else clearSessionDraft(draftKey, submitted);
      setIsOpen(false);
      onResetError();
      onClose?.();
    } catch {
      // El error tipado de la mutación se muestra debajo del formulario.
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="custom"
        fullWidth
        onClick={() => {
          onResetError();
          setIsOpen(true);
        }}
        className="rounded-xl border border-dashed border-brand-300 bg-brand-50/60 text-brand-700 hover:border-brand-400 hover:bg-brand-50"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Registrar entrada manual
      </Button>
    );
  }

  const canSave =
    title.trim().length >= 3 && description.trim().length >= 3 && !busy;
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
            <h3 className="font-bold text-neutral-900 text-sm">
              Nueva entrada en el historial
            </h3>
            <p className="mt-0.5 text-neutral-500 text-xs">{helperText}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={closeForm}
          disabled={busy}
          aria-label="Cerrar formulario"
          className="rounded-lg p-1.5 text-neutral-400 hover:bg-white hover:text-neutral-700 disabled:opacity-40"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_12rem] md:items-end">
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label
              htmlFor={titleId}
              className="font-semibold text-neutral-700 text-sm"
            >
              Título
            </label>
            <span className="text-neutral-400 text-xs">{title.length}/120</span>
          </div>
          <input
            id={titleId}
            aria-label="Título de la entrada"
            value={title}
            onChange={(event) => updateValues({ title: event.target.value })}
            maxLength={120}
            required
            disabled={busy}
            placeholder="Ej.: Entrevista con apoderado"
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-neutral-900 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-action-date`}
            className="block font-semibold text-neutral-700 text-sm"
          >
            Fecha de la acción
          </label>
          <input
            id={`${idPrefix}-action-date`}
            aria-label="Fecha de la acción"
            type="date"
            value={actionDate}
            onChange={(event) =>
              updateValues({ actionDate: event.target.value })
            }
            disabled={busy}
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-neutral-900 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
          />
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex justify-end">
          <span className="text-neutral-400 text-xs">
            {description.length}/2.000
          </span>
        </div>
        <label
          htmlFor={descriptionId}
          className="block font-semibold text-neutral-700 text-sm"
        >
          Descripción
        </label>
        <textarea
          id={descriptionId}
          aria-label="Descripción"
          value={description}
          onChange={(event) =>
            updateValues({ description: event.target.value })
          }
          rows={3}
          required
          disabled={busy}
          maxLength={2000}
          placeholder="Describe el hecho, acuerdo, entrevista o seguimiento realizado."
          className="w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-neutral-900 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
        />
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2">
        <fieldset disabled={busy} className="space-y-3">
          {additionalFields?.(values, updateValues)}
        </fieldset>

        <label className="space-y-1.5">
          <span className="block font-semibold text-neutral-700 text-sm">
            O pegar texto de evidencia (opcional)
          </span>
          <textarea
            aria-label="Texto de evidencia adicional"
            value={documentText}
            onChange={(event) =>
              updateValues({ documentText: event.target.value })
            }
            rows={4}
            disabled={busy}
            placeholder="Pega aquí el contenido de la evidencia..."
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-neutral-900 text-sm outline-none transition placeholder:text-neutral-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
          />
        </label>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-gravisima-50 px-3 py-2 text-gravisima-700 text-sm"
        >
          {error}
        </p>
      )}

      <p className="text-neutral-500 text-xs">
        El texto se respalda solo en esta pestaña. Al cerrar o recargar, los
        archivos deben seleccionarse nuevamente.
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => {
            if (!draftKey || clearSessionDraft(draftKey)) {
              setValues(emptyDraft());
              closeForm();
            }
          }}
        >
          Descartar borrador
        </Button>
        <Button variant="ghost" onClick={closeForm} disabled={busy}>
          Cerrar y conservar
        </Button>
        <Button type="submit" disabled={!canSave} isLoading={busy}>
          Guardar en historial
        </Button>
      </div>
    </form>
  );
}
