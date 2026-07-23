/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { FileText, RefreshCw, FileSignature, Copy } from 'lucide-react';

type DocType = 'notificacion_apertura' | 'citacion_entrevista' | 'informe_cierre_indagacion' | 'informe_concluyente';

type MarkdownRenderer = ({ text }: { text: string }) => React.ReactElement;

interface DraftPanelProps {
  selectedDocType: DocType;
  setSelectedDocType: React.Dispatch<React.SetStateAction<DocType>>;
  fatherName: string;
  setFatherName: React.Dispatch<React.SetStateAction<string>>;
  draftedDocument: string;
  isDrafting: boolean;
  copyFeedback: boolean;
  handleDraftDocument: () => Promise<void>;
  handleCopyToClipboard: () => void;
  CustomMarkdownRenderer: MarkdownRenderer;
}

export default function DraftPanel({
  selectedDocType,
  setSelectedDocType,
  fatherName,
  setFatherName,
  draftedDocument,
  isDrafting,
  copyFeedback,
  handleDraftDocument,
  handleCopyToClipboard,
  CustomMarkdownRenderer
}: DraftPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2.5 rounded-lg border border-brand-200 bg-brand-50 p-3 text-left">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
        <div>
          <h4 className="font-semibold text-[11px] text-neutral-900">Redacción de documentos oficiales</h4>
          <p className="mt-0.5 text-[10px] text-neutral-500 leading-relaxed">
            Genere borradores legales listos para notificar a apoderados y autoridades, cumpliendo con la formalidad de la Circular 482.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="doc-type" className="block font-semibold text-[10px] text-neutral-500 uppercase tracking-wider">
          Tipo de documento
        </label>
        <select
          id="doc-type"
          value={selectedDocType}
          onChange={(e) => setSelectedDocType(e.target.value as typeof selectedDocType)}
          className="w-full rounded-lg border border-neutral-300 bg-white p-2.5 font-medium text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          <option value="notificacion_apertura">Notificación de apertura de investigación</option>
          <option value="citacion_entrevista">Citación a entrevista de descargos</option>
          <option value="informe_cierre_indagacion">Informe de cierre de indagación</option>
          <option value="informe_concluyente">Informe concluyente y resolución final</option>
        </select>
      </div>

      <div>
        <label htmlFor="father-name" className="block font-semibold text-[10px] text-neutral-500 uppercase tracking-wider">
          Nombre del apoderado/tutor
        </label>
<input
  id="father-name" aria-label="Nombre del apoderado o tutor"
  type="text"
  spellCheck={false}
  value={fatherName}
  onChange={(e) => setFatherName(e.target.value)}
  placeholder="Ej. Juan Pérez González"
  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-2.5 font-medium text-neutral-700 text-xs placeholder-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30"
/>
      </div>

      <button
        type="button"
        onClick={handleDraftDocument}
        disabled={isDrafting}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white text-xs transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-400"
      >
        {isDrafting ? (
          <><RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> Redactando documento...</>
        ) : (
          <><FileSignature className="h-4 w-4" aria-hidden="true" /> Generar borrador legal</>
        )}
      </button>

      {draftedDocument && (
        <div className="max-h-[500px] space-y-2 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCopyToClipboard}
              className="flex cursor-pointer items-center gap-1 font-semibold text-[10px] text-brand-600 transition-colors hover:text-brand-700"
            >
              <Copy className="h-3 w-3" aria-hidden="true" />
              {copyFeedback ? '¡Copiado!' : 'Copiar al portapapeles'}
            </button>
          </div>
          <CustomMarkdownRenderer text={draftedDocument} />
        </div>
      )}
    </div>
  );
}
