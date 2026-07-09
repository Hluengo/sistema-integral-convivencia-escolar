/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FolderOpen } from 'lucide-react';

interface AttachedDocumentsProps {
  documents: { name: string; url: string; itemId?: string }[];
  documentError: string | null;
  onRemoveDocument: (itemId: string, fileName?: string) => Promise<void>;
}

export default function AttachedDocuments({
  documents,
  documentError,
  onRemoveDocument,
}: AttachedDocumentsProps) {
  return (
    <div className="card p-4 space-y-2">
      <h4 className="text-[11px] font-semibold text-neutral-900 flex items-center gap-1.5">
        <FolderOpen className="h-4 w-4 text-brand-600" aria-hidden="true" />
        Documentos adjuntos del expediente
      </h4>
      <div className="space-y-1.5">
        {documents.map((doc) => (
          <div
            key={doc.name}
            className="flex items-center justify-between gap-2 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-neutral-800 truncate">{doc.name}</p>
              <p className="text-[9px] text-neutral-500 truncate">{doc.url}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-brand-700 font-semibold hover:underline"
              >
                Abrir
              </a>
              <button
                type="button"
                onClick={() => onRemoveDocument(doc.itemId ?? '', doc.name)}
                className="text-[10px] text-danger-600 font-semibold hover:underline"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
      {documentError && <p className="text-[10px] text-danger-600">{documentError}</p>}
    </div>
  );
}
