/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Causa, ChecklistItem, UserRole } from '../../types';
import { MAPPED_STATES, FASES_LIST } from '../../data';
import { ShieldCheck, Check } from 'lucide-react';
import ProcessChecklist from './ProcessChecklist';
import { PHASE_PREFIXES, PHASE_SHORT, getPhaseProgress } from '../../data';

interface ProcesoTabProps {
  causa: Causa;
  currentRole: UserRole;
  privacyMode: boolean;
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
  onUpdateCausa: (updated: Causa) => void;
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

export default function ProcesoTab({
  causa,
  currentRole,
  privacyMode,
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
  onUpdateCausa,
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
}: ProcesoTabProps) {
  return (
    <div className="space-y-4">
      {/* 5-phase visual ribbon */}
      <ul className="grid grid-cols-5 gap-4 text-center bg-neutral-50 p-2 rounded-lg border border-neutral-200 list-none m-0" aria-label="Indicador de fases">
        {FASES_LIST.map((f, i) => {
          const isActive = currentFase === f.name;
          const { total, completed } = getPhaseProgress(causa.checklistDebidoProceso, f.name);
          const isComplete = total > 0 && completed === total;
          const progress = total > 0 ? completed / total : 0;

          return (
            <li key={f.name} className="flex flex-col items-center gap-1">
              <div className="relative w-10 h-10">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                  <circle
                    className="text-neutral-200"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    cx="18"
                    cy="18"
                    r="15"
                  />
                  <circle
                    className={`${isComplete ? 'text-success-600' : isActive ? 'text-brand-600' : 'text-neutral-400'} transition-all duration-500`}
                    strokeWidth="3"
                    strokeDasharray={`${progress * 100}, 100`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    cx="18"
                    cy="18"
                    r="15"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {isComplete ? (
                    <Check className="h-4 w-4 text-success-600" />
                  ) : (
                    <span className={`text-[10px] font-bold ${isActive ? 'text-neutral-900' : 'text-neutral-500'}`}>
                      {i + 1}
                    </span>
                  )}
                </div>
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? 'text-neutral-900' : 'text-neutral-500'}`}>
                <span className="sm:hidden">{PHASE_SHORT[f.name] || f.name}</span>
                <span className="hidden sm:inline">{f.name}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {/* Current State */}
      <div className="mt-4 bg-gradient-to-r from-info-50/80 to-neutral-50 border border-info-200/60 p-3.5 sm:p-4 rounded-xl flex items-start gap-3 text-left">
        <div className="p-2 bg-info-100/60 rounded-lg text-info-600 shrink-0" aria-hidden="true">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase font-semibold tracking-wider text-info-600 font-mono">
              Estado de la causa
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-info-500 animate-pulse" aria-hidden="true" />
          </div>
          <h4 className="text-xs font-bold text-neutral-900 font-sans">
            {causa.estadoActual}
          </h4>
          <p className="text-[10px] text-neutral-500 leading-snug">
            {MAPPED_STATES[causa.estadoActual]?.desc || 'Sin descripción técnica registrada.'}
          </p>
        </div>
      </div>

      {/* Due Process Checklist */}
      <ProcessChecklist
        causa={causa}
        currentRole={currentRole}
        currentFase={currentFase}
        expandedStages={expandedStages}
        setExpandedStages={setExpandedStages}
        registeringItemId={registeringItemId}
        setRegisteringItemId={setRegisteringItemId}
        regName={regName}
        setRegName={setRegName}
        regObservations={regObservations}
        setRegObservations={setRegObservations}
        regFileName={regFileName}
        setRegFileName={setRegFileName}
        handleStartRegister={handleStartRegister}
        handleFileChange={handleFileChange}
        handleSaveRegistration={handleSaveRegistration}
        handleResetRegistration={handleResetRegistration}
        regFile={regFile}
        isUploadingDocument={isUploadingDocument}
        documentError={documentError}
        handleAttachDocument={handleAttachDocument}
        handleRemoveDocument={handleRemoveDocument}
        documents={documents}
      />
    </div>
  );
}
