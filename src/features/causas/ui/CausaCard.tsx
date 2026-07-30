/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { memo } from 'react';
import type { Causa } from '../../../types';
import { getFaseForEstado } from '../../../data';
import { Shield, User, UserCheck, ChevronRight, FileCheck } from 'lucide-react';
import SeverityBadge from '../../../components/SeverityBadge';
import { LeftSeverityBar, FaseBadge, PlazoBar } from '../../../components/CausaCardHelpers';

interface CausaCardProps {
  causa: Causa;
  privacyMode: boolean;
  onSelect: (causa: Causa) => void;
  isSelected: boolean;
}

export default memo(function CausaCard({
  causa,
  privacyMode,
  onSelect,
  isSelected,
}: CausaCardProps) {
  const fase = getFaseForEstado(causa.estadoActual);
  const completedCount = causa.checklistDebidoProceso.filter((c) => c.completado).length;
  const totalCount = causa.checklistDebidoProceso.length;

  return (
    <button
      type="button"
      onClick={() => onSelect(causa)}
      id={`causa_card_${causa.id}`}
      aria-label={`Expediente ${causa.id}: ${privacyMode ? causa.nnaProtectedName : causa.estudianteNombre}, ${causa.estudianteCurso}`}
      className={`card relative w-full overflow-hidden text-left ${
        isSelected ? 'border-l-4 border-l-brand-500 bg-brand-50/30' : ''
      }`}
    >
      <LeftSeverityBar tipo={causa.tipoInfraccion} />

      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-neutral-200/60 bg-neutral-50 px-2 py-0.5 font-mono font-semibold text-[10px] text-neutral-500">
              {causa.id}
            </span>
            <FaseBadge fase={fase} />
            <SeverityBadge level={causa.tipoInfraccion} size="sm" />
          </div>
          {causa.comprometeAulaSegura && (
            <span className="flex shrink-0 items-center gap-1 rounded border border-gravisima-200 bg-gravisima-50 px-1.5 py-0.5 font-bold text-[10px] text-gravisima-600">
              <Shield className="h-2.5 w-2.5" aria-hidden="true" />
              AULA SEGURA
            </span>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="font-bold text-neutral-900 text-sm tracking-tight">
              {privacyMode ? causa.nnaProtectedName : causa.estudianteNombre}
            </h3>
            <span className="shrink-0 rounded border border-neutral-200/60 bg-neutral-50 px-1.5 py-0.5 font-medium text-[10px] text-neutral-400">
              {causa.estudianteCurso}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-neutral-500 text-xs">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3 text-neutral-400" aria-hidden="true" />
              RUN:{' '}
              <span className="font-medium font-mono text-neutral-600">
                {privacyMode ? 'XX.XXX.XXX-X' : causa.runEstudiante}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-neutral-400" aria-hidden="true" />
              <span className="font-medium text-neutral-600">
                {causa.responsable.split(' (')[0]}
              </span>
            </span>
          </div>
        </div>

        <p className="line-clamp-1 border-neutral-200 border-l-2 pl-2.5 text-neutral-500 text-xs italic leading-relaxed">
          {causa.observaciones}
        </p>

        <PlazoBar causa={causa} />

        <div className="space-y-3 border-neutral-100 border-t pt-3">
          <span className="flex items-center gap-1.5 font-medium text-neutral-500 text-xs">
            <FileCheck className="h-3.5 w-3.5 text-leve-600" aria-hidden="true" />
            Debido proceso {completedCount}/{totalCount}
          </span>
          <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-sm text-white shadow-sm transition-colors hover:bg-brand-700">
            Gestionar expediente
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </span>
        </div>
      </div>
    </button>
  );
});
