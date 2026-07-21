/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Sparkles, RefreshCw, FileSignature } from 'lucide-react';

type MarkdownRenderer = ({ text }: { text: string }) => React.ReactElement;

interface AuditPanelProps {
  auditReport: string;
  isAuditing: boolean;
  handleRunAudit: () => Promise<void>;
  CustomMarkdownRenderer: MarkdownRenderer;
}

export default function AuditPanel({
  auditReport,
  isAuditing,
  handleRunAudit,
  CustomMarkdownRenderer
}: AuditPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2.5 rounded-lg border border-info-200 bg-info-50 p-3 text-left">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-info-600" aria-hidden="true" />
        <div>
          <h4 className="font-semibold text-[11px] text-neutral-900">Auditoría de debido proceso</h4>
          <p className="mt-0.5 text-[10px] text-neutral-500 leading-relaxed">
            Analice el cumplimiento normativo del expediente según la Circular 482, Ley 21809 y Ley Aula Segura. El asistente identificará brechas y emitirá recomendaciones.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleRunAudit}
        disabled={isAuditing}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white text-xs transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-400"
      >
        {isAuditing ? (
          <><RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> Analizando expediente...</>
        ) : (
          <><FileSignature className="h-4 w-4" aria-hidden="true" /> Ejecutar auditoría legal</>
        )}
      </button>

      {auditReport && (
        <div className="max-h-[500px] overflow-y-auto rounded-lg border border-neutral-200 bg-white p-4">
          <CustomMarkdownRenderer text={auditReport} />
        </div>
      )}
    </div>
  );
}
