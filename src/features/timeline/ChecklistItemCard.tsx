/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Download, File, Plus, Trash } from 'lucide-react';
import type { Causa, ChecklistItem, UserRole } from '../../shared/lib/types';
import { openDocument } from '../../shared/api/services/storage.service';
import RegistrationForm from './RegistrationForm';
import CausaNotificationPanel from '../causas/notificacionDocgen/CausaNotificationPanel';

interface ChecklistItemCardProps {
  causa: Causa;
  currentRole: UserRole;
  item: ChecklistItem;
  registeringItemId: string | null;
  setRegisteringItemId: React.Dispatch<React.SetStateAction<string | null>>;
  regName: string;
  setRegName: React.Dispatch<React.SetStateAction<string>>;
  regObservations: string;
  setRegObservations: React.Dispatch<React.SetStateAction<string>>;
  regFileName: string;
  regFile: File | null;
  handleStartRegister: (item: ChecklistItem) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveRegistration: (itemId: string) => void;
  handleResetRegistration: (itemId: string) => void;
  isSavingRegistration: boolean;
  registrationError: string | null;
  notRequired?: boolean;
}

export default function ChecklistItemCard({
  causa,
  currentRole,
  item,
  registeringItemId,
  setRegisteringItemId,
  regName,
  setRegName,
  regObservations,
  setRegObservations,
  regFileName,
  regFile,
  handleStartRegister,
  handleFileChange,
  handleSaveRegistration,
  handleResetRegistration,
  isSavingRegistration,
  registrationError,
  notRequired = false,
}: ChecklistItemCardProps) {
  const isSelected = registeringItemId === item.id;
  const canRegister = currentRole !== 'docente' && !notRequired;

  return (
    <div
      className={`rounded-lg border p-3 text-left transition-colors ${
        notRequired
          ? 'border-neutral-200 bg-neutral-50/50'
          : item.completado
            ? 'border-success-200 bg-success-50/30'
            : isSelected
              ? 'border-info-200 bg-info-50/30'
              : 'border-neutral-200 bg-neutral-50/30 hover:bg-neutral-50/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="mt-0.5 shrink-0">
            {item.completado ? (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success-600 font-bold text-10px text-white">
                ✓
              </span>
            ) : (
              <span className="block h-4 w-4 rounded-full border border-neutral-300 bg-white" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-neutral-900 text-xs leading-tight">{item.label}</h4>
            <p className="mt-0.5 text-10px text-neutral-500 leading-snug">{item.descripcion}</p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded px-1.5 py-0.5 font-semibold text-8px ${
            notRequired ? 'bg-neutral-200 text-neutral-600' : 'bg-brand-100 text-brand-700'
          }`}
        >
          {notRequired ? 'No requerido' : item.requeridoPor}
        </span>
      </div>

      {item.completado && (
        <div className="mt-2 space-y-1.5 rounded border border-success-200/70 bg-white p-2.5 font-sans text-11px">
          <div className="flex flex-wrap items-center justify-between gap-1 border-neutral-100 border-b pb-1 text-neutral-400">
            <span>
              Registrado por:{' '}
              <strong className="text-neutral-600">
                {item.registradoPor || 'Esteban Valenzuela'}
              </strong>
            </span>
            <span className="font-mono">Fecha: {item.fechaCompletado}</span>
          </div>
          {item.observaciones && (
            <p className="border-success-500/50 border-l-2 pl-1.5 text-11px text-neutral-600 italic leading-relaxed">
              "{item.observaciones}"
            </p>
          )}
          {item.documentoNombre && item.documentoUrl && (
            <div className="flex items-center justify-between rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-11px">
              <span className="flex items-center gap-1 truncate text-neutral-600">
                <File className="h-3 w-3 shrink-0 text-info-500" aria-hidden="true" />
                <span className="truncate">{item.documentoNombre}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (item.documentoUrl) void openDocument(item.documentoUrl);
                }}
                className="flex shrink-0 items-center gap-0.5 pl-2 font-semibold text-9px text-info-600 hover:underline"
                aria-label={`Ver documento ${item.documentoNombre}`}
              >
                <Download className="h-3 w-3" aria-hidden="true" /> Ver
              </button>
            </div>
          )}

          {canRegister && (
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleStartRegister(item)}
                className="flex items-center gap-1 font-semibold text-10px text-info-600 transition-colors hover:text-info-700"
              >
                <Plus className="h-3 w-3" aria-hidden="true" /> Editar registro
              </button>
              <button
                type="button"
                onClick={() => handleResetRegistration(item.id)}
                className="flex items-center gap-1 font-semibold text-10px text-danger-600 transition-colors hover:text-danger-700"
              >
                <Trash className="h-3 w-3" aria-hidden="true" /> Anular registro
              </button>
            </div>
          )}
        </div>
      )}

      {item.completado && isSelected && (
        <RegistrationForm
          item={item}
          mode="edit"
          regName={regName}
          setRegName={setRegName}
          regFileName={regFileName}
          regObservations={regObservations}
          setRegObservations={setRegObservations}
          regFile={regFile}
          handleFileChange={handleFileChange}
          onCancel={() => setRegisteringItemId(null)}
          onSubmit={() => {
            handleSaveRegistration(item.id);
          }}
          isSaving={isSavingRegistration}
          errorMessage={registrationError}
        />
      )}

      {!item.completado && !notRequired && item.id !== 'chk_rec_3' && (
        <div className="mt-2.5">
          {!isSelected ? (
            canRegister && (
              <button
                type="button"
                onClick={() => handleStartRegister(item)}
                className="flex cursor-pointer items-center gap-1.5 rounded border border-neutral-300 bg-white px-2.5 py-1 font-medium text-11px text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <Plus className="h-3.5 w-3.5 text-success-600" aria-hidden="true" /> Registrar hito
              </button>
            )
          ) : (
            <RegistrationForm
              item={item}
              regName={regName}
              setRegName={setRegName}
              regFileName={regFileName}
              regObservations={regObservations}
              setRegObservations={setRegObservations}
              regFile={regFile}
              handleFileChange={handleFileChange}
              onCancel={() => setRegisteringItemId(null)}
              onSubmit={() => {
                handleSaveRegistration(item.id);
              }}
              isSaving={isSavingRegistration}
              errorMessage={registrationError}
            />
          )}
        </div>
      )}

      {item.id === 'chk_rec_3' && (
        <div className="mt-2.5 rounded-lg border border-brand-200 bg-brand-50/40 p-3">
          <CausaNotificationPanel causa={causa} />
        </div>
      )}
    </div>
  );
}
