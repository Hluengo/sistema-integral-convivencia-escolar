/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
    <div className="card space-y-2 p-4">
      <h4 className="flex items-center gap-1.5 font-semibold text-[11px] text-neutral-900">
        <FolderOpen className="h-4 w-4 text-brand-600" aria-hidden="true" />
        Documentos adjuntos del expediente
      </h4>
      <div className="space-y-1.5">
        {documents.map((doc) => (
          <div
            key={doc.name}
            className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-[11px] text-neutral-800">{doc.name}</p>
              <p className="truncate text-[9px] text-neutral-500">{doc.url}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[10px] text-brand-700 hover:underline"
              >
                Abrir
              </a>
              <button
                type="button"
                onClick={() => onRemoveDocument(doc.itemId ?? '', doc.name)}
                className="font-semibold text-[10px] text-danger-600 hover:underline"
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
