/** @license SPDX-License-Identifier: Apache-2.0 */

import { FileSignature, ShieldCheck } from 'lucide-react';
import type { Causa } from '../../../shared/lib/types';
import MarkdownRenderer from '../../timeline/MarkdownRenderer';
import AuditPanel from '../../timeline/AuditPanel';
import DraftPanel from '../../timeline/DraftPanel';
import { useAuditDraft } from '../../../shared/lib/hooks/useAuditDraft';

export type CaseLegalTool = 'redaccion' | 'auditoria';

interface CaseLegalWorkspaceProps {
  causa: Causa;
  activeTool: CaseLegalTool;
  privacyMode: boolean;
}

export default function CaseLegalWorkspace({
  causa,
  activeTool,
  privacyMode,
}: CaseLegalWorkspaceProps) {
  const draft = useAuditDraft({ causa });

  return (
    <section className="space-y-4" aria-label="Herramientas legales del expediente seleccionado">
      <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-10px text-neutral-500 uppercase tracking-wide">
            Expediente de trabajo
          </p>
          <h3 className="truncate font-semibold text-base text-neutral-900">
            {privacyMode ? causa.nnaProtectedName : causa.estudianteNombre}
          </h3>
          <p className="mt-0.5 font-medium text-neutral-500 text-xs">
            {causa.estudianteCurso || 'Curso no registrado'} · {causa.id}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-brand-200 bg-brand-50 px-3 py-1 font-semibold text-11px text-brand-800 sm:self-auto">
          {activeTool === 'redaccion' ? (
            <FileSignature className="size-3.5" aria-hidden="true" />
          ) : (
            <ShieldCheck className="size-3.5" aria-hidden="true" />
          )}
          {activeTool === 'redaccion' ? 'Redacción de documento' : 'Auditoría del expediente'}
        </span>
      </div>

      {activeTool === 'redaccion' ? (
        <DraftPanel
          selectedDocType={draft.selectedDocType}
          setSelectedDocType={draft.setSelectedDocType}
          draftedDocument={draft.draftedDocument}
          draftError={draft.draftError}
          isDrafting={draft.isDrafting}
          setDraftedDocument={draft.setDraftedDocument}
          handleDraftDocument={draft.handleDraftDocument}
          studentName={causa.estudianteNombre}
          course={causa.estudianteCurso}
          caseId={causa.id}
          CustomMarkdownRenderer={MarkdownRenderer}
        />
      ) : (
        <AuditPanel
          auditReport={draft.auditReport}
          isAuditing={draft.isAuditing}
          handleRunAudit={draft.handleRunAudit}
          CustomMarkdownRenderer={MarkdownRenderer}
        />
      )}
    </section>
  );
}
