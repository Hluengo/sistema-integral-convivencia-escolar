/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import type { ChecklistItem } from '../../shared/lib/types';
import { Upload, Check } from 'lucide-react';
import Button from '../../shared/ui/Button';
import {
  DOCUMENT_UPLOAD_ACCEPT,
  DOCUMENT_UPLOAD_PLACEHOLDER,
} from '../../shared/api/services/storage.service';
import { useTimelineContext } from '../../shared/lib/useTimelineContext';

interface RegistrationFormProps {
  item: ChecklistItem;
  mode?: 'register' | 'edit';
  regName: string;
  setRegName: React.Dispatch<React.SetStateAction<string>>;
  regFileName: string;
  regObservations: string;
  setRegObservations: React.Dispatch<React.SetStateAction<string>>;
  regFile: File | null;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isSaving: boolean;
  errorMessage: string | null;
}

export default function RegistrationForm({
  item,
  mode = 'register',
  regName,
  setRegName,
  regFileName,
  regObservations,
  setRegObservations,
  regFile,
  handleFileChange,
  onCancel,
  onSubmit,
  isSaving,
  errorMessage,
}: RegistrationFormProps) {
  const isEditing = mode === 'edit';
  const { causa, documentScope, setDocumentScope } = useTimelineContext();

  return (
    <div className="mt-2 space-y-3 rounded border border-info-200 bg-white p-3 text-left">
      <div className="flex items-center justify-between border-neutral-100 border-b pb-1.5">
        <span className="font-semibold text-10px text-info-700 uppercase tracking-wide">
          {isEditing ? 'Rectificación oficial' : 'Registro oficial'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label
            htmlFor={`reg-name-${item.id}`}
            className="block font-semibold text-9px text-neutral-400 uppercase"
          >
            Responsable:
          </label>
          <input
            id={`reg-name-${item.id}`}
            type="text"
            spellCheck={false}
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-1.5 font-medium text-neutral-800 text-xs placeholder-neutral-400 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            value={regName}
            onChange={(e) => setRegName(e.target.value)}
            aria-label="Nombre del responsable"
          />
        </div>

        <div>
          <span
            id={`reg-file-label-${item.id}`}
            className="block font-semibold text-9px text-neutral-400 uppercase"
          >
            Documento de respaldo:
          </span>
          <div className="relative mt-1 flex items-center justify-center rounded-lg border-2 border-neutral-300 border-dashed bg-neutral-50/50 px-2 py-1.5 transition-colors hover:bg-neutral-50">
            <label
              htmlFor={`reg-file-${item.id}`}
              className="flex cursor-pointer items-center gap-1.5 font-medium text-11px text-neutral-500"
            >
              <Upload className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
              {regFileName || DOCUMENT_UPLOAD_PLACEHOLDER}
              <input
                id={`reg-file-${item.id}`}
                type="file"
                onChange={handleFileChange}
                className="sr-only"
                accept={DOCUMENT_UPLOAD_ACCEPT}
                aria-labelledby={`reg-file-label-${item.id}`}
              />
            </label>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor={`reg-obs-${item.id}`} className="block font-semibold text-neutral-700 text-xs">
          Observaciones:
        </label>
        <textarea
          id={`reg-obs-${item.id}`}
          aria-label="Observaciones"
          placeholder="Detalle de la actuación procesal..."
          value={regObservations}
          onChange={(event) => setRegObservations(event.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-1.5 font-medium text-neutral-800 text-xs placeholder-neutral-400 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
      </div>

      {causa.incidenteId && (
        <fieldset className="rounded-lg border border-sky-200 bg-sky-50/50 p-2.5">
          <legend className="font-semibold text-9px text-sky-800 uppercase">
            Visibilidad del hito
          </legend>
          <label htmlFor={`reg-share-${item.id}`} className="mt-1 flex items-start gap-2 text-10px text-sky-950">
            <input
              id={`reg-share-${item.id}`}
              aria-label="Compartir hito con el incidente grupal"
              type="checkbox"
              checked={documentScope === 'incidente'}
              onChange={(event) => setDocumentScope(event.target.checked ? 'incidente' : 'causa')}
              className="mt-0.5 h-3.5 w-3.5 rounded border-sky-300 text-brand-600 focus:ring-brand-500"
            />
            <span>
              Compartir este hito y su documento con el incidente grupal y sus expedientes vinculados.
            </span>
          </label>
        </fieldset>
      )}

      {errorMessage && (
        <p
          role="alert"
          className="rounded-lg border border-danger-200 bg-danger-50 p-2 text-10px text-danger-700"
        >
          {errorMessage}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
          Cancelar
        </Button>
        <Button size="sm" onClick={onSubmit} disabled={isSaving}>
          {isSaving ? (
            <>Subiendo...</>
          ) : (
            <>
              {regFile ? (
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {isEditing
                ? regFile
                  ? 'Adjuntar y rectificar'
                  : 'Guardar rectificación'
                : regFile
                  ? 'Adjuntar y registrar'
                  : 'Confirmar registro'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
