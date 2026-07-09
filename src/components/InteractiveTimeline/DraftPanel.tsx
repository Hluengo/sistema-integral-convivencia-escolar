/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
      <div className="bg-brand-50 border border-brand-200 p-3 rounded-lg flex items-start gap-2.5 text-left">
        <FileText className="h-5 w-5 text-brand-600 mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <h4 className="text-[11px] font-semibold text-neutral-900">Redacción de documentos oficiales</h4>
          <p className="text-[10px] text-neutral-500 leading-relaxed mt-0.5">
            Genere borradores legales listos para notificar a apoderados y autoridades, cumpliendo con la formalidad de la Circular 482.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="doc-type" className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
          Tipo de documento
        </label>
        <select
          id="doc-type"
          value={selectedDocType}
          onChange={(e) => setSelectedDocType(e.target.value as typeof selectedDocType)}
          className="w-full text-xs border border-neutral-300 rounded-lg p-2.5 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        >
          <option value="notificacion_apertura">Notificación de apertura de investigación</option>
          <option value="citacion_entrevista">Citación a entrevista de descargos</option>
          <option value="informe_cierre_indagacion">Informe de cierre de indagación</option>
          <option value="informe_concluyente">Informe concluyente y resolución final</option>
        </select>
      </div>

      <div>
        <label htmlFor="father-name" className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
          Nombre del apoderado/tutor
        </label>
<input
  id="father-name"
  type="text"
  spellCheck={false}
  value={fatherName}
  onChange={(e) => setFatherName(e.target.value)}
  placeholder="Ej. Juan Pérez González"
  className="w-full mt-1 text-xs border border-neutral-300 rounded-lg p-2.5 bg-white font-medium text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all"
/>
      </div>

      <button
        type="button"
        onClick={handleDraftDocument}
        disabled={isDrafting}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
      >
        {isDrafting ? (
          <><RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> Redactando documento...</>
        ) : (
          <><FileSignature className="h-4 w-4" aria-hidden="true" /> Generar borrador legal</>
        )}
      </button>

      {draftedDocument && (
        <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-2 max-h-[500px] overflow-y-auto">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCopyToClipboard}
              className="text-[10px] text-brand-600 font-semibold flex items-center gap-1 hover:text-brand-700 transition-all cursor-pointer"
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
