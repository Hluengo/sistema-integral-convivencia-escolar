/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import type { Causa, ChecklistItem, FaseProcedimental, UserRole } from '../../shared/lib/types';
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
  );
}
