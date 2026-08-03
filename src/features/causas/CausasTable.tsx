/** @license SPDX-License-Identifier: Apache-2.0 */

import { memo } from 'react';
import { ChevronRight, Clock, Shield } from 'lucide-react';
import type { Causa, TipoInfraccion } from '../../shared/lib/types';
import { getCausaDeadline, getCausaPhase, getCausaStatus } from './causaPresentation';

interface CausasTableProps {
  causas: Causa[];
  privacyMode: boolean;
  onSelectCausa: (causa: Causa) => void;
}

const severityClasses: Record<TipoInfraccion, string> = {
  Leve: 'bg-leve-100 text-leve-700',
  Grave: 'bg-grave-100 text-grave-700',
  'Muy Grave': 'bg-muygrave-100 text-muygrave-700',
  Gravísima: 'bg-gravisima-100 text-gravisima-700',
};

function StudentName({ causa, privacyMode }: { causa: Causa; privacyMode: boolean }) {
  return (
    <>
      <span className="font-semibold text-neutral-900">
        {privacyMode ? causa.nnaProtectedName : causa.estudianteNombre}
      </span>
      {!privacyMode && causa.runEstudiante && (
        <span className="font-mono text-neutral-600 text-xs">{causa.runEstudiante}</span>
      )}
    </>
  );
}

function Deadline({ causa }: { causa: Causa }) {
  const deadline = getCausaDeadline(causa);
  const tone =
    deadline.tone === 'overdue'
      ? 'bg-gravisima-50 text-gravisima-700 ring-gravisima-200'
      : deadline.tone === 'warning'
        ? 'bg-grave-50 text-grave-700 ring-grave-200'
        : 'bg-neutral-50 text-neutral-600 ring-neutral-200';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-xs ring-1 ${tone}`}
    >
      <Clock className="size-3.5" aria-hidden="true" />
      {deadline.text}
    </span>
  );
}

export default memo(function CausasTable({ causas, privacyMode, onSelectCausa }: CausasTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200/60 bg-white shadow-sm">
      <div className="divide-y divide-neutral-100 md:hidden">
        {causas.map((causa) => (
          <button
            key={causa.id}
            type="button"
            onClick={() => onSelectCausa(causa)}
            className="block w-full space-y-3 p-4 text-left transition-colors hover:bg-brand-50/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
            aria-label={`Gestionar expediente ${causa.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <StudentName causa={causa} privacyMode={privacyMode} />
                <span className="text-neutral-600 text-xs">
                  {causa.estudianteCurso || 'Sin curso'}
                </span>
              </div>
              <ChevronRight className="size-5 shrink-0 text-brand-600" aria-hidden="true" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-semibold text-brand-700 text-xs">{causa.id}</span>
              <span
                className={`rounded-full px-2 py-0.5 font-semibold text-xs ${severityClasses[causa.tipoInfraccion]}`}
              >
                {causa.comprometeAulaSegura ? 'Aula Segura' : causa.tipoInfraccion}
              </span>
              <span className="rounded-md bg-neutral-100 px-2 py-1 font-medium text-neutral-700 text-xs">
                {getCausaPhase(causa)}
              </span>
              <Deadline causa={causa} />
              <span className="rounded-full bg-leve-100 px-2 py-0.5 font-medium text-leve-700 text-xs">
                {getCausaStatus(causa)}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full">
          <thead className="border-neutral-200/60 border-b bg-neutral-50">
            <tr>
              {[
                'Estudiante',
                'Curso',
                'Expediente',
                'Tipificación',
                'Fase actual',
                'Días para cierre',
                'Estado',
                'Acción',
              ].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-left font-semibold text-neutral-600 text-xs uppercase tracking-wider"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {causas.map((causa) => (
              <tr
                key={causa.id}
                onClick={() => onSelectCausa(causa)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectCausa(causa);
                  }
                }}
                tabIndex={0}
                className="cursor-pointer transition-colors hover:bg-brand-50/50 focus:bg-brand-50 focus:outline-none"
                aria-label={`Gestionar expediente ${causa.id}`}
              >
                <td className="px-4 py-3 text-sm">
                  <div className="flex min-w-48 flex-col">
                    <StudentName causa={causa} privacyMode={privacyMode} />
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-neutral-600 text-sm">
                  {causa.estudianteCurso || '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-brand-700 text-sm">
                  {causa.id}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold text-xs ${severityClasses[causa.tipoInfraccion]}`}
                  >
                    {causa.comprometeAulaSegura && <Shield className="size-3" aria-hidden="true" />}
                    {causa.comprometeAulaSegura ? 'Aula Segura' : causa.tipoInfraccion}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">{getCausaPhase(causa)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <Deadline causa={causa} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <span className="rounded-full bg-leve-100 px-2.5 py-0.5 font-medium text-leve-700 text-xs">
                    {getCausaStatus(causa)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectCausa(causa);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-semibold text-brand-700 text-xs hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    aria-label={`Gestionar expediente ${causa.id}`}
                  >
                    Gestionar <ChevronRight className="size-3.5" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
