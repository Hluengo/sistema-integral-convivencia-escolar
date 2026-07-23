/** @license SPDX-License-Identifier: Apache-2.0 */

import { FileText, AlertTriangle } from 'lucide-react';

interface GeneratorHeaderProps {
  negativeCount: number;
  semaphoric: { badge: string };
}

export default function GeneratorHeader({
  negativeCount,
  semaphoric: _semaphoric,
}: GeneratorHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
      <div>
        <h3 className="flex items-center gap-2 font-bold text-neutral-900 text-sm">
          <FileText className="h-5 w-5 text-indigo-600" />
          Generación de Documentos Disciplinarios
        </h3>
        <p className="mt-1 text-neutral-500 text-xs">
          Emisión de cartas de amonestación, compromiso conductual y derivación.
        </p>
      </div>
      <div className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 font-semibold text-xs ${negativeCount >= 10 ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          {negativeCount >= 10
            ? `Reiteración de faltas (${negativeCount} negativas)`
            : `Estado: ${negativeCount} anotaciones negativas`}
        </span>
      </div>
    </div>
  );
}
