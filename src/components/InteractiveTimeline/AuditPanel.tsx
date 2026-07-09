/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
      <div className="bg-info-50 border border-info-200 p-3 rounded-lg flex items-start gap-2.5 text-left">
        <Sparkles className="h-5 w-5 text-info-600 mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <h4 className="text-[11px] font-semibold text-neutral-900">Auditoría de debido proceso</h4>
          <p className="text-[10px] text-neutral-500 leading-relaxed mt-0.5">
            Analice el cumplimiento normativo del expediente según la Circular 482, Ley 21809 y Ley Aula Segura. El asistente identificará brechas y emitirá recomendaciones.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleRunAudit}
        disabled={isAuditing}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
      >
        {isAuditing ? (
          <><RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> Analizando expediente...</>
        ) : (
          <><FileSignature className="h-4 w-4" aria-hidden="true" /> Ejecutar auditoría legal</>
        )}
      </button>

      {auditReport && (
        <div className="bg-white border border-neutral-200 rounded-lg p-4 max-h-[500px] overflow-y-auto">
          <CustomMarkdownRenderer text={auditReport} />
        </div>
      )}
    </div>
  );
}
