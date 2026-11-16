/** @license SPDX-License-Identifier: Apache-2.0 */

import { Download } from "lucide-react";
import type { BitacoraEntry } from "../../shared/lib/types";
import { openDocument } from "../../shared/api/services/storage.service";

interface RutaYoloEvidenceThreadProps {
  entries: BitacoraEntry[];
}

export default function RutaYoloEvidenceThread({
  entries,
}: RutaYoloEvidenceThreadProps) {
  return (
    <section className="rounded-xl border border-brand-200 bg-brand-50/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-3 border-brand-100 border-b pb-3">
        <div>
          <h4 className="font-bold text-brand-950 text-sm">
            Hilo de acciones y evidencias
          </h4>
          <p className="mt-1 text-brand-900/70 text-xs">
            {entries.length} registro{entries.length === 1 ? "" : "s"} asociado
            {entries.length === 1 ? "" : "s"} a este hito.
          </p>
        </div>
      </div>
      <ol className="space-y-3">
        {entries.map((entry, index) => (
          <li
            key={entry.id}
            className="relative rounded-lg border border-neutral-200 bg-white p-3"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700 text-xs">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h5 className="font-semibold text-neutral-900 text-sm">
                    {entry.titulo}
                  </h5>
                  <time
                    className="text-neutral-500 text-xs"
                    dateTime={entry.fecha}
                  >
                    {entry.fecha.slice(0, 10)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-neutral-700 text-xs">
                  {entry.descripcion}
                </p>
                {entry.participantes.length > 0 && (
                  <p className="mt-2 text-neutral-500 text-xs">
                    Responsable: {entry.participantes.join(", ")}
                  </p>
                )}
                {entry.documentoAdjunto && (
                  <button
                    type="button"
                    onClick={() => void openDocument(entry.documentoAdjunto!)}
                    className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-brand-200 px-2.5 py-1.5 font-semibold text-brand-700 text-xs hover:bg-brand-50"
                  >
                    <Download className="size-3.5" aria-hidden="true" />
                    Abrir evidencia adjunta
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
