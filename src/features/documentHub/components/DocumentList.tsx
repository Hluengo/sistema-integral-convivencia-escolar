/** @license SPDX-License-Identifier: Apache-2.0 */

import { memo } from 'react';
import { FolderOpen } from 'lucide-react';
import DocumentCard from './DocumentCard';
import type { UnifiedDocument } from '../types/documentHub.types';

interface DocumentListProps {
  documentos: UnifiedDocument[];
  cargando: boolean;
  onSelectDocument: (doc: UnifiedDocument) => void;
}

function SkeletonCard() {
  return (
    <div className="flex animate-pulse items-center gap-4 rounded-2xl border border-neutral-200/60 bg-white p-5">
      <div className="h-10 w-10 shrink-0 rounded-xl bg-neutral-200" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-48 rounded bg-neutral-200" />
        <div className="h-3 w-64 rounded bg-neutral-100" />
        <div className="flex gap-2">
          <div className="h-4 w-16 rounded-full bg-neutral-100" />
          <div className="h-4 w-20 rounded-full bg-neutral-100" />
        </div>
      </div>
      <div className="h-8 w-20 rounded-lg bg-neutral-100" />
    </div>
  );
}

export default memo(function DocumentList({
  documentos,
  cargando,
  onSelectDocument,
}: DocumentListProps) {
  if (cargando) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={`skel-${i}`} />
        ))}
      </div>
    );
  }

  if (documentos.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-12 text-center shadow-xs">
        <FolderOpen className="mx-auto mb-4 h-12 w-12 text-neutral-300" />
        <h3 className="font-semibold text-neutral-700 text-sm">
          No se encontraron documentos
        </h3>
        <p className="mt-1 text-neutral-400 text-xs">
          No hay documentos que coincidan con los filtros seleccionados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documentos.map((doc) => (
        <DocumentCard
          key={doc.id}
          documento={doc}
          onClick={onSelectDocument}
        />
      ))}
    </div>
  );
});
