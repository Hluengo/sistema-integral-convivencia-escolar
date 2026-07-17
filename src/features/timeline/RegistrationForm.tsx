/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import type { ChecklistItem } from '../../types';
import { Upload, Check } from 'lucide-react';
import ImproveTextarea from '../../components/ImproveTextarea';

interface RegistrationFormProps {
  item: ChecklistItem;
  regName: string;
  setRegName: React.Dispatch<React.SetStateAction<string>>;
  regFileName: string;
  regObservations: string;
  setRegObservations: React.Dispatch<React.SetStateAction<string>>;
  regFile: File | null;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isUploadingDocument: boolean;
}

export default function RegistrationForm({
  item,
  regName,
  setRegName,
  regFileName,
  regObservations,
  setRegObservations,
  regFile,
  handleFileChange,
  onCancel,
  onSubmit,
  isUploadingDocument,
}: RegistrationFormProps) {
  return (
    <div className="mt-2 space-y-3 rounded border border-info-200 bg-white p-3 text-left">
      <div className="flex items-center justify-between border-neutral-100 border-b pb-1.5">
        <span className="font-semibold text-[10px] text-info-700 uppercase tracking-wide">
          Registro oficial
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label htmlFor={`reg-name-${item.id}`} className="block font-semibold text-[9px] text-neutral-400 uppercase">
            Responsable:
          </label>
<input
  id={`reg-name-${item.id}`}
  type="text"
  spellCheck={false}
  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-1.5 font-medium text-neutral-800 text-xs placeholder-neutral-400 transition-all focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
  value={regName}
  onChange={(e) => setRegName(e.target.value)}
  aria-label="Nombre del responsable"
/>
        </div>

        <div>
          <span id={`reg-file-label-${item.id}`} className="block font-semibold text-[9px] text-neutral-400 uppercase">
            Documento de respaldo:
          </span>
          <div className="relative mt-1 flex items-center justify-center rounded-lg border-2 border-neutral-300 border-dashed bg-neutral-50/50 px-2 py-1.5 transition-all hover:bg-neutral-50">
            <label htmlFor={`reg-file-${item.id}`} className="flex cursor-pointer items-center gap-1.5 font-medium text-[11px] text-neutral-500">
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
          rows={2}
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-1.5 font-medium text-neutral-800 text-xs placeholder-neutral-400 transition-all focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 font-medium text-[11px] text-neutral-500 transition-all hover:bg-neutral-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isUploadingDocument}
          className="flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-1.5 font-medium text-[11px] text-white transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploadingDocument ? (
            <>Subiendo...</>
          ) : (
            <>
              {regFile ? <Upload className="h-3.5 w-3.5" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              {regFile ? 'Adjuntar y registrar' : 'Confirmar registro'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
