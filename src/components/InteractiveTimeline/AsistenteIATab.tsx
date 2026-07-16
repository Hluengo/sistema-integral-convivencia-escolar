/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import AuditPanel from './AuditPanel';
import DraftPanel from './DraftPanel';

type AiSubTab = 'auditoria' | 'borradores';
type DocType = 'notificacion_apertura' | 'citacion_entrevista' | 'informe_cierre_indagacion' | 'informe_concluyente';

type MarkdownRenderer = ({ text }: { text: string }) => React.ReactElement;

interface AsistenteIATabProps {
  aiSubTab: AiSubTab;
  setAiSubTab: React.Dispatch<React.SetStateAction<AiSubTab>>;
  auditReport: string;
  isAuditing: boolean;
  selectedDocType: DocType;
  setSelectedDocType: React.Dispatch<React.SetStateAction<DocType>>;
  fatherName: string;
  setFatherName: React.Dispatch<React.SetStateAction<string>>;
  draftedDocument: string;
  isDrafting: boolean;
  copyFeedback: boolean;
  handleRunAudit: () => Promise<void>;
  handleDraftDocument: () => Promise<void>;
  handleCopyToClipboard: () => void;
  CustomMarkdownRenderer: MarkdownRenderer;
}

export default function AsistenteIATab({
  aiSubTab,
  setAiSubTab,
  auditReport,
  isAuditing,
  selectedDocType,
  setSelectedDocType,
  fatherName,
  setFatherName,
  draftedDocument,
  isDrafting,
  copyFeedback,
  handleRunAudit,
  handleDraftDocument,
  handleCopyToClipboard,
  CustomMarkdownRenderer
}: AsistenteIATabProps) {
  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 p-1" role="tablist" aria-label="Herramientas de IA">
        <button
          type="button"
          onClick={() => setAiSubTab('auditoria')}
          role="tab"
          aria-selected={aiSubTab === 'auditoria'}
          className={`flex-1 cursor-pointer rounded-md px-3 py-2 font-semibold text-[11px] transition-all ${
            aiSubTab === 'auditoria'
              ? 'bg-white text-neutral-900 shadow-xs'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Auditoría legal
        </button>
        <button
          type="button"
          onClick={() => setAiSubTab('borradores')}
          role="tab"
          aria-selected={aiSubTab === 'borradores'}
          className={`flex-1 cursor-pointer rounded-md px-3 py-2 font-semibold text-[11px] transition-all ${
            aiSubTab === 'borradores'
              ? 'bg-white text-neutral-900 shadow-xs'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Redacción documentos
        </button>
      </div>

      {aiSubTab === 'auditoria' ? (
        <AuditPanel
          auditReport={auditReport}
          isAuditing={isAuditing}
          handleRunAudit={handleRunAudit}
          CustomMarkdownRenderer={CustomMarkdownRenderer}
        />
      ) : (
        <DraftPanel
          selectedDocType={selectedDocType}
          setSelectedDocType={setSelectedDocType}
          fatherName={fatherName}
          setFatherName={setFatherName}
          draftedDocument={draftedDocument}
          isDrafting={isDrafting}
          copyFeedback={copyFeedback}
          handleDraftDocument={handleDraftDocument}
          handleCopyToClipboard={handleCopyToClipboard}
          CustomMarkdownRenderer={CustomMarkdownRenderer}
        />
      )}
    </div>
  );
}
