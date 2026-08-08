/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import type { ChecklistItem } from '../../shared/lib/types';
import { Upload, Check } from 'lucide-react';
import ImproveTextarea from '../../shared/ImproveTextarea';
import Button from '../../shared/ui/Button';

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
              {regFileName || 'Seleccionar archivo...'}
              <input
                id={`reg-file-${item.id}`}
                type="file"
                onChange={handleFileChange}
                className="sr-only"
                accept=".pdf,.doc,.docx,.jpg,.png"
                aria-labelledby={`reg-file-label-${item.id}`}
              />
            </label>
          </div>
        </div>
      </div>

      <div>
        <ImproveTextarea
          id={`reg-obs-${item.id}`}
          label="Observaciones:"
          placeholder="Detalle de la actuación procesal..."
          value={regObservations}
          onChange={(v) => setRegObservations(v)}
          improvementContext="hito_observacion"
          rows={2}
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-1.5 font-medium text-neutral-800 text-xs placeholder-neutral-400 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
      </div>

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
