/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import type { Causa, ChecklistItem, UserRole } from '../../types';
import { CheckSquare, ChevronUp, ChevronDown, File, Download, Trash, Plus } from 'lucide-react';
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
  setRegFileName: _setRegFileName,
  handleStartRegister,
  handleFileChange,
  handleSaveRegistration,
  handleResetRegistration,
  regFile,
  isUploadingDocument,
  documentError,
  handleAttachDocument: _handleAttachDocument,
  handleRemoveDocument,
  documents,
}: ProcessChecklistProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-neutral-100 border-b pb-2">
        <div>
          <h3 className="flex items-center gap-1.5 font-sans font-semibold text-neutral-700 text-xs uppercase tracking-wider">
            <CheckSquare className="h-4 w-4 text-success-600" aria-hidden="true" /> Registro de
            hitos procesales
          </h3>
          <p className="mt-0.5 font-sans text-[9px] text-neutral-400 leading-tight">
            Preserve la trazabilidad del debido proceso
          </p>
        </div>
      </div>

      {/* Accordion of 5 stages */}
      <div className="max-h-[500px] space-y-2 overflow-y-auto pr-1">
        {PROCESS_SECTIONS.map((section) => {
          const sectionItems = causa.checklistDebidoProceso.filter((item) =>
            item.id.startsWith(section.prefix)
          );
          const completedCount = sectionItems.filter((item) => item.completado).length;
          const isExpanded = expandedStages[section.id];
          const isActive = currentFase === section.phaseName;

          return (
            <div
              key={section.id}
              id={`stage-${section.id}`}
              className={`overflow-hidden rounded-lg border bg-white transition-colors ${isActive ? 'border-brand-300 bg-brand-50/5 ring-1 ring-brand-300/30' : 'border-neutral-200'}`}
            >
              {/* Section Header */}
              <button
                type="button"
                onClick={() => setExpandedStages({ ...expandedStages, [section.id]: !isExpanded })}
                className={`flex w-full select-none items-center justify-between p-3 text-left font-sans transition-colors ${
                  isExpanded
                    ? 'border-neutral-200 border-b bg-neutral-50'
                    : 'bg-neutral-50/50 hover:bg-neutral-50'
                }`}
                aria-expanded={isExpanded}
                aria-controls={`section-${section.id}`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`font-semibold text-xs ${completedCount === sectionItems.length ? 'text-success-700' : 'text-neutral-800'}`}
                  >
                    {section.title}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 font-semibold text-[8px] ${
                      completedCount === sectionItems.length
                        ? 'bg-success-100 text-success-700'
                        : completedCount > 0
                          ? 'bg-warning-100 text-warning-700'
                          : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    {completedCount}/{sectionItems.length}
                  </span>
                  <span className="shrink-0 font-mono text-[8px] text-brand-600 tabular-nums">
                    {sectionItems.length > 0
                      ? Math.round((completedCount / sectionItems.length) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    isExpanded
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-neutral-300 bg-white text-neutral-400 hover:border-brand-400 hover:text-brand-600'
                  }`}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </span>
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div
                  id={`section-${section.id}`}
                  className="space-y-2 divide-y divide-neutral-100 p-2"
                >
                  {sectionItems.map((item) => {
                    const isSelected = registeringItemId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          item.completado
                            ? 'border-success-200 bg-success-50/30'
                            : isSelected
                              ? 'border-info-200 bg-info-50/30'
                              : 'border-neutral-200 bg-neutral-50/30 hover:bg-neutral-50/50'
                        }`}
                      >
                        {/* Item Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-2.5">
                            <div className="mt-0.5 shrink-0">
                              {item.completado ? (
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success-600 font-bold text-[10px] text-white">
                                  ✓
                                </span>
                              ) : (
                                <span className="block h-4 w-4 rounded-full border border-neutral-300 bg-white" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-neutral-900 text-xs leading-tight">
                                {item.label}
                              </h4>
                              <p className="mt-0.5 text-[10px] text-neutral-500 leading-snug">
                                {item.descripcion}
                              </p>
                            </div>
                          </div>

                          <span className="shrink-0 rounded bg-brand-100 px-1.5 py-0.5 font-semibold text-[8px] text-brand-700">
                            {item.requeridoPor}
                          </span>
                        </div>

                        {/* Completed Metadata */}
                        {item.completado && (
                          <div className="mt-2 space-y-1.5 rounded border border-success-200/70 bg-white p-2.5 font-sans text-[11px]">
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
                              <p className="border-success-500/50 border-l-2 pl-1.5 text-[11px] text-neutral-600 italic leading-relaxed">
                                "{item.observaciones}"
                              </p>
                            )}
                            {item.documentoNombre && item.documentoUrl && (
                              <div className="flex items-center justify-between rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px]">
                                <span className="flex items-center gap-1 truncate text-neutral-600">
                                  <File
                                    className="h-3 w-3 shrink-0 text-info-500"
                                    aria-hidden="true"
                                  />
                                  <span className="truncate">{item.documentoNombre}</span>
                                </span>
                                <a
                                  href={item.documentoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex shrink-0 items-center gap-0.5 pl-2 font-semibold text-[9px] text-info-600 hover:underline"
                                  aria-label={`Ver documento ${item.documentoNombre}`}
                                >
                                  <Download className="h-3 w-3" aria-hidden="true" /> Ver
                                </a>
                              </div>
                            )}

                            {currentRole !== 'docente' && (
                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleResetRegistration(item.id)}
                                  className="flex items-center gap-1 font-semibold text-[10px] text-danger-600 transition-colors hover:text-danger-700"
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
                                  className="flex cursor-pointer items-center gap-1.5 rounded border border-neutral-300 bg-white px-2.5 py-1 font-medium text-[11px] text-neutral-700 transition-colors hover:bg-neutral-50"
                                >
                                  <Plus
                                    className="h-3.5 w-3.5 text-success-600"
                                    aria-hidden="true"
                                  />{' '}
                                  Registrar hito
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
                                onSubmit={() => {
                                  handleSaveRegistration(item.id);
                                }}
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
