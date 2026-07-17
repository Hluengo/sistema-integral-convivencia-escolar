/** @license SPDX-License-Identifier: Apache-2.0 */

import { createContext, useContext } from 'react';
import type { Causa, UserRole, BitacoraEntry, ChecklistItem } from '../../types';

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
  handleStartRegister: (item: ChecklistItem) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveRegistration: (itemId: string) => Promise<void>;
  handleResetRegistration: (itemId: string) => void;

  documents: { name: string; url: string }[];
  isUploadingDocument: boolean;
  documentError: string | null;
  handleAttachDocument: (itemId: string, file: File | null) => Promise<void>;
  handleRemoveDocument: (itemId: string, fileName?: string) => Promise<void>;

  showLogForm: boolean;
  setShowLogForm: React.Dispatch<React.SetStateAction<boolean>>;
  logType: BitacoraEntry['tipo'];
  setLogType: React.Dispatch<React.SetStateAction<BitacoraEntry['tipo']>>;
  logTitle: string;
  setLogTitle: React.Dispatch<React.SetStateAction<string>>;
  logDesc: string;
  setLogDesc: React.Dispatch<React.SetStateAction<string>>;
  logParticipantes: string;
  setLogParticipantes: React.Dispatch<React.SetStateAction<string>>;
  handleAddNewLog: (e: React.FormEvent) => void;

  aiSubTab: 'auditoria' | 'borradores';
  setAiSubTab: React.Dispatch<React.SetStateAction<'auditoria' | 'borradores'>>;
  auditReport: string;
  isAuditing: boolean;
  selectedDocType: 'notificacion_apertura' | 'citacion_entrevista' | 'informe_cierre_indagacion' | 'informe_concluyente';
  setSelectedDocType: React.Dispatch<React.SetStateAction<'notificacion_apertura' | 'citacion_entrevista' | 'informe_cierre_indagacion' | 'informe_concluyente'>>;
  fatherName: string;
  setFatherName: React.Dispatch<React.SetStateAction<string>>;
  draftedDocument: string;
  isDrafting: boolean;
  copyFeedback: boolean;
  handleRunAudit: () => Promise<void>;
  handleDraftDocument: () => Promise<void>;
  handleCopyToClipboard: () => void;
}

export const TimelineContext = createContext<TimelineContextValue | null>(null);

export function useTimelineContext() {
  const ctx = useContext(TimelineContext);
  if (!ctx) { throw new Error('useTimelineContext debe usarse dentro de TimelineProvider'); }
  return ctx;
}
