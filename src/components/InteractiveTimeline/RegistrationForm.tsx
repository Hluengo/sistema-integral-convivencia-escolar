/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChecklistItem } from '../../types';
import { Upload, Check } from 'lucide-react';
import ImproveTextarea from '../ImproveTextarea';

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
    <div className="bg-white rounded border border-info-200 p-3 space-y-3 mt-2 text-left">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
        <span className="text-[10px] font-semibold text-info-700 uppercase tracking-wide">
          Registro oficial
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`reg-name-${item.id}`} className="block text-[9px] font-semibold text-neutral-400 uppercase">
            Responsable:
          </label>
<input
  id={`reg-name-${item.id}`}
  type="text"
  spellCheck={false}
  className="w-full mt-1 border border-neutral-300 rounded-lg p-1.5 text-xs bg-white font-medium text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
  value={regName}
  onChange={(e) => setRegName(e.target.value)}
  aria-label="Nombre del responsable"
/>
        </div>

        <div>
          <span id={`reg-file-label-${item.id}`} className="block text-[9px] font-semibold text-neutral-400 uppercase">
            Documento de respaldo:
          </span>
          <div className="relative mt-1 flex items-center justify-center border-2 border-dashed border-neutral-300 rounded-lg py-1.5 px-2 bg-neutral-50/50 hover:bg-neutral-50 transition-all">
            <label htmlFor={`reg-file-${item.id}`} className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-medium cursor-pointer">
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
          className="w-full mt-1 border border-neutral-300 rounded-lg p-1.5 text-xs bg-white font-medium text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="text-[11px] text-neutral-500 font-medium px-3 py-1.5 rounded-lg hover:bg-neutral-50 transition-all"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isUploadingDocument}
          className="text-[11px] bg-brand-600 text-white font-medium px-4 py-1.5 rounded-lg hover:bg-brand-700 transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
