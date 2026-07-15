/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState } from 'react';
import { Plus, X, CheckSquare, Square, FileText } from 'lucide-react';

interface DocumentFormProps {
  docType: string;
  apoderadoName: string;
  onApoderadoNameChange: (value: string) => void;
  coordinatorName: string;
  onCoordinatorNameChange: (value: string) => void;
  emittedBy: string;
  onEmittedByChange: (value: string) => void;
  docObservations: string;
  onObservationsChange: (value: string) => void;
  selectedAnnotationsForDoc: string[];
  onToggleAnnotation: (id: string) => void;
  compromisoStatus: string;
  onCompromisoStatusChange: (value: string) => void;
  customCommitments: string[];
  onAddCommitment: (commitment: string) => void;
  onRemoveCommitment: (index: number) => void;
  negativeCount: number;
  annotations: any[];
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
  coordinatorName,
  onCoordinatorNameChange,
  emittedBy,
  onEmittedByChange,
  docObservations,
  onObservationsChange,
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

  const negativeAnnotations = annotations.filter(
    (a: any) => a.tipo === 'negativa' || a.valor < 0
  );

  const selectedAnnotationsSet = new Set(selectedAnnotationsForDoc);

  const handleAddCommitment = () => {
    const trimmed = newCommitment.trim();
    if (trimmed.length === 0) return;
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
          <label htmlFor="apoderado-name" className="block text-sm font-medium text-neutral-700 mb-1">
            Nombre del Apoderado
          </label>
          <input
            id="apoderado-name"
            type="text"
            value={apoderadoName}
            onChange={(e) => onApoderadoNameChange(e.target.value)}
            placeholder="Ingrese el nombre del apoderado"
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-brand-500 text-sm"
          />
        </div>
      )}

      {/* Coordinador / Emitido por — solo para compromiso_conductual */}
      {docType === 'compromiso_conductual' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="coordinator-name" className="block text-sm font-medium text-neutral-700 mb-1">
              Nombre del Coordinador
            </label>
            <input
              id="coordinator-name"
              type="text"
              value={coordinatorName}
              onChange={(e) => onCoordinatorNameChange(e.target.value)}
              placeholder="Coordinador de ciclo / convivencia"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-brand-500 text-sm"
            />
          </div>
          <div>
            <label htmlFor="emitted-by" className="block text-sm font-medium text-neutral-700 mb-1">
              Emitido por
            </label>
            <input
              id="emitted-by"
              type="text"
              value={emittedBy}
              onChange={(e) => onEmittedByChange(e.target.value)}
              placeholder="Nombre de quien emite"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-brand-500 text-sm"
            />
          </div>
        </div>
      )}

      {/* Estado del compromiso — solo para compromiso_conductual */}
      {docType === 'compromiso_conductual' && (
        <div>
          <label htmlFor="compromiso-status" className="block text-sm font-medium text-neutral-700 mb-1">
            Estado del Compromiso
          </label>
          <select
            id="compromiso-status"
            value={compromisoStatus}
            onChange={(e) => onCompromisoStatusChange(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-brand-500 text-sm bg-white"
          >
            {COMPROMISO_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Observaciones / Fundamentación */}
      <div>
        <label htmlFor="doc-observations" className="block text-sm font-medium text-neutral-700 mb-1">
          {docType === 'derivacion' ? 'Fundamentación de la Derivación' : 'Observaciones'}
        </label>
        <textarea
          id="doc-observations"
          value={docObservations}
          onChange={(e) => onObservationsChange(e.target.value)}
          placeholder={
            docType === 'derivacion'
              ? 'Describa los motivos y antecedentes de la derivación...'
              : 'Observaciones adicionales para el documento...'
          }
          rows={4}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-brand-500 text-sm resize-y"
        />
      </div>

      {/* Anotaciones negativas seleccionables */}
      <div role="group" aria-label={"Anotaciones Negativas (" + negativeCount + ")"}>
        <div className="flex items-center justify-between mb-2">
          <span className="block text-sm font-medium text-neutral-700">
            Anotaciones Negativas ({negativeCount})
          </span>
          {selectedAnnotationsForDoc.length > 0 && (
            <span className="text-xs text-brand-600 font-medium">
              {selectedAnnotationsForDoc.length} seleccionada(s)
            </span>
          )}
        </div>
        {negativeAnnotations.length === 0 ? (
          <p className="text-sm text-neutral-500 italic">
            No hay anotaciones negativas para seleccionar.
          </p>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-1.5 border border-neutral-200 rounded-lg p-2">
            {negativeAnnotations.map((a: any) => {
              const isSelected = selectedAnnotationsSet.has(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onToggleAnnotation(a.id)}
                  className={`w-full flex items-start gap-2.5 p-2.5 rounded-md text-left transition-colors ${
                    isSelected
                      ? 'bg-brand-50 border border-brand-200'
                      : 'bg-white border border-neutral-100 hover:bg-neutral-50'
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 mt-0.5 text-neutral-400 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-neutral-800 truncate">
                      {a.descripcion || a.motivo || 'Sin descripción'}
                    </span>
                    <span className="block text-xs text-neutral-500 mt-0.5">
                      {a.fecha
                        ? new Date(a.fecha).toLocaleDateString('es-CL')
                        : ''}{' '}
                      &middot; {a.asignatura || a.materia || 'Sin asignatura'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Compromisos personalizados — solo para compromiso_conductual */}
      {docType === 'compromiso_conductual' && (
        <div>
          <label htmlFor="custom-commitment" className="block text-sm font-medium text-neutral-700 mb-1">
            Compromisos Personalizados
          </label>
          <div className="flex gap-2 mb-2">
            <input
              id="custom-commitment"
              type="text"
              value={newCommitment}
              onChange={(e) => setNewCommitment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escriba un compromiso y presione Enter o el botón +"
              className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-brand-500 text-sm"
            />
            <button
              type="button"
              aria-label="Agregar compromiso"
              onClick={handleAddCommitment}
              disabled={newCommitment.trim().length === 0}
              className="px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {customCommitments.length > 0 ? (
            <ul className="space-y-1.5">
              {customCommitments.map((c, i) => (
                <li
                  key={c || i}
                  className="flex items-start gap-2 bg-neutral-50 rounded-lg px-3 py-2 text-sm text-neutral-700"
                >
                  <span className="flex-1">{c}</span>
                  <button
                    type="button"
                    aria-label={"Eliminar compromiso: " + c}
                    onClick={() => onRemoveCommitment(i)}
                    className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0 mt-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500 italic">
              No se han agregado compromisos personalizados.
            </p>
          )}
        </div>
      )}

      {/* Botón de registro — solo para compromiso_conductual */}
      {docType === 'compromiso_conductual' && (
        <div className="pt-4 border-t border-neutral-200">
          <button
            type="button"
            onClick={onRegisterCommitment}
            disabled={isRegistering}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FileText className="w-5 h-5" />
            {isRegistering ? 'Registrando...' : 'Registrar y Emitir Carta'}
          </button>
        </div>
      )}
    </div>
  );
}



