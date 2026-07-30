/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import type { Causa, FaseProcedimental } from '../../types';
import ProcesoTab from './ProcesoTab';
import BitacoraTab from './BitacoraTab';
import AsistenteIATab from './AsistenteIATab';
import ResumenTab from './ResumenTab';
import { useTimelineContext } from '../../context/useTimelineContext';
import type { TimelineTab } from './timelineTabs';
import { DetailModalBody } from '../../shared/ui/DetailModal';

interface TimelineTabPanelsProps {
  activeTab: TimelineTab;
  causa: Causa;
  currentFase: string;
  CustomMarkdownRenderer: ({ text }: { text: string }) => React.ReactElement;
  breaches: string[];
  selectedPhase: FaseProcedimental | null;
  onSelectPhase: (phase: FaseProcedimental | null) => void;
}

export default function TimelineTabPanels({
  activeTab,
  causa,
  currentFase,
  CustomMarkdownRenderer,
  breaches,
  selectedPhase,
  onSelectPhase,
}: TimelineTabPanelsProps) {
  const ctx = useTimelineContext();

  return (
    <DetailModalBody className="space-y-4">
      {activeTab === 'resumen' && (
        <>
          <ResumenTab
            causa={causa}
            breaches={breaches}
            selectedPhase={selectedPhase}
            onSelectPhase={onSelectPhase}
          />
          {selectedPhase && (
            <section id="phase-workspace" aria-label={`Hitos de ${selectedPhase}`}>
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
                isSavingRegistration={ctx.isSavingRegistration}
                registrationError={ctx.registrationError}
                documentError={ctx.documentError}
                handleAttachDocument={ctx.handleAttachDocument}
                handleRemoveDocument={ctx.handleRemoveDocument}
                documents={ctx.documents}
                selectedPhase={selectedPhase}
              />
            </section>
          )}
        </>
      )}

      {activeTab === 'bitacora' && (
        <BitacoraTab
          causa={causa}
          currentRole={ctx.currentRole}
          onCreateManualEntry={ctx.createManualLog}
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
    </DetailModalBody>
  );
}
