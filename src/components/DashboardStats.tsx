/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Causa, TipoInfraccion, FaseProcedimental } from '../types';
import { getStats, getFaseForEstado } from '../data';
import { 
  Activity, FileSearch, ShieldAlert, CheckCircle,
  BarChart3, Plus, CalendarDays
} from 'lucide-react';
import MetricCard from './MetricCard';
import SeverityBadge from './SeverityBadge';

interface DashboardStatsProps {
  causas: Causa[];
  onFaseSelect: (fase: FaseProcedimental | 'Todas') => void;
  selectedFase: FaseProcedimental | 'Todas';
  onSelectCausa: (causaId: string) => void;
  onCreateCausa: () => void;
}

const SEVERITY_CONFIG: Record<TipoInfraccion, { label: string; dot: string }> = {
  'Leve': { label: 'Leves', dot: 'bg-leve-500' },
  'Grave': { label: 'Graves', dot: 'bg-grave-500' },
  'Muy Grave': { label: 'Muy Graves', dot: 'bg-muygrave-500' },
  'Gravísima': { label: 'Gravísimas', dot: 'bg-gravisima-500' },
};

function SeverityCard({ tipo, count, total }: { tipo: TipoInfraccion; count: number; total: number }) {
  const cfg = SEVERITY_CONFIG[tipo];
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="relative card p-4 overflow-hidden group">
      <div className={`absolute top-0 left-3 right-3 h-[3px] rounded-full ${cfg.dot}`} />
      
      <div className="flex items-center justify-between mb-3">
        <SeverityBadge level={tipo} size="sm" />
        <span className={`text-[10px] font-bold tabular-nums ${
          tipo === 'Leve' ? 'text-leve-600' :
          tipo === 'Grave' ? 'text-grave-600' :
          tipo === 'Muy Grave' ? 'text-muygrave-600' :
          'text-gravisima-600'
        }`}>
          {percentage}%
        </span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold text-neutral-900 tabular-nums">
          {count < 10 ? `0${count}` : count}
        </span>
        <span className="text-[11px] text-neutral-400 font-medium">
          de {total}
        </span>
      </div>

      <div className="mt-3 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${cfg.dot}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${cfg.label}: ${percentage}%`}
        />
      </div>
    </div>
  );
}

export default function DashboardStats({ causas, onFaseSelect, selectedFase, onSelectCausa, onCreateCausa }: DashboardStatsProps) {
  const stats = getStats(causas);

  const totalActivas = causas.filter(c => 
    c.estadoActual !== 'Causa Cerrada' && c.estadoActual !== 'Resolución Ejecutoriada'
  ).length;
  
  const enInvestigacion = causas.filter(c => getFaseForEstado(c.estadoActual) === 'Investigación').length;
  
  const resueltas = causas.filter(c => 
    c.estadoActual === 'Causa Cerrada' || c.estadoActual === 'Resolución Ejecutoriada'
  ).length;

  const todayLabel = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <section aria-label="Panel de control" className="space-y-6 animate-fade-in">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-6 sm:p-8 text-white shadow-lg">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60" aria-hidden="true" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-blue-200/80 text-xs font-semibold uppercase tracking-wider mb-1">
              SigueAula · Convivencia Escolar
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Panel de Control</h2>
            <p className="text-blue-100/80 text-sm mt-2 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="capitalize">{todayLabel}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onCreateCausa}
            className="inline-flex items-center justify-center gap-2 bg-secondary-500 text-white font-semibold px-5 py-3 rounded-xl hover:bg-secondary-600 active:scale-[0.97] transition-all shadow-md shadow-secondary-500/30 shrink-0"
            aria-label="Crear nueva causa"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Crear Nueva Causa
          </button>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <MetricCard
          label="Causas Activas"
          value={totalActivas}
          sublabel={`de ${stats.total} totales`}
          icon={Activity}
          iconBg="bg-brand-50"
          iconColor="text-brand-600"
          accentColor="#1d4ed8"
          trend={{ value: '+12%', positive: true }}
          onClick={() => onFaseSelect('Todas')}
        />
        <MetricCard
          label="En Investigación"
          value={enInvestigacion}
          sublabel="Fase de indagación"
          icon={FileSearch}
          iconBg="bg-grave-50"
          iconColor="text-grave-600"
          accentColor="#f59e0b"
          onClick={() => onFaseSelect('Investigación')}
        />
        <MetricCard
          label="Causas Resueltas"
          value={resueltas}
          sublabel="Casos cerrados"
          icon={CheckCircle}
          iconBg="bg-leve-50"
          iconColor="text-leve-600"
          accentColor="#22c55e"
          trend={{ value: '+8%', positive: true }}
        />
        <MetricCard
          label="Alertas Críticas"
          value={stats.conPlazoCritico}
          sublabel="Plazo fatal próximo"
          icon={ShieldAlert}
          iconBg="bg-gravisima-50"
          iconColor="text-gravisima-600"
          accentColor="#ef4444"
          isAlert={stats.conPlazoCritico > 0}
          trend={stats.conPlazoCritico > 0 ? { value: 'Requiere acción', positive: false } : undefined}
        />
      </div>

      {/* Severity distribution */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-neutral-100">
            <BarChart3 className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
          </div>
          <h3 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-[0.06em]">
            Distribución por Gravedad
          </h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SeverityCard tipo="Leve" count={stats.porGravedad['Leve']} total={stats.total} />
          <SeverityCard tipo="Grave" count={stats.porGravedad['Grave']} total={stats.total} />
          <SeverityCard tipo="Muy Grave" count={stats.porGravedad['Muy Grave']} total={stats.total} />
          <SeverityCard tipo="Gravísima" count={stats.porGravedad['Gravísima']} total={stats.total} />
        </div>
      </div>

      {/* Phase pipeline */}
      <div className="card p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-lg bg-brand-50">
            <Activity className="h-4 w-4 text-brand-600" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Fases Procedimentales</h3>
            <p className="text-[11px] text-neutral-400 font-medium">
              Filtra las causas por etapa del proceso
            </p>
          </div>
        </div>

        <div 
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Filtro por fase procedimental"
        >
          <button
            type="button"
            onClick={() => onFaseSelect('Todas')}
            role="tab"
            aria-selected={selectedFase === 'Todas'}
            className={`px-4 py-2.5 text-[12px] font-semibold rounded-xl border transition-all duration-200 cursor-pointer ${
              selectedFase === 'Todas'
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 hover:text-neutral-800 hover:border-neutral-300'
            }`}
          >
            Todas <span className="font-mono ml-1 opacity-70">{stats.total}</span>
          </button>

          {(['Recepción', 'Investigación', 'Resolución', 'Impugnación', 'Seguimiento'] as const).map((fase, i) => {
            const count = stats.porFase[fase] || 0;
            const isSelected = selectedFase === fase;
            return (
              <button
                type="button"
                key={fase}
                onClick={() => onFaseSelect(fase)}
                role="tab"
                aria-selected={isSelected}
                className={`px-4 py-2.5 text-[12px] font-semibold rounded-xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm shadow-brand-600/20'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 hover:text-neutral-800 hover:border-neutral-300'
                }`}
              >
                <span className={isSelected ? 'opacity-70' : 'text-neutral-400'}>{i + 1}.</span> {fase}{' '}
                <span className="font-mono ml-0.5 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
