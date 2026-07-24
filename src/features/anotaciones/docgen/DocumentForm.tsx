/** @license SPDX-License-Identifier: Apache-2.0 */

import { FileText } from 'lucide-react';
import type { Annotation } from '../../../types';
import type { LetterContent } from './DocumentPreview/docTypes';

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
  letterContent: LetterContent;
  onLetterContentChange: (field: keyof LetterContent, value: string) => void;
  onResetLetterContent: () => void;
  selectedAnnotationsForDoc: string[];
  onToggleAnnotation: (id: string) => void;
  negativeCount: number;
  annotations: Annotation[];
  onRegisterCommitment: () => void;
  isRegistering: boolean;
}

const TEXT_FIELDS: Array<{ key: keyof LetterContent; label: string; rows: number }> = [
  { key: 'motivo', label: 'Motivo', rows: 2 },
  { key: 'descripcion', label: 'Descripción / antecedentes', rows: 4 },
  { key: 'medida', label: 'Medida o acuerdo', rows: 4 },
  { key: 'acuerdos', label: 'Acuerdos / acciones', rows: 4 },
  { key: 'cierre', label: 'Cierre', rows: 3 },
  { key: 'observaciones', label: 'Observaciones', rows: 3 },
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
  letterContent,
  onLetterContentChange,
  onResetLetterContent,
  negativeCount,
  onRegisterCommitment,
  isRegistering,
}: DocumentFormProps) {
  const showAdvanced = docType === 'compromiso_conductual' || docType === 'derivacion';

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
        Cantidad de anotaciones negativas consideradas: <strong>{negativeCount}</strong>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="apoderado-name"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            Nombre del Apoderado
          </label>
          <input
            id="apoderado-name"
            aria-label="Nombre del apoderado"
            type="text"
            value={apoderadoName}
            onChange={(e) => onApoderadoNameChange(e.target.value)}
            placeholder="Ingrese el nombre del apoderado"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="inspector-name"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            Nombre Inspector/a
          </label>
          <input
            id="inspector-name"
            aria-label="Nombre inspector/a"
            type="text"
            value={inspectorName}
            onChange={(e) => onInspectorNameChange(e.target.value)}
            placeholder="Ingrese el nombre del inspector/a"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="coordinator-name"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              Nombre del Coordinador
            </label>
            <input
              id="coordinator-name"
              aria-label="Nombre del coordinador"
              type="text"
              value={coordinatorName}
              onChange={(e) => onCoordinatorNameChange(e.target.value)}
              placeholder="Coordinador de ciclo / convivencia"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="emitted-by" className="mb-1 block text-sm font-medium text-neutral-700">
              Emitido por
            </label>
            <input
              id="emitted-by"
              aria-label="Emitido por"
              type="text"
              value={emittedBy}
              onChange={(e) => onEmittedByChange(e.target.value)}
              placeholder="Nombre de quien emite"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h5 className="text-sm font-bold text-neutral-900">Texto de la carta</h5>
            <p className="mt-1 text-xs text-neutral-500">
              Estos textos actualizan la plantilla en vivo.
            </p>
          </div>
          <button
            type="button"
            onClick={onResetLetterContent}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
          >
            Restaurar texto base
          </button>
        </div>
        <div className="space-y-4">
          {TEXT_FIELDS.map((field) => (
            <div key={field.key}>
              <label
                htmlFor={`letter-${field.key}`}
                className="mb-1 block text-sm font-medium text-neutral-700"
              >
                {field.label}
              </label>
              <textarea
                id={`letter-${field.key}`}
                aria-label={field.label}
                value={letterContent[field.key]}
                onChange={(event) => onLetterContentChange(field.key, event.target.value)}
                rows={field.rows}
                className="w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-neutral-200 pt-4">
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
    </div>
  );
}
