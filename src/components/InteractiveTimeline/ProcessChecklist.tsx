/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Causa, ChecklistItem, UserRole } from '../../types';
import {
  CheckSquare, ChevronUp, ChevronDown, File, Download, Trash, Plus,
  Circle, CircleDot, Navigation, HelpCircle
} from 'lucide-react';
import { PROCESS_SECTIONS } from './processSections';
import RegistrationForm from './RegistrationForm';
import AttachedDocuments from './AttachedDocuments';

interface ProcessChecklistProps {
  causa: Causa;
  currentRole: UserRole;
  currentFase: string;
  expandedStages: Record<string, boolean>;
  setExpandedStages: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  registeringItemId: string | null;
  setRegisteringItemId: React.Dispatch<React.SetStateAction<string | null>>;
  regName: string;
  setRegName: React.Dispatch<React.SetStateAction<string>>;
  regObservations: string;
  setRegObservations: React.Dispatch<React.SetStateAction<string>>;
  regFileName: string;
  setRegFileName: React.Dispatch<React.SetStateAction<string>>;
  handleStartRegister: (item: ChecklistItem) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveRegistration: (itemId: string) => void;
  handleResetRegistration: (itemId: string) => void;
  regFile: File | null;
  isUploadingDocument: boolean;
  documentError: string | null;
  handleAttachDocument: (itemId: string, file: File | null) => Promise<void>;
  handleRemoveDocument: (itemId: string, fileName?: string) => Promise<void>;
  documents: { name: string; url: string }[];
}

export default function ProcessChecklist({
  causa,
  currentRole,
  currentFase,
  expandedStages,
  setExpandedStages,
  registeringItemId,
  setRegisteringItemId,
  regName,
  setRegName,
  regObservations,
  setRegObservations,
  regFileName,
  setRegFileName,
  handleStartRegister,
  handleFileChange,
  handleSaveRegistration,
  handleResetRegistration,
  regFile,
  isUploadingDocument,
  documentError,
  handleAttachDocument,
  handleRemoveDocument,
  documents
}: ProcessChecklistProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
        <div>
          <h3 className="font-sans font-semibold text-xs uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
            <CheckSquare className="h-4 w-4 text-success-600" aria-hidden="true" /> Registro de hitos procesales
          </h3>
          <p className="text-[9px] text-neutral-400 mt-0.5 font-sans leading-tight">
            Preserve la trazabilidad del debido proceso
          </p>
        </div>
      </div>

      {/* Stage Navigator - Quick jump between 5 phases */}
      <nav className="overflow-x-auto pb-2 px-1 mb-1" aria-label="Navegación de fases del debido proceso">
        <div className="flex gap-1.5 min-w-max" role="tablist">
          {PROCESS_SECTIONS.map((section, index) => {
            const items = causa.checklistDebidoProceso.filter(c => c.id.startsWith(section.prefix));
            const completed = items.filter(c => c.completado).length;
            const total = items.length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            const isCurrentPhase = currentFase === section.phaseName;
            const isExpanded = expandedStages[section.id];

            return (
              <button
                key={section.id}
                type="button"
                role="tab"
                aria-selected={isExpanded}
                aria-label={`${section.title} - ${pct}% completado${isCurrentPhase ? ' (fase actual)' : ''}`}
                onClick={() => {
                  setExpandedStages(prev => ({ ...prev, [section.id]: !prev[section.id] }));
                  // Scroll to section
                  const el = document.getElementById(`stage-${section.id}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                  isCurrentPhase
                    ? 'bg-brand-500/10 border-brand-300/50 ring-2 ring-brand-500/20'
                    : isExpanded
                      ? 'bg-success-500/10 border-success-300/50'
                      : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100 hover:border-neutral-300'
                }`}
              >
                {/* Stage number / progress circle */}
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 28 28">
                    <circle
                      cx="14" cy="14" r="11"
                      fill="none"
                      stroke={isCurrentPhase ? '#ea580c' : isExpanded ? '#22c55e' : pct === 100 ? '#22c55e' : '#d1d5db'}
                      strokeWidth="2.5"
                      strokeDasharray={2 * Math.PI * 11}
                      strokeDashoffset={2 * Math.PI * 11 * (1 - pct / 100)}
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />
                    {pct === 100 && !isExpanded && !isCurrentPhase && (
                      <path d="M8 14l3 3 6-6" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    )}
                    {isCurrentPhase && (
                      <circle cx="14" cy="14" r="5" fill="#ea580c" />
                    )}
                  </svg>
                  <span className={`absolute text-[8px] font-bold ${isCurrentPhase ? 'text-white' : pct === 100 ? 'text-success-600' : 'text-neutral-400'}`}>
                    {index + 1}
                  </span>
                </div>
                {/* Stage title */}
                <span className={`text-[9px] font-medium leading-tight text-center truncate w-24 ${
                  isCurrentPhase ? 'text-brand-600' : isExpanded ? 'text-success-700' : 'text-neutral-600'
                }`}>
                  {section.title.split('. ')[1] || section.title}
                </span>
                {/* Completion % */}
                <span className={`text-[8px] font-mono tabular-nums ${isCurrentPhase ? 'text-brand-600' : isExpanded ? 'text-success-600' : 'text-neutral-400'}`}>
                  {pct}%
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Accordion of 5 stages */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {PROCESS_SECTIONS.map((section) => {
          const sectionItems = causa.checklistDebidoProceso.filter(item => item.id.startsWith(section.prefix));
          const completedCount = sectionItems.filter(item => item.completado).length;
          const isExpanded = expandedStages[section.id];
          const isActive = currentFase === section.phaseName;

          return (
            <div key={section.id} id={`stage-${section.id}`} className={`border rounded-lg overflow-hidden bg-white transition-all ${isActive ? 'ring-1 border-brand-300 ring-brand-300/30 bg-brand-50/5' : 'border-neutral-200'}`}>
              {/* Section Header */}
              <button
                type="button"
                onClick={() => setExpandedStages({ ...expandedStages, [section.id]: !isExpanded })}
                className={`w-full flex items-center justify-between p-3 transition-colors text-left font-sans select-none ${
                  isExpanded ? 'bg-neutral-50 border-b border-neutral-200' : 'bg-neutral-50/50 hover:bg-neutral-50'
                }`}
                aria-expanded={isExpanded}
                aria-controls={`section-${section.id}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-xs font-semibold ${completedCount === sectionItems.length ? 'text-success-700' : 'text-neutral-800'}`}>
                    {section.title}
                  </span>
                  <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                    completedCount === sectionItems.length
                      ? 'bg-success-100 text-success-700'
                      : completedCount > 0
                      ? 'bg-warning-100 text-warning-700'
                      : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {completedCount}/{sectionItems.length}
                  </span>
                  {isActive && (
                    <span className="text-[8px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-md bg-brand-600 text-white shrink-0">
                      Activa
                    </span>
                  )}
                </div>
                <span className={`flex items-center justify-center h-6 w-6 rounded-full border transition-all shrink-0 ${
                  isExpanded
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-neutral-400 border-neutral-300 hover:border-brand-400 hover:text-brand-600'
                }`}>
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
                </span>
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div id={`section-${section.id}`} className="divide-y divide-neutral-100 p-2 space-y-2">
                  {sectionItems.map((item) => {
                    const isSelected = registeringItemId === item.id;
                    return (
                      <div key={item.id} className={`p-3 rounded-lg border transition-all text-left ${
                        item.completado
                          ? 'bg-success-50/30 border-success-200'
                          : isSelected
                          ? 'bg-info-50/30 border-info-200'
                          : 'bg-neutral-50/30 border-neutral-200 hover:bg-neutral-50/50'
                      }`}>
                        {/* Item Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="mt-0.5 shrink-0">
                              {item.completado ? (
                                <span className="h-4 w-4 rounded-full bg-success-600 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                              ) : (
                                <span className="h-4 w-4 rounded-full border border-neutral-300 bg-white block" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-semibold leading-tight text-neutral-900">{item.label}</h4>
                              <p className="text-[10px] text-neutral-500 mt-0.5 leading-snug">{item.descripcion}</p>
                            </div>
                          </div>

                          <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded bg-brand-100 text-brand-700 shrink-0">
                            {item.requeridoPor}
                          </span>
                        </div>

                        {/* Completed Metadata */}
                        {item.completado && (
                          <div className="mt-2 text-[11px] bg-white rounded border border-success-200/70 p-2.5 space-y-1.5 font-sans">
                            <div className="flex flex-wrap items-center justify-between gap-1 border-b border-neutral-100 pb-1 text-neutral-400">
                              <span>Registrado por: <strong className="text-neutral-600">{item.registradoPor || 'Esteban Valenzuela'}</strong></span>
                              <span className="font-mono">Fecha: {item.fechaCompletado}</span>
                            </div>
                            {item.observaciones && (
                              <p className="text-neutral-600 italic leading-relaxed text-[11px] pl-1.5 border-l-2 border-success-500/50">
                                "{item.observaciones}"
                              </p>
                            )}
                            {item.documentoNombre && (
                              <div className="flex items-center justify-between text-[11px] bg-neutral-50 rounded px-2 py-1 border border-neutral-200">
                                <span className="flex items-center gap-1 text-neutral-600 truncate">
                                  <File className="h-3 w-3 text-info-500 shrink-0" aria-hidden="true" />
                                  <span className="truncate">{item.documentoNombre}</span>
                                </span>
                                <button
                                  type="button"
                                  className="text-[9px] text-info-600 font-semibold flex items-center gap-0.5 hover:underline shrink-0 pl-2"
                                  aria-label={`Ver documento ${item.documentoNombre}`}
                                >
                                  <Download className="h-3 w-3" aria-hidden="true" /> Ver
                                </button>
                              </div>
                            )}

                            {currentRole !== 'docente' && (
                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleResetRegistration(item.id)}
                                  className="text-[10px] text-danger-600 hover:text-danger-700 font-semibold flex items-center gap-1 transition-all"
                                >
                                  <Trash className="h-3 w-3" aria-hidden="true" /> Anular registro
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Incomplete State */}
                        {!item.completado && (
                          <div className="mt-2.5">
                            {!isSelected ? (
                              currentRole !== 'docente' && (
                                <button
                                  type="button"
                                  onClick={() => handleStartRegister(item)}
                                  className="text-[11px] bg-white border border-neutral-300 hover:bg-neutral-50 px-2.5 py-1 rounded font-medium text-neutral-700 flex items-center gap-1.5 transition-all cursor-pointer"
                                >
                                  <Plus className="h-3.5 w-3.5 text-success-600" aria-hidden="true" /> Registrar hito
                                </button>
                              )
                            ) : (
                              /* Registration Form */
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
                                onSubmit={() => { handleSaveRegistration(item.id); }}
                                isUploadingDocument={isUploadingDocument}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {documents.length > 0 && (
        <AttachedDocuments
          documents={documents}
          documentError={documentError}
          onRemoveDocument={handleRemoveDocument}
        />
      )}
    </div>
  );
}
