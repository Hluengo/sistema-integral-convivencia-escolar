/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import type { Annotation } from '@/shared/lib/types';
import { updateAnnotation } from '@/shared/api/services/annotations.service';
import { formatDate, SEVERITY_BADGE } from './constants';
import Button from '@/shared/ui/Button';
import { toDateTimeLocalValue, toIsoDateTime } from './annotationEditUtils';
import { useAuthStore } from '@/shared/lib/stores/authStore';
import { formatAnnotationDisplayText } from './annotationDisplay';

interface EditAnnotationsTabProps {
  annotations: Annotation[];
  onSaved: () => void | Promise<void>;
}

interface EditForm {
  text: string;
  date: string;
  severity: Annotation['severity'];
  type: Annotation['type'];
}

const ANNOTATION_TYPES: Annotation['type'][] = ['Negativa', 'Positiva', 'Información'];
const SEVERITIES: Annotation['severity'][] = ['Leve', 'Grave', 'Muy Grave', 'Gravísima'];

function createEditForm(annotation: Annotation): EditForm {
  return {
    text: annotation.text,
    date: toDateTimeLocalValue(annotation.date),
    severity: annotation.severity,
    type: annotation.type,
  };
}

export default function EditAnnotationsTab({ annotations, onSaved }: EditAnnotationsTabProps) {
  const tenantId = useAuthStore((state) => state.tenantId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const startEditing = (annotation: Annotation) => {
    setEditingId(annotation.id);
    setForm(createEditForm(annotation));
    setError(null);
    setSuccessMessage(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setForm(null);
    setError(null);
  };

  const saveChanges = async (annotation: Annotation) => {
    if (!form) return;
    if (!form.text.trim()) {
      setError('La anotación no puede quedar vacía.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await updateAnnotation(
        {
          id: annotation.id,
          text: form.text,
          date: toIsoDateTime(form.date),
          severity: form.severity,
          type: form.type,
        },
        tenantId!,
      );
      await onSaved();
      setEditingId(null);
      setForm(null);
      setSuccessMessage('Anotación actualizada correctamente.');
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error ? saveError.message : 'No se pudo actualizar la anotación.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (annotations.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center">
        <Pencil className="mx-auto size-8 text-neutral-300" aria-hidden="true" />
        <p className="mt-3 font-semibold text-neutral-700">No hay anotaciones para editar</p>
        <p className="mt-1 text-sm text-neutral-500">
          Los registros nuevos aparecerán aquí después de confirmarlos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-lg text-neutral-900">Editar anotaciones registradas</h3>
        <p className="mt-1 text-sm text-neutral-500">
          Corrige el texto, tipo, severidad o fecha. Esta acción no elimina registros ni modifica
          archivos asociados.
        </p>
      </div>

      <div aria-live="polite">
        {successMessage && (
          <p className="rounded-lg border border-leve-200 bg-leve-50 px-4 py-3 text-leve-700 text-sm">
            {successMessage}
          </p>
        )}
        {error && (
          <p
            className="rounded-lg border border-gravisima-200 bg-gravisima-50 px-4 py-3 text-gravisima-700 text-sm"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {annotations.map((annotation) => {
          const isEditing = editingId === annotation.id && form;
          const severityStyle = SEVERITY_BADGE[annotation.severity];

          return (
            <article
              key={annotation.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs"
            >
              {isEditing ? (
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block font-semibold text-neutral-700 text-sm">
                      Anotación
                    </span>
                    <textarea
                      aria-label="Texto de la anotación"
                      value={form.text}
                      onChange={(event) =>
                        setForm((current) =>
                          current ? { ...current, text: event.target.value } : current,
                        )
                      }
                      rows={4}
                      maxLength={4000}
                      className="w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      required
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block">
                      <span className="mb-1.5 block font-semibold text-neutral-700 text-sm">
                        Tipo
                      </span>
                      <select
                        value={form.type}
                        onChange={(event) =>
                          setForm((current) =>
                            current
                              ? {
                                  ...current,
                                  type: event.target.value as Annotation['type'],
                                }
                              : current,
                          )
                        }
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      >
                        {ANNOTATION_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block font-semibold text-neutral-700 text-sm">
                        Severidad
                      </span>
                      <select
                        value={form.severity}
                        onChange={(event) =>
                          setForm((current) =>
                            current
                              ? {
                                  ...current,
                                  severity: event.target.value as Annotation['severity'],
                                }
                              : current,
                          )
                        }
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      >
                        {SEVERITIES.map((severity) => (
                          <option key={severity} value={severity}>
                            {severity}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block font-semibold text-neutral-700 text-sm">
                        Fecha y hora
                      </span>
                      <input
                        aria-label="Fecha y hora de la anotación"
                        type="datetime-local"
                        value={form.date}
                        onChange={(event) =>
                          setForm((current) =>
                            current ? { ...current, date: event.target.value } : current,
                          )
                        }
                        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        required
                      />
                    </label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={cancelEditing}
                      disabled={isSaving}
                      className="rounded-lg px-3 py-2"
                    >
                      <X className="size-4" aria-hidden="true" />
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => void saveChanges(annotation)}
                      disabled={isSaving}
                      className="rounded-lg px-3 py-2 disabled:cursor-wait disabled:opacity-60"
                    >
                      <Check className="size-4" aria-hidden="true" />
                      {isSaving ? 'Guardando…' : 'Guardar cambios'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-neutral-100 px-2.5 py-1 font-semibold text-neutral-700 text-xs">
                        {annotation.type}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 font-semibold text-xs ${severityStyle?.bg ?? 'bg-neutral-100'} ${severityStyle?.text ?? 'text-neutral-700'}`}
                      >
                        {annotation.severity}
                      </span>
                      <span className="text-neutral-500 text-xs">
                        {formatDate(annotation.date)}
                      </span>
                    </div>
                    <div className="rounded-lg border border-neutral-100 bg-neutral-50 px-3.5 py-3">
                      <p className="mb-1 font-semibold text-neutral-500 text-[11px] uppercase tracking-wide">
                        Descripción de la anotación
                      </p>
                      <p className="whitespace-pre-wrap text-neutral-800 text-sm leading-relaxed">
                        {formatAnnotationDisplayText(annotation.text)}
                      </p>
                    </div>
                    {annotation.registered_by && (
                      <p className="text-neutral-400 text-xs">
                        Registrada por {annotation.registered_by}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => startEditing(annotation)}
                    disabled={isSaving}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50"
                    aria-label={`Editar anotación del ${formatDate(annotation.date)}`}
                    title="Editar esta anotación"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
