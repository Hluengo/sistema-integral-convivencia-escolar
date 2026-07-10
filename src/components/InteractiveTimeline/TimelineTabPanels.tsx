/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Causa } from '../../types';
import ProcesoTab from './ProcesoTab';
import BitacoraTab from './BitacoraTab';
import AsistenteIATab from './AsistenteIATab';
import { useTimelineContext } from '../../context/TimelineContext';

interface TimelineTabPanelsProps {
  activeTab: 'proceso' | 'bitacora' | 'asistente_ia';
  causa: Causa;
  currentFase: string;
  CustomMarkdownRenderer: ({ text }: { text: string }) => React.ReactElement;
  onUpdateCausa: (updated: Causa) => void;
}

export default function TimelineTabPanels({ activeTab, causa, currentFase, CustomMarkdownRenderer, onUpdateCausa }: TimelineTabPanelsProps) {
  const ctx = useTimelineContext();

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
      {activeTab === 'proceso' && (
        <ProcesoTab
          causa={causa}
          currentRole={ctx.currentRole}
          privacyMode={ctx.privacyMode}
          currentFase={currentFase}
          expandedStages={ctx.expandedStages}
          setExpandedStages={ctx.setExpandedStages}
          registeringItemId={ctx.registeringItemId}
          setRegisteringItemId={ctx.setRegisteringItemId}
          regName={ctx.regName}
          setRegName={ctx.setRegName}
          regObservations={ctx.regObservations}
          setRegObservations={ctx.setRegObservations}
          regFileName={ctx.regFileName}
          setRegFileName={ctx.setRegFileName}
          onUpdateCausa={onUpdateCausa}
          handleStartRegister={ctx.handleStartRegister}
          handleFileChange={ctx.handleFileChange}
          handleSaveRegistration={ctx.handleSaveRegistration}
          handleResetRegistration={ctx.handleResetRegistration}
          regFile={ctx.regFile}
          isUploadingDocument={ctx.isUploadingDocument}
          documentError={ctx.documentError}
          handleAttachDocument={ctx.handleAttachDocument}
          handleRemoveDocument={ctx.handleRemoveDocument}
          documents={ctx.documents}
        />
      )}

      {activeTab === 'bitacora' && (
        <BitacoraTab
          causa={causa}
          currentRole={ctx.currentRole}
          showLogForm={ctx.showLogForm}
          setShowLogForm={ctx.setShowLogForm}
          logType={ctx.logType}
          setLogType={ctx.setLogType}
          logParticipantes={ctx.logParticipantes}
          setLogParticipantes={ctx.setLogParticipantes}
          logTitle={ctx.logTitle}
          setLogTitle={ctx.setLogTitle}
          logDesc={ctx.logDesc}
          setLogDesc={ctx.setLogDesc}
          handleAddNewLog={ctx.handleAddNewLog}
        />
      )}

      {activeTab === 'asistente_ia' && (
        <AsistenteIATab
          aiSubTab={ctx.aiSubTab}
          setAiSubTab={ctx.setAiSubTab}
          auditReport={ctx.auditReport}
          isAuditing={ctx.isAuditing}
          selectedDocType={ctx.selectedDocType}
          setSelectedDocType={ctx.setSelectedDocType}
          fatherName={ctx.fatherName}
          setFatherName={ctx.setFatherName}
          draftedDocument={ctx.draftedDocument}
          isDrafting={ctx.isDrafting}
          copyFeedback={ctx.copyFeedback}
          handleRunAudit={ctx.handleRunAudit}
          handleDraftDocument={ctx.handleDraftDocument}
          handleCopyToClipboard={ctx.handleCopyToClipboard}
          CustomMarkdownRenderer={CustomMarkdownRenderer}
        />
      )}
    </div>
  );
}
