/** @license SPDX-License-Identifier: Apache-2.0 */

import { createContext, useContext } from 'react';
import type { Causa, ChecklistItem, UserRole } from './types';
import type { ManualBitacoraEntryInput } from './hooks/useBitacoraLog';

interface TimelineContextValue {
  causa: Causa;
  currentRole: UserRole;
  privacyMode: boolean;
  onUpdateCausa: (updated: Causa) => void;

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
  regFile: File | null;
  isSavingRegistration: boolean;
  registrationError: string | null;
  handleStartRegister: (item: ChecklistItem) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveRegistration: (itemId: string) => Promise<void>;
  handleResetRegistration: (itemId: string) => void;

  documents: { name: string; url: string }[];
  isUploadingDocument: boolean;
  documentError: string | null;
  handleAttachDocument: (itemId: string, file: File | null) => Promise<void>;
  handleRemoveDocument: (itemId: string, fileName?: string) => Promise<void>;

  createManualLog: (input: ManualBitacoraEntryInput) => Promise<void>;
}

export const TimelineContext = createContext<TimelineContextValue | null>(null);

export function useTimelineContext() {
  const ctx = useContext(TimelineContext);
  if (!ctx) {
    throw new Error('useTimelineContext debe usarse dentro de TimelineProvider');
  }
  return ctx;
}
