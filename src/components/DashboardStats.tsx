/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Causa, TipoInfraccion, FaseProcedimental } from '../types';
import { getStats, FASES_LIST, getFaseForEstado } from '../data';
import { 
  BarChart3, Activity, ShieldAlert, CheckCircle, 
  ArrowUp, ArrowDown, Gavel, FileSearch, Clock
} from 'lucide-react';

interface DashboardStatsProps {
  causas: Causa[];
  onFaseSelect: (fase: FaseProcedimental | 'Todas') => void;
  selectedFase: FaseProcedimental | 'Todas';
}

const SEVERITY_CONFIG: Record<TipoInfraccion, { label: string; dot: string; gradient: string }> = {
  'Leve': { label: 'Leves', dot: 'bg-blue-500', gradient: 'from-blue-500/10 via-white to-white' },
  'Grave': { label: 'Graves', dot: 'bg-amber-500', gradient: 'from-amber-500/10 via-white to-white' },
  'Muy Grave': { label: 'Muy Graves', dot: 'bg-purple-500', gradient: 'from-purple-500/10 via-white to-white' },
  'Gravísima': { label: 'Gravísimas', dot: 'bg-red-500', gradient: 'from-red-500/10 via-white to-white' },
};

interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ElementType;
  gradient: string;
  isAlert?: boolean;
  iconBg: string;
  iconColor: string;
}

function MetricCard({ label, value, sublabel, icon: Icon, gradient, isAlert, iconBg, iconColor }: MetricCardProps) {
  return (
    <div className={`relative group bg-white rounded-xl border border-neutral-200/70 p-4 sm:p-5 transition-all duration-300 hover:border-neutral-300/70 hover:shadow-lg active:scale-[0.99] overflow-hidden`}>
      {/* Subtle gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-40`} />
      
      {/* Hover shine effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-[0.08em]">
            {label}
          </span>
          <div className={`p-2 rounded-lg ${iconBg} shadow-sm`}>
            <Icon className={`h-3.5 w-3.5 ${iconColor}`} aria-hidden="true" />
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <span className={`text-2xl sm:text-[28px] font-display font-bold tracking-tight ${isAlert ? 'text-danger-600' : 'text-neutral-900'}`}>
            {typeof value === 'number' && value < 10 ? `0${value}` : value}
          </span>
          {sublabel && (
            <span className="text-[9px] font-medium text-neutral-400 bg-neutral-50 px-2 py-0.5 rounded-md border border-neutral-200/60 shrink-0">
              {sublabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SeverityKpi({ tipo, count }: { tipo: TipoInfraccion; count: number }) {
  const cfg = SEVERITY_CONFIG[tipo];
  return (
    <div className="relative bg-white rounded-xl border border-neutral-200/70 p-3.5 sm:p-4 transition-all duration-300 hover:border-neutral-300/70 hover:shadow-md hover:-translate-y-[1px] overflow-hidden">
      <div className={`absolute top-0 left-3 right-3 h-[3px] rounded-full ${cfg.dot}`} />
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[9px] font-semibold text-neutral-400 uppercase tracking-[0.08em]">{cfg.label}</span>
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
      </div>
      <span className="text-xl sm:text-2xl font-display font-bold text-neutral-900 block">
        {count < 10 ? `0${count}` : count}
      </span>
    </div>
  );
}

export default function DashboardStats({ causas, onFaseSelect, selectedFase }: DashboardStatsProps) {
  const stats = getStats(causas);

  const totalActivas = causas.filter(c => 
    c.estadoActual !== 'Causa Cerrada' && c.estadoActual !== 'Resolución Ejecutoriada'
  ).length;
  const enIndagacion = causas.filter(c => getFaseForEstado(c.estadoActual) === 'Investigación').length;
  const ejecutoriadas = causas.filter(c => 
    c.estadoActual === 'Causa Cerrada' || c.estadoActual === 'Resolución Ejecutoriada'
  ).length;

  function handleKeyDown(e: React.KeyboardEvent, fase: FaseProcedimental | 'Todas') {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onFaseSelect(fase);
    }
  }

  return (
    <section aria-label="Panel de métricas" className="space-y-5 animate-fade-in">
      {/* Main KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Causas activas"
          value={totalActivas}
          sublabel={`de ${stats.total}`}
          icon={Activity}
          gradient="from-brand-500/5 via-white to-white"
          iconBg="bg-brand-50"
          iconColor="text-brand-600"
        />
        <MetricCard
          label="En investigación"
          value={enIndagacion < 10 ? `0${enIndagacion}` : enIndagacion}
          sublabel="Fase 2"
          icon={FileSearch}
          gradient="from-amber-500/5 via-white to-white"
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <MetricCard
          label="Alertas críticas"
          value={stats.conPlazoCritico < 10 ? `0${stats.conPlazoCritico}` : stats.conPlazoCritico}
          sublabel="Plazo fatal"
          icon={ShieldAlert}
          gradient="from-red-500/5 via-white to-white"
          iconBg="bg-red-50"
          iconColor="text-red-600"
          isAlert={stats.conPlazoCritico > 0}
        />
        <MetricCard
          label="Causas resueltas"
          value={ejecutoriadas}
          sublabel="Cerradas"
          icon={CheckCircle}
          gradient="from-emerald-500/5 via-white to-white"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
      </div>

      {/* Severity KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SeverityKpi tipo="Leve" count={stats.porGravedad['Leve']} />
        <SeverityKpi tipo="Grave" count={stats.porGravedad['Grave']} />
        <SeverityKpi tipo="Muy Grave" count={stats.porGravedad['Muy Grave']} />
        <SeverityKpi tipo="Gravísima" count={stats.porGravedad['Gravísima']} />
      </div>

      {/* Phase Pipeline Filter */}
      <div className="bg-white rounded-xl border border-neutral-200/70 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-md bg-brand-50">
            <BarChart3 className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
          </div>
          <h2 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-[0.08em]">
            Fases procedimentales
          </h2>
        </div>

        <div 
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Filtro por fase"
        >
          <button
            onClick={() => onFaseSelect('Todas')}
            onKeyDown={(e) => handleKeyDown(e, 'Todas')}
            role="tab"
            aria-selected={selectedFase === 'Todas'}
            className={`px-3 py-2 text-[11px] font-semibold rounded-lg border transition-all duration-200 cursor-pointer ${
              selectedFase === 'Todas'
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 hover:text-neutral-800 hover:border-neutral-300'
            }`}
          >
            Todas <span className="font-mono ml-1 opacity-70">{stats.total}</span>
          </button>

          {FASES_LIST.map((f, i) => {
            const count = stats.porFase[f.name] || 0;
            const isSelected = selectedFase === f.name;
            return (
              <button
                key={f.name}
                onClick={() => onFaseSelect(f.name)}
                onKeyDown={(e) => handleKeyDown(e, f.name)}
                role="tab"
                aria-selected={isSelected}
                className={`px-3 py-2 text-[11px] font-semibold rounded-lg border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm shadow-brand-600/20'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 hover:text-neutral-800 hover:border-neutral-300'
                }`}
              >
                <span className={isSelected ? 'opacity-70' : 'text-neutral-400'}>{i + 1}.</span> {f.name} <span className="font-mono ml-0.5 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}