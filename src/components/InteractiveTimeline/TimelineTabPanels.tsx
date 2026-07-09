/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Causa, UserRole, BitacoraEntry, ChecklistItem } from '../../types';
import ProcesoTab from './ProcesoTab';
import BitacoraTab from './BitacoraTab';
import AsistenteIATab from './AsistenteIATab';

interface TimelineTabPanelsProps {
  activeTab: 'proceso' | 'bitacora' | 'asistente_ia';
  causa: Causa;
  currentRole: UserRole;
  privacyMode: boolean;
  currentFase: string;
  CustomMarkdownRenderer: ({ text }: { text: string }) => React.ReactElement;
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
  isUploadingDocument: boolean;
  documentError: string | null;
  documents: { name: string; url: string }[];
  handleStartRegister: (item: ChecklistItem) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveRegistration: (itemId: string) => void;
  handleResetRegistration: (itemId: string) => void;
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
  onUpdateCausa: (updated: Causa) => void;
}

export default function TimelineTabPanels(props: TimelineTabPanelsProps) {
  const { activeTab, causa } = props;
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
      {/* TAB 1: PROCESO */}
      {activeTab === 'proceso' && (
        <ProcesoTab
          causa={causa}
          currentRole={props.currentRole}
          privacyMode={props.privacyMode}
          currentFase={props.currentFase}
          expandedStages={props.expandedStages}
          setExpandedStages={props.setExpandedStages}
          registeringItemId={props.registeringItemId}
          setRegisteringItemId={props.setRegisteringItemId}
          regName={props.regName}
          setRegName={props.setRegName}
          regObservations={props.regObservations}
          setRegObservations={props.setRegObservations}
          regFileName={props.regFileName}
          setRegFileName={props.setRegFileName}
          onUpdateCausa={props.onUpdateCausa}
          handleStartRegister={props.handleStartRegister}
          handleFileChange={props.handleFileChange}
          handleSaveRegistration={props.handleSaveRegistration}
          handleResetRegistration={props.handleResetRegistration}
          regFile={props.regFile}
          isUploadingDocument={props.isUploadingDocument}
          documentError={props.documentError}
          handleAttachDocument={props.handleAttachDocument}
          handleRemoveDocument={props.handleRemoveDocument}
          documents={props.documents}
        />
      )}

      {/* TAB 2: BITÁCORA */}
      {activeTab === 'bitacora' && (
        <BitacoraTab
          causa={causa}
          currentRole={props.currentRole}
          showLogForm={props.showLogForm}
          setShowLogForm={props.setShowLogForm}
          logType={props.logType}
          setLogType={props.setLogType}
          logParticipantes={props.logParticipantes}
          setLogParticipantes={props.setLogParticipantes}
          logTitle={props.logTitle}
          setLogTitle={props.setLogTitle}
          logDesc={props.logDesc}
          setLogDesc={props.setLogDesc}
          handleAddNewLog={props.handleAddNewLog}
        />
      )}

      {/* TAB 3: ASISTENTE IA */}
      {activeTab === 'asistente_ia' && (
        <AsistenteIATab
          aiSubTab={props.aiSubTab}
          setAiSubTab={props.setAiSubTab}
          auditReport={props.auditReport}
          isAuditing={props.isAuditing}
          selectedDocType={props.selectedDocType}
          setSelectedDocType={props.setSelectedDocType}
          fatherName={props.fatherName}
          setFatherName={props.setFatherName}
          draftedDocument={props.draftedDocument}
          isDrafting={props.isDrafting}
          copyFeedback={props.copyFeedback}
          handleRunAudit={props.handleRunAudit}
          handleDraftDocument={props.handleDraftDocument}
          handleCopyToClipboard={props.handleCopyToClipboard}
          CustomMarkdownRenderer={props.CustomMarkdownRenderer}
        />
      )}
    </div>
  );
}
