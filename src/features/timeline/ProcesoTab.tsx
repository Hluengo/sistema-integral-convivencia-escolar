/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Causa, FaseProcedimental } from "../../shared/lib/types";
import { useTimelineContext } from "../../shared/lib/useTimelineContext";
import ProcessChecklist from "./ProcessChecklist";

interface ProcesoTabProps {
  causa: Causa;
  currentFase: string;
  selectedPhase: FaseProcedimental;
}

export default function ProcesoTab({
  causa,
  currentFase,
  selectedPhase,
}: ProcesoTabProps) {
  const ctx = useTimelineContext();

  return (
    <ProcessChecklist
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
  );
}
