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
          ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-md'
          : ''
      }`}
    >
      <LeftSeverityBar tipo={causa.tipoInfraccion} />
      
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-semibold text-neutral-500 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200/60">
              {causa.id}
            </span>
            <FaseBadge fase={fase} />
            <SeverityBadge level={causa.tipoInfraccion} size="sm" />
          </div>
          {causa.comprometeAulaSegura && (
            <span className="text-[9px] font-bold text-gravisima-600 bg-gravisima-50 px-1.5 py-0.5 rounded flex items-center gap-1 border border-gravisima-200 shrink-0">
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
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[11px] text-neutral-500">
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

        <p className="text-[11px] text-neutral-500 leading-relaxed line-clamp-1 border-l-2 border-neutral-200 pl-2.5 italic">
          {causa.observaciones}
        </p>

        <div className="flex items-center gap-1.5">
          {FASES_LIST.map((f, i) => {
            const { total, completed } = getPhaseProgress(causa.checklistDebidoProceso, f.name);
            const isComplete = total > 0 && completed === total;
            const progress = total > 0 ? completed / total : 0;
            const isCurrent = getFaseForEstado(causa.estadoActual) === f.name;

            return (
              <div key={f.name} className="relative w-6 h-6" title={`${f.name}: ${completed}/${total}`}>
                <svg className="w-6 h-6 -rotate-90" viewBox="0 0 36 36">
                  <circle
                    className="text-neutral-200"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    cx="18"
                    cy="18"
                    r="15"
                  />
                  <circle
                    className={`${isComplete ? 'text-success-600' : isCurrent ? 'text-brand-600' : 'text-neutral-400'} transition-all duration-500`}
                    strokeWidth="4"
                    strokeDasharray={`${progress * 100}, 100`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    cx="18"
                    cy="18"
                    r="15"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {isComplete ? (
                    <Check className="h-3 w-3 text-success-600" />
                  ) : (
                    <span className={`text-[8px] font-bold ${isCurrent ? 'text-neutral-900' : 'text-neutral-500'}`}>
                      {i + 1}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <PlazoBar causa={causa} />

        <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-medium">
            <FileCheck className="h-3.5 w-3.5 text-leve-600" aria-hidden="true" />
            Debido proceso {completedCount}/{totalCount}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 transition-colors">
            Gestionar
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </span>
        </div>
      </div>
    </button>
  );
});
