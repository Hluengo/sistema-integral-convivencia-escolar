/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo } from 'react';
import { Causa, EstadoCausa } from '../types';
import { getFaseForEstado, FASES_LIST, PHASE_PREFIXES, getPhaseProgress } from '../data';
import { Shield, User, UserCheck, ChevronRight, FileCheck, Check } from 'lucide-react';
import SeverityBadge from './SeverityBadge';
import { LeftSeverityBar, FaseBadge, PlazoBar } from './CausaCardHelpers';

interface CausaCardProps {
  causa: Causa;
  privacyMode: boolean;
  onSelect: (causa: Causa) => void;
  isSelected: boolean;
}

export default memo(function CausaCard({ causa, privacyMode, onSelect, isSelected }: CausaCardProps) {
  const fase = getFaseForEstado(causa.estadoActual);
  const completedCount = causa.checklistDebidoProceso.filter(c => c.completado).length;
  const totalCount = causa.checklistDebidoProceso.length;

  return (
    <button
      type="button"
      onClick={() => onSelect(causa)}
      id={`causa_card_${causa.id}`}
      aria-label={`Expediente ${causa.id}: ${privacyMode ? causa.nnaProtectedName : causa.estudianteNombre}, ${causa.estudianteCurso}`}
      className={`relative w-full card overflow-hidden text-left ${
        isSelected
          ? 'border-l-4 border-l-brand-500 bg-brand-50/30'
          : ''
      }`}
    >
      <LeftSeverityBar tipo={causa.tipoInfraccion} />
      
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-semibold text-neutral-500 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200/60">
              {causa.id}
            </span>
            <FaseBadge fase={fase} />
            <SeverityBadge level={causa.tipoInfraccion} size="sm" />
          </div>
          {causa.comprometeAulaSegura && (
            <span className="text-[10px] font-bold text-gravisima-600 bg-gravisima-50 px-1.5 py-0.5 rounded flex items-center gap-1 border border-gravisima-200 shrink-0">
              <Shield className="h-2.5 w-2.5" aria-hidden="true" />
              AULA SEGURA
            </span>
          )}
        </div>

        <div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-neutral-900 tracking-tight">
              {privacyMode ? causa.nnaProtectedName : causa.estudianteNombre}
            </h3>
            <span className="text-[10px] font-medium text-neutral-400 bg-neutral-50 px-1.5 py-0.5 rounded border border-neutral-200/60 shrink-0">
              {causa.estudianteCurso}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3 text-neutral-400" aria-hidden="true" />
              RUN: <span className="font-mono font-medium text-neutral-600">{privacyMode ? 'XX.XXX.XXX-X' : causa.runEstudiante}</span>
            </span>
            <span className="flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-neutral-400" aria-hidden="true" />
              <span className="text-neutral-600 font-medium">{causa.responsable.split(' (')[0]}</span>
            </span>
          </div>
        </div>

        <p className="text-xs text-neutral-500 leading-relaxed line-clamp-1 border-l-2 border-neutral-200 pl-2.5 italic">
          {causa.observaciones}
        </p>

        <div className="flex items-center gap-0" role="list" aria-label="Progreso de fases">
          {FASES_LIST.map((f, i) => {
            const { total, completed } = getPhaseProgress(causa.checklistDebidoProceso, f.name);
            const isComplete = total > 0 && completed === total;
            const isCurrent = getFaseForEstado(causa.estadoActual) === f.name;
            const isLast = i === FASES_LIST.length - 1;

            return (
              <React.Fragment key={f.name}>
                <div className="flex flex-col items-center" role="listitem">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                      isComplete
                        ? 'bg-brand-600 text-white'
                        : isCurrent
                          ? 'bg-brand-100 text-brand-700 border-2 border-brand-600'
                          : 'bg-white text-neutral-400 border-2 border-neutral-200'
                    }`}
                    aria-label={`${f.name}: ${isComplete ? 'completada' : isCurrent ? 'en curso' : 'pendiente'}`}
                  >
                    {isComplete ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <span className="text-[10px] font-bold">{i + 1}</span>
                    )}
                  </div>
                  <span className="hidden sm:block text-[10px] text-neutral-400 mt-1 whitespace-nowrap">
                    {f.name}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={`h-0.5 flex-1 ${isComplete ? 'bg-brand-400' : 'bg-neutral-200'}`}
                    aria-hidden="true"
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <PlazoBar causa={causa} />

        <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
            <FileCheck className="h-3.5 w-3.5 text-leve-600" aria-hidden="true" />
            Debido proceso {completedCount}/{totalCount}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition-colors">
            Gestionar
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </span>
        </div>
      </div>
    </button>
  );
});
