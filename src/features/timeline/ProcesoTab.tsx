/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import type { Causa, ChecklistItem, FaseProcedimental, UserRole } from '../../shared/lib/types';
import { MAPPED_STATES } from '../../shared/lib/data';
import { ShieldCheck } from 'lucide-react';
import ProcessChecklist from './ProcessChecklist';

interface ProcesoTabProps {
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
  isSavingRegistration: boolean;
  registrationError: string | null;
  documentError: string | null;
  handleAttachDocument: (itemId: string, file: File | null) => Promise<void>;
  handleRemoveDocument: (itemId: string, fileName?: string) => Promise<void>;
  documents: { name: string; url: string }[];
  selectedPhase: FaseProcedimental;
}

export default function ProcesoTab({
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
  isSavingRegistration,
  registrationError,
  documentError,
  handleAttachDocument,
  handleRemoveDocument,
  documents,
  selectedPhase,
}: ProcesoTabProps) {
  return (
    <div className="space-y-4">
      {/* Current State */}
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-info-200/60 bg-linear-to-r from-info-50/80 to-neutral-50 p-3.5 text-left sm:p-4">
        <div className="shrink-0 rounded-lg bg-info-100/60 p-2 text-info-600" aria-hidden="true">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-[9px] text-info-600 uppercase tracking-wider">
              Estado de la causa
            </span>
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-info-500"
              aria-hidden="true"
            />
          </div>
          <h4 className="font-bold font-sans text-neutral-900 text-xs">{causa.estadoActual}</h4>
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
        isSavingRegistration={isSavingRegistration}
        registrationError={registrationError}
        documentError={documentError}
        handleAttachDocument={handleAttachDocument}
        handleRemoveDocument={handleRemoveDocument}
        documents={documents}
        selectedPhase={selectedPhase}
      />
    </div>
  );
}
