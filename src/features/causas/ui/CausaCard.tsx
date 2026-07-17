/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo } from 'react';
import type { Causa, } from '../../../types';
import { getFaseForEstado, FASES_LIST, getPhaseProgress } from '../../../data';
import { Shield, User, UserCheck, ChevronRight, FileCheck, Check } from 'lucide-react';
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

        <ul className="flex items-center gap-0" aria-label="Progreso de fases">
          {FASES_LIST.map((f, i) => {
            const { total, completed } = getPhaseProgress(causa.checklistDebidoProceso, f.name);
            const isComplete = total > 0 && completed === total;
            const isCurrent = getFaseForEstado(causa.estadoActual) === f.name;
            const isLast = i === FASES_LIST.length - 1;

            return (
              <React.Fragment key={f.name}>
                <li className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                      isComplete
                        ? 'bg-brand-600 text-white'
                        : isCurrent
                          ? 'border-2 border-brand-600 bg-brand-100 text-brand-700'
                          : 'border-2 border-neutral-200 bg-white text-neutral-400'
                    }`}
                  >
                    {isComplete ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <span className="font-bold text-[10px]">{i + 1}</span>
                    )}
                  </div>
                  <span className="mt-1 hidden whitespace-nowrap text-[10px] text-neutral-400 sm:block">
                    {f.name}
                  </span>
                </li>
                {!isLast && (
                  <div
                    className={`h-0.5 flex-1 ${isComplete ? 'bg-brand-400' : 'bg-neutral-200'}`}
                    aria-hidden="true"
                  />
                )}
              </React.Fragment>
            );
          })}
        </ul>

        <PlazoBar causa={causa} />

        <div className="flex items-center justify-between border-neutral-100 border-t pt-2">
          <span className="flex items-center gap-1.5 font-medium text-neutral-500 text-xs">
            <FileCheck className="h-3.5 w-3.5 text-leve-600" aria-hidden="true" />
            Debido proceso {completedCount}/{totalCount}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-brand-600 text-xs transition-colors">
            Gestionar
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </span>
        </div>
      </div>
    </button>
  );
});
