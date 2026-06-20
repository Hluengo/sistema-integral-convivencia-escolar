/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Clock, ArrowRight } from 'lucide-react';
import { Causa } from '../types';
import { getFaseForEstado } from '../data';

interface ActivityItem {
  id: string;
  type: 'update' | 'create' | 'close' | 'reopen' | 'alert';
  title: string;
  description: string;
  time: string;
  causaId: string;
  severity?: 'Leve' | 'Grave' | 'Muy Grave' | 'Gravísima';
}

interface ActivityFeedProps {
  causas: Causa[];
  onSelectCausa: (causaId: string) => void;
}

const SEVERITY_DOT: Record<string, string> = {
  'Leve': 'bg-leve-500',
  'Grave': 'bg-grave-500',
  'Muy Grave': 'bg-muygrave-500',
  'Gravísima': 'bg-gravisima-500',
};

const ACTIVITY_ICONS: Record<string, string> = {
  'update': 'bg-brand-100 text-brand-600',
  'create': 'bg-leve-100 text-leve-600',
  'close': 'bg-neutral-100 text-neutral-600',
  'reopen': 'bg-grave-100 text-grave-600',
  'alert': 'bg-gravisima-100 text-gravisima-600',
};

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem`;
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

function getActivityItems(causas: Causa[]): ActivityItem[] {
  const items: ActivityItem[] = [];
  
  for (const causa of causas.slice(0, 15)) {
    const fase = getFaseForEstado(causa.estadoActual);
    const isClosed = causa.estadoActual === 'Causa Cerrada' || causa.estadoActual === 'Resolución Ejecutoriada';
    
    items.push({
      id: `activity-${causa.id}-status`,
      type: isClosed ? 'close' : 'update',
      title: `Causa ${causa.id}`,
      description: isClosed
        ? `Caso cerrado - Fase final: ${fase}`
        : `Actualizada a "${fase}" por ${causa.responsable?.split(' (')[0] || 'Inspector'}`,
      time: causa.fechaUltimaActualizacion || causa.fechaApertura,
      causaId: causa.id,
      severity: causa.tipoInfraccion,
    });
  }
  
  // Sort by most recent first
  items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  
  return items.slice(0, 5);
}

export default function ActivityFeed({ causas, onSelectCausa }: ActivityFeedProps) {
  const activities = getActivityItems(causas);

  return (
    <div className="card p-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-50">
            <Clock className="h-4 w-4 text-brand-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Actividad Reciente</h3>
            <p className="text-[11px] text-neutral-400 font-medium">
              Últimas 5 acciones del sistema
            </p>
          </div>
        </div>
      </div>

      {/* Activity list */}
      {activities.length > 0 ? (
        <div className="space-y-1">
          {activities.map((activity, index) => (
            <button
              key={activity.id}
              onClick={() => onSelectCausa(activity.causaId)}
              className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-all group text-left"
            >
              {/* Timeline dot + line */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className={`w-2 h-2 rounded-full ${SEVERITY_DOT[activity.severity || 'Grave']} ring-2 ring-white`} />
                {index < activities.length - 1 && (
                  <div className="w-px h-full min-h-[24px] bg-neutral-200" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-3" style={index < activities.length - 1 ? { borderBottom: '1px solid var(--color-neutral-100)' } : {}}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-neutral-900">
                    {activity.title}
                  </span>
                  {activity.severity && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                      activity.severity === 'Leve' ? 'bg-leve-50 text-leve-700' :
                      activity.severity === 'Grave' ? 'bg-grave-50 text-grave-700' :
                      activity.severity === 'Muy Grave' ? 'bg-muygrave-50 text-muygrave-700' :
                      'bg-gravisima-50 text-gravisima-700'
                    }`}>
                      {activity.severity}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-neutral-500 mt-0.5 leading-relaxed">
                  {activity.description}
                </p>
                <span className="text-[10px] text-neutral-400 font-medium mt-1 block">
                  {formatRelativeTime(activity.time)}
                </span>
              </div>

              <ArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-brand-500 transition-colors mt-1.5 shrink-0" />
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Clock className="h-8 w-8 text-neutral-200 mx-auto mb-2" />
          <p className="text-sm text-neutral-400">No hay actividad reciente</p>
        </div>
      )}
    </div>
  );
}