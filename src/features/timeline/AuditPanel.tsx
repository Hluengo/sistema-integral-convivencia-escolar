/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Sparkles, RefreshCw, FileSignature } from 'lucide-react';
import Button from '@/shared/ui/Button';

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
  CustomMarkdownRenderer,
}: AuditPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2.5 rounded-lg border border-info-200 bg-info-50 p-3 text-left">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-info-600" aria-hidden="true" />
        <div>
          <h4 className="font-semibold text-[11px] text-neutral-900">
            Auditoría de debido proceso
          </h4>
          <p className="mt-0.5 text-[10px] text-neutral-500 leading-relaxed">
            Revisa la coherencia de los hitos con las siete garantías del debido proceso y las
            fuentes jurídicas autorizadas del establecimiento.
          </p>
        </div>
      </div>

      <Button
        type="button"
        onClick={() => void handleRunAudit()}
        disabled={isAuditing}
        fullWidth
        className="rounded-lg px-4 py-2.5 text-xs"
      >
        {isAuditing ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> Analizando
            expediente...
          </>
        ) : (
          <>
            <FileSignature className="h-4 w-4" aria-hidden="true" /> Ejecutar auditoría legal
          </>
        )}
      </Button>

      {auditReport && (
        <div className="max-h-[500px] overflow-y-auto rounded-lg border border-neutral-200 bg-white p-4">
          <CustomMarkdownRenderer text={auditReport} />
        </div>
      )}
    </div>
  );
}
