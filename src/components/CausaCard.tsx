/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Causa, EstadoCausa } from '../types';
import { getFaseForEstado } from '../data';
import { Shield, Clock, User, UserCheck, AlertTriangle, ChevronRight, FileCheck } from 'lucide-react';
import SeverityBadge from './SeverityBadge';
import { getSeverityColor } from './SeverityBadge';

interface CausaCardProps {
  causa: Causa;
  privacyMode: boolean;
  onSelect: (causa: Causa) => void;
  isSelected: boolean;
}

const FASE_BADGE_STYLES: Record<string, string> = {
  'Recepción': 'bg-brand-50 text-brand-700 border-brand-200',
  'Investigación': 'bg-grave-50 text-grave-700 border-grave-200',
  'Resolución': 'bg-leve-50 text-leve-700 border-leve-200',
  'Impugnación': 'bg-muygrave-50 text-muygrave-700 border-muygrave-200',
  'Seguimiento': 'bg-neutral-100 text-neutral-700 border-neutral-200',
};

function LeftSeverityBar({ tipo }: { tipo: Causa['tipoInfraccion'] }) {
  const colors = getSeverityColor(tipo);
  return <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${colors.dot}`} />;
}

function FaseBadge({ fase }: { fase: string }) {
  return (
    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border ${FASE_BADGE_STYLES[fase] || FASE_BADGE_STYLES['Recepción']}`}>
      {fase}
    </span>
  );
}

function PlazoBar({ causa }: { causa: Causa }) {
  const start = new Date(causa.fechaApertura);
  const today = new Date('2026-05-27T14:50:29Z');
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (causa.estadoActual === EstadoCausa.CAUSA_CERRADA) {
    return null;
  }

  let plazoText: string;
  let isAlert = false;
  let colorClasses: string;

  if (causa.comprometeAulaSegura) {
    const remaining = 10 - diffDays;
    if (remaining <= 0) {
      plazoText = 'Plazo Aula Segura excedido';
      isAlert = true;
      colorClasses = 'bg-gravisima-50 text-gravisima-700 border-gravisima-200';
    } else if (remaining <= 2) {
      plazoText = `Vence en ${remaining}d (Aula Segura)`;
      isAlert = true;
      colorClasses = 'bg-grave-50 text-grave-700 border-grave-200';
    } else {
      plazoText = `${remaining}d restantes (Aula Segura)`;
      colorClasses = 'bg-muygrave-50 text-muygrave-700 border-muygrave-200';
    }
  } else if (
    causa.estadoActual === EstadoCausa.RESOLUCION_FINAL_NOTIFICADA || 
    causa.estadoActual === EstadoCausa.EN_PLAZO_APELACION
  ) {
    plazoText = 'Plazo apelación: 2d restantes';
    isAlert = true;
    colorClasses = 'bg-grave-50 text-grave-700 border-grave-200';
  } else {
    const remaining = 60 - diffDays;
    if (remaining <= 0) {
      plazoText = 'Procedimiento excedido';
      isAlert = true;
      colorClasses = 'bg-gravisima-50 text-gravisima-700 border-gravisima-200';
    } else if (remaining <= 10) {
      plazoText = `Vence en ${remaining}d`;
      isAlert = true;
      colorClasses = 'bg-grave-50 text-grave-700 border-grave-200';
    } else {
      plazoText = `${remaining}d para cierre`;
      colorClasses = 'bg-neutral-50 text-neutral-600 border-neutral-200';
    }
  }

  return (
    <div className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] font-medium ${colorClasses}`}>
      <span className="flex items-center gap-1.5">
        <Clock className="h-3 w-3" aria-hidden="true" />
        {plazoText}
      </span>
      {isAlert && <AlertTriangle className="h-3 w-3 text-gravisima-500" aria-hidden="true" />}
    </div>
  );
}

export default function CausaCard({ causa, privacyMode, onSelect, isSelected }: CausaCardProps) {
  const fase = getFaseForEstado(causa.estadoActual);
  const completedCount = causa.checklistDebidoProceso.filter(c => c.completado).length;
  const totalCount = causa.checklistDebidoProceso.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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

        <PlazoBar causa={causa} />

        <div className="pt-2 border-t border-neutral-100">
          <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <FileCheck className="h-3.5 w-3.5 text-leve-600" aria-hidden="true" />
              Debido proceso
            </span>
            <span className="font-mono font-semibold text-neutral-700">
              {completedCount}/{totalCount} ({progress}%)
            </span>
          </div>
          <div
            className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${progress}% completado`}
          >
            <div 
              className="bg-leve-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-end mt-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 group-hover:text-brand-700 transition-colors">
              Gestionar
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
