/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState } from 'react';
import { Plus, X, CheckSquare, Square, FileText } from 'lucide-react';
import type { Annotation } from '../../../types';

interface DocumentFormProps {
  docType: string;
  apoderadoName: string;
  onApoderadoNameChange: (value: string) => void;
  inspectorName: string;
  onInspectorNameChange: (value: string) => void;
  coordinatorName: string;
  onCoordinatorNameChange: (value: string) => void;
  emittedBy: string;
  onEmittedByChange: (value: string) => void;
  selectedAnnotationsForDoc: string[];
  onToggleAnnotation: (id: string) => void;
  compromisoStatus: string;
  onCompromisoStatusChange: (value: string) => void;
  customCommitments: string[];
  onAddCommitment: (commitment: string) => void;
  onRemoveCommitment: (index: number) => void;
  negativeCount: number;
  annotations: Annotation[];
  onRegisterCommitment: () => void;
  isRegistering: boolean;
}

const COMPROMISO_STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'aceptado', label: 'Aceptado' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'cumplido', label: 'Cumplido' },
];

export default function DocumentForm({
  docType,
  apoderadoName,
  onApoderadoNameChange,
  inspectorName,
  onInspectorNameChange,
  coordinatorName,
  onCoordinatorNameChange,
  emittedBy,
  onEmittedByChange,
  selectedAnnotationsForDoc,
  onToggleAnnotation,
  compromisoStatus,
  onCompromisoStatusChange,
  customCommitments,
  onAddCommitment,
  onRemoveCommitment,
  negativeCount,
  annotations,
  onRegisterCommitment,
  isRegistering,
}: DocumentFormProps) {
  const [newCommitment, setNewCommitment] = useState('');

  const negativeAnnotations = annotations.filter((a) => (a.type || '').toLowerCase() === 'negativa');

  const selectedAnnotationsSet = new Set(selectedAnnotationsForDoc);

  const handleAddCommitment = () => {
    const trimmed = newCommitment.trim();
    if (trimmed.length === 0) { return; }
    onAddCommitment(trimmed);
    setNewCommitment('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCommitment();
    }
  };

  return (
    <div className="space-y-6">
      {/* Apoderado — visible para todos excepto derivación */}
      {docType !== 'derivacion' && (
        <div>
          <label
            htmlFor="apoderado-name"
            className="mb-1 block font-medium text-neutral-700 text-sm"
          >
            Nombre del Apoderado
          </label>
          <input
            id="apoderado-name"
            type="text"
            value={apoderadoName}
            onChange={(e) => onApoderadoNameChange(e.target.value)}
            placeholder="Ingrese el nombre del apoderado"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Coordinador / Emitido por — solo para compromiso_conductual */}
      {docType === 'compromiso_conductual' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="coordinator-name"
              className="mb-1 block font-medium text-neutral-700 text-sm"
            >
              Nombre del Coordinador
            </label>
            <input
              id="coordinator-name"
              type="text"
              value={coordinatorName}
              onChange={(e) => onCoordinatorNameChange(e.target.value)}
              placeholder="Coordinador de ciclo / convivencia"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="emitted-by" className="mb-1 block font-medium text-neutral-700 text-sm">
              Emitido por
            </label>
            <input
              id="emitted-by"
              type="text"
              value={emittedBy}
              onChange={(e) => onEmittedByChange(e.target.value)}
              placeholder="Nombre de quien emite"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Estado del compromiso — solo para compromiso_conductual */}
      {docType === 'compromiso_conductual' && (
        <div>
          <label
            htmlFor="compromiso-status"
            className="mb-1 block font-medium text-neutral-700 text-sm"
          >
            Estado del Compromiso
          </label>
          <select
            id="compromiso-status"
            value={compromisoStatus}
            onChange={(e) => onCompromisoStatusChange(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
          >
            {COMPROMISO_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Nombre Inspector/a — reemplaza Observaciones */}
      {docType !== 'derivacion' && (
        <div>
          <label
            htmlFor="inspector-name"
            className="mb-1 block font-medium text-neutral-700 text-sm"
          >
            Nombre Inspector/a
          </label>
          <input
            id="inspector-name"
            type="text"
            value={inspectorName}
            onChange={(e) => onInspectorNameChange(e.target.value)}
            placeholder="Ingrese el nombre del inspector/a"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Anotaciones negativas seleccionables */}
      <fieldset>
        <legend className="block font-medium text-neutral-700 text-sm">
          Anotaciones Negativas ({negativeCount})
        </legend>
        {selectedAnnotationsForDoc.length > 0 && (
          <span className="mb-2 block font-medium text-brand-600 text-xs">
            {selectedAnnotationsForDoc.length} seleccionada(s)
          </span>
        )}
        {negativeAnnotations.length === 0 ? (
          <p className="text-neutral-500 text-sm italic">
            No hay anotaciones negativas para seleccionar.
          </p>
        ) : (
          <div className="max-h-60 space-y-1.5 overflow-y-auto rounded-lg border border-neutral-200 p-2">
            {negativeAnnotations.map((a) => {
              const isSelected = selectedAnnotationsSet.has(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onToggleAnnotation(a.id)}
                  className={`flex w-full items-start gap-2.5 rounded-md p-2.5 text-left transition-colors ${
                    isSelected
                      ? 'border border-brand-200 bg-brand-50'
                      : 'border border-neutral-100 bg-white hover:bg-neutral-50'
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600" />
                  ) : (
                    <Square className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-neutral-800 text-sm">
                      {(a as Annotation).text || ''}
                    </span>
                    <span className="mt-0.5 block text-neutral-500 text-xs">
                      {(a as Annotation).date ? new Date((a as Annotation).date).toLocaleDateString('es-CL') : ''} &middot;{' '}
                      {(a as Annotation).severity || 'Sin asignatura'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      {/* Compromisos personalizados — solo para compromiso_conductual */}
      {docType === 'compromiso_conductual' && (
        <div>
          <label
            htmlFor="custom-commitment"
            className="mb-1 block font-medium text-neutral-700 text-sm"
          >
            Compromisos Personalizados
          </label>
          <div className="mb-2 flex gap-2">
            <input
              id="custom-commitment"
              type="text"
              value={newCommitment}
              onChange={(e) => setNewCommitment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escriba un compromiso y presione Enter o el botón +"
              className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              aria-label="Agregar compromiso"
              onClick={handleAddCommitment}
              disabled={newCommitment.trim().length === 0}
              className="rounded-lg bg-brand-600 px-3 py-2 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {customCommitments.length > 0 ? (
            <ul className="space-y-1.5">
              {customCommitments.map((c, i) => (
                <li
                  key={c || i}
                  className="flex items-start gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-neutral-700 text-sm"
                >
                  <span className="flex-1">{c}</span>
                  <button
                    type="button"
                    aria-label={`Eliminar compromiso: ${c}`}
                    onClick={() => onRemoveCommitment(i)}
                    className="mt-0.5 flex-shrink-0 text-red-500 transition-colors hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-neutral-500 text-sm italic">
              No se han agregado compromisos personalizados.
            </p>
          )}
        </div>
      )}

      {/* Botón de registro — solo para compromiso_conductual */}
      {docType === 'compromiso_conductual' && (
        <div className="border-neutral-200 border-t pt-4">
          <button
            type="button"
            onClick={onRegisterCommitment}
            disabled={isRegistering}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileText className="h-5 w-5" />
            {isRegistering ? 'Registrando...' : 'Registrar y Emitir Carta'}
          </button>
        </div>
      )}
    </div>
  );
}
