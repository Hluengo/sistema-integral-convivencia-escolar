/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import type { Causa } from '../../types';
import ProcesoTab from './ProcesoTab';
import BitacoraTab from './BitacoraTab';
import AsistenteIATab from './AsistenteIATab';
import { useTimelineContext } from '../../context/useTimelineContext';

interface TimelineTabPanelsProps {
  activeTab: 'proceso' | 'bitacora' | 'asistente_ia';
  causa: Causa;
  currentFase: string;
  CustomMarkdownRenderer: ({ text }: { text: string }) => React.ReactElement;
}

export default function TimelineTabPanels({
  activeTab,
  causa,
  currentFase,
  CustomMarkdownRenderer,
}: TimelineTabPanelsProps) {
  const ctx = useTimelineContext();

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
      {activeTab === 'proceso' && (
        <ProcesoTab
          causa={causa}
          currentRole={ctx.currentRole}
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
