import React from 'react';
import { CheckCircle2, Plus, Trash2, CheckSquare, Square } from 'lucide-react';
import { Annotation } from '../../types';

type DocType = 'amonestacion' | 'derivacion' | 'compromiso_conductual';

interface DocumentFormProps {
  docType: DocType;
  apoderadoName: string;
  onApoderadoNameChange: (v: string) => void;
  coordinatorName: string;
  onCoordinatorNameChange: (v: string) => void;
  emittedBy: string;
  onEmittedByChange: (v: string) => void;
  compromisoStatus: string;
  onCompromisoStatusChange: (v: string) => void;
  docObservations: string;
  onDocObservationsChange: (v: string) => void;
  customCommitments: string[];
  newCustomCommitment: string;
  onNewCustomCommitmentChange: (v: string) => void;
  onAddCustomCommitment: () => void;
  onRemoveCustomCommitment: (index: number) => void;
  negativeAnns: Annotation[];
  selectedAnnotationsForDoc: string[];
  onToggleAnnotation: (id: string) => void;
  hasTenOrMore: boolean;
  authorizedBypass: boolean;
  isDocLockedByProgress: boolean;
  bypassProgressLock: boolean;
  onRegisterCommitment: () => void;
}

export default function DocumentForm({
  docType,
  apoderadoName,
  onApoderadoNameChange,
  coordinatorName,
  onCoordinatorNameChange,
  emittedBy,
  onEmittedByChange,
  compromisoStatus,
  onCompromisoStatusChange,
  docObservations,
  onDocObservationsChange,
  customCommitments,
  newCustomCommitment,
  onNewCustomCommitmentChange,
  onAddCustomCommitment,
  onRemoveCustomCommitment,
  negativeAnns,
  selectedAnnotationsForDoc,
  onToggleAnnotation,
  hasTenOrMore,
  authorizedBypass,
  isDocLockedByProgress,
  bypassProgressLock,
  onRegisterCommitment,
}: DocumentFormProps) {
  const isDisabled =
    (isDocLockedByProgress && !bypassProgressLock) ||
    (docType === 'compromiso_conductual' && !hasTenOrMore && !authorizedBypass);

  const selectedAnnotationsSet = new Set(selectedAnnotationsForDoc);

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 transition-opacity ${
        isDisabled ? 'opacity-40 pointer-events-none' : 'opacity-100'
      }`}
    >
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
        2. Metadatos del Documento
      </span>

      {/* Apoderado name (not for derivacion) */}
      {docType !== 'derivacion' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="apoderado-name" className="text-[10px] font-bold text-slate-600 block mb-1">Nombre Apoderado</label>
            <input
              id="apoderado-name"
              type="text"
              value={apoderadoName}
              onChange={(e) => onApoderadoNameChange(e.target.value)}
              placeholder="Ej: María José Valenzuela"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>
      )}

      {/* Compromiso Conductual specific fields */}
      {docType === 'compromiso_conductual' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="coordinator-name" className="text-[10px] font-bold text-slate-600 block mb-1">
                Coordinador Ciclo Responsable
              </label>
              <input
                id="coordinator-name"
                type="text"
                value={coordinatorName}
                onChange={(e) => onCoordinatorNameChange(e.target.value)}
                placeholder="Ej: Sor María Inés"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label htmlFor="emitted-by" className="text-[10px] font-bold text-slate-600 block mb-1">Usuario que Emite / Cargo</label>
              <input
                id="emitted-by"
                type="text"
                value={emittedBy}
                onChange={(e) => onEmittedByChange(e.target.value)}
                placeholder="Ej: Coordinador Convivencia"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label htmlFor="compromiso-status" className="text-[10px] font-bold text-slate-600 block mb-1">
              Estado Administrativo del Documento
            </label>
            <select
              id="compromiso-status"
              value={compromisoStatus}
              onChange={(e) => onCompromisoStatusChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="Pendiente">Pendiente</option>
              <option value="Emitida">Emitida</option>
              <option value="Entregada">Entregada</option>
              <option value="Firmada parcialmente">Firmada parcialmente</option>
              <option value="Firmada completamente">Firmada completamente</option>
              <option value="En seguimiento">En seguimiento</option>
              <option value="Cerrada">Cerrada</option>
            </select>
          </div>

          {/* Custom commitments */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label htmlFor="custom-commitment" className="text-[10px] font-bold text-slate-600 block">Agregar Compromiso Personalizado</label>
            <div className="flex gap-1.5">
              <input
                id="custom-commitment"
                type="text"
                value={newCustomCommitment}
                onChange={(e) => onNewCustomCommitmentChange(e.target.value)}
                placeholder="Ej: Asistir a sesiones semanales de tutoría..."
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={onAddCustomCommitment}
                aria-label="Agregar compromiso"
                className="px-3 bg-slate-900 hover:bg-black text-white font-bold rounded-lg text-xs flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {customCommitments.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg max-h-32 overflow-y-auto space-y-1">
                {customCommitments.map((comm, idx) => (
                  <div
                    key={comm || idx}
                    className="flex items-start justify-between gap-2 p-1.5 bg-white border rounded text-[11px] text-slate-700"
                  >
                    <span className="flex-1 leading-normal">{comm}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveCustomCommitment(idx)}
                      aria-label={`Eliminar compromiso: ${comm}`}
                      className="text-red-500 hover:text-red-700 shrink-0 p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Observations */}
      <div>
        <label htmlFor="doc-observations" className="text-[10px] font-bold text-slate-600 block mb-1">
          {docType === 'compromiso_conductual'
            ? 'Observaciones / Medidas Adicionales'
            : 'Observaciones y Acuerdos Remediales'}
        </label>
        <textarea
          id="doc-observations"
          value={docObservations}
          onChange={(e) => onDocObservationsChange(e.target.value)}
          placeholder="Indique las observaciones adicionales relevantes o medidas pedagógicas inmediatas adoptadas..."
          rows={3}
          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs leading-normal focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
        />
      </div>

      {/* Annotation selection */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <label htmlFor="annotation-selection" className="text-[10px] font-bold text-slate-600 block">Seleccionar Anotaciones a Citar</label>
        {negativeAnns.length > 0 ? (
          <div id="annotation-selection" className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto bg-slate-50 p-2 space-y-1.5">
            {negativeAnns.map(ann => {
              const isSelected = selectedAnnotationsSet.has(ann.id);
              return (
                <button
                  key={ann.id}
                  type="button"
                  onClick={() => onToggleAnnotation(ann.id)}
                  className="w-full p-2 rounded bg-white border text-left flex items-start gap-2 text-xs transition-all hover:bg-slate-50 border-slate-200"
                >
                  <div className="shrink-0 mt-0.5 text-indigo-600">
                    {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                      <span>
                        {ann.date} • {ann.registered_by}
                      </span>
                      <span className="font-bold text-red-600">{ann.severity}</span>
                    </div>
                    <p className="text-[11px] text-slate-700 truncate mt-0.5">{ann.text}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-200 border-dashed rounded-lg text-center text-[10px] text-slate-400">
            No se encontraron anotaciones negativas registradas para citar en este documento.
          </div>
        )}
      </div>

      {/* Register button */}
      {docType === 'compromiso_conductual' && (
        <button
          type="button"
          onClick={onRegisterCommitment}
          disabled={!hasTenOrMore && !authorizedBypass}
          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all ${
            !hasTenOrMore && !authorizedBypass
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Registrar y Emitir Carta de Compromiso
        </button>
      )}
    </div>
  );
}
