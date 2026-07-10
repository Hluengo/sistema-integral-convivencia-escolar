import React from 'react';
import { Causa, EstadoCausa } from '../types';
import { Clock, AlertTriangle } from 'lucide-react';
import { getSeverityColor } from '../lib/severityUtils';
import { remainingProcedureDays } from '../lib/dateUtils';

const FASE_BADGE_STYLES: Record<string, string> = {
  'Recepción': 'bg-brand-50 text-brand-700 border-brand-200',
  'Investigación': 'bg-grave-50 text-grave-700 border-grave-200',
  'Resolución': 'bg-leve-50 text-leve-700 border-leve-200',
  'Impugnación': 'bg-muygrave-50 text-muygrave-700 border-muygrave-200',
  'Seguimiento': 'bg-neutral-100 text-neutral-700 border-neutral-200',
};

export function LeftSeverityBar({ tipo }: { tipo: Causa['tipoInfraccion'] }) {
  const colors = getSeverityColor(tipo);
  return <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${colors.dot}`} />;
}

export function FaseBadge({ fase }: { fase: string }) {
  return (
    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border ${FASE_BADGE_STYLES[fase] || FASE_BADGE_STYLES['Recepción']}`}>
      {fase}
    </span>
  );
}

export function PlazoBar({ causa }: { causa: Causa }) {
  if (causa.estadoActual === EstadoCausa.CAUSA_CERRADA) {
    return null;
  }

  let plazoText: string;
  let isAlert = false;
  let colorClasses: string;

  if (causa.comprometeAulaSegura) {
    const remaining = remainingProcedureDays(causa.fechaApertura, 10);
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
    const remaining = remainingProcedureDays(causa.fechaApertura, 60);
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
