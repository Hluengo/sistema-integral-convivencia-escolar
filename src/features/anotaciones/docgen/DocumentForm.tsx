/** @license SPDX-License-Identifier: Apache-2.0 */

import { CheckSquare, Square, FileText } from 'lucide-react';
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
  docObservations: string;
  onObservationsChange: (value: string) => void;
  selectedAnnotationsForDoc: string[];
  onToggleAnnotation: (id: string) => void;
  negativeCount: number;
  annotations: Annotation[];
  onRegisterCommitment: () => void;
  isRegistering: boolean;
}

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
  docObservations,
  onObservationsChange,
  selectedAnnotationsForDoc,
  onToggleAnnotation,
  negativeCount,
  annotations,
  onRegisterCommitment,
  isRegistering,
}: DocumentFormProps) {
  const negativeAnnotations = annotations.filter((a) => (a.type || '').toLowerCase() === 'negativa');

  const selectedAnnotationsSet = new Set(selectedAnnotationsForDoc);

  const showAdvanced = docType === 'compromiso_conductual' || docType === 'derivacion';

  return (
    <div className="space-y-6">
      {/* Apoderado */}
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

      {/* Inspector/a */}
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

      {/* Coordinador / Emitido por — para compromiso y derivación */}
      {showAdvanced && (
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

      {/* Observaciones */}
      <div>
        <label
          htmlFor="doc-observations"
          className="mb-1 block font-medium text-neutral-700 text-sm"
        >
          Observaciones
        </label>
        <textarea
          id="doc-observations"
          value={docObservations}
          onChange={(e) => onObservationsChange(e.target.value)}
          placeholder="Observaciones adicionales para el documento..."
          rows={4}
          className="w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
        />
      </div>

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
