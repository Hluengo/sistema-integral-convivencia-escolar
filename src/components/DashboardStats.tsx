/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useEffect, useState } from 'react';
import { Causa, TipoInfraccion, FaseProcedimental, EstadoCausa } from '../types';
import { getStats, getFaseForEstado } from '../data';
import { 
  Activity, FileSearch, ShieldAlert, CheckCircle,
  BarChart3
} from 'lucide-react';
import MetricCard from './MetricCard';
import SeverityBadge from './SeverityBadge';
import AnotacionesDashboardStats from './Anotaciones/AnotacionesDashboardStats';
import { fetchStudentsWithAnnotationCounts } from '../lib/supabase';

interface DashboardStatsProps {
  causas: Causa[];
  onFaseSelect: (fase: FaseProcedimental | 'Todas') => void;
  selectedFase: FaseProcedimental | 'Todas';
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
    <div className="relative card p-5 overflow-hidden group">
      <div className={`absolute top-0 left-3 right-3 h-[3px] rounded-full ${cfg.dot}`} />
      
      <div className="flex items-center justify-between mb-3">
        <SeverityBadge level={tipo} size="sm" />
        <span className={`text-xs font-bold tabular-nums ${
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
        <span className="text-xs text-neutral-400 font-medium">
          de {total}
        </span>
      </div>

<div className="mt-3 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${cfg.dot}`}
                              style={{ width: `${percentage}%` }}
                              aria-label={`${cfg.label}: ${percentage}%`}
                            />
                          </div>
    </div>
  );
}

export default function DashboardStats({ causas, onFaseSelect, selectedFase }: DashboardStatsProps) {
  const stats = getStats(causas);

  const { totalActivas, enInvestigacion, resueltas } = useMemo(() => {
    const active = causas.filter(c => 
      c.estadoActual !== EstadoCausa.CAUSA_CERRADA && c.estadoActual !== EstadoCausa.RESOLUCION_EJECUTORIADA
    ).length;
    
    const investigating = causas.filter(c => getFaseForEstado(c.estadoActual) === 'Investigación').length;
    
    const resolved = causas.filter(c => 
      c.estadoActual === EstadoCausa.CAUSA_CERRADA || c.estadoActual === EstadoCausa.RESOLUCION_EJECUTORIADA
    ).length;

    return { totalActivas: active, enInvestigacion: investigating, resueltas: resolved };
  }, [causas]);

  const [anotacionesKpis, setAnotacionesKpis] = useState({ amonestacionCount: 0, compromisoCount: 0, derivacionCount: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const students = await fetchStudentsWithAnnotationCounts();
        if (cancelled || !students) return;
        const amonestacion = students.filter((s: any) => {
          const c = s.annotations_count ?? s.negative_annotations_count ?? 0;
          return c >= 5 && c < 10;
        }).length;
        const compromiso = students.filter((s: any) => {
          const c = s.annotations_count ?? s.negative_annotations_count ?? 0;
          return c >= 10 && c < 15;
        }).length;
        const derivacion = students.filter((s: any) => {
          const c = s.annotations_count ?? s.negative_annotations_count ?? 0;
          return c >= 15;
        }).length;
        if (!cancelled) setAnotacionesKpis({ amonestacionCount: amonestacion, compromisoCount: compromiso, derivacionCount: derivacion });
      } catch (e) {
        console.error('Error fetching anotaciones KPIs:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section aria-label="Panel de control" className="space-y-6 animate-fade-in">

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
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-[0.06em]">
            Distribución por Gravedad
          </h3>
        </div>
      {/* Anotaciones KPIs */}
      <AnotacionesDashboardStats
        amonestacionCount={anotacionesKpis.amonestacionCount}
        compromisoCount={anotacionesKpis.compromisoCount}
        derivacionCount={anotacionesKpis.derivacionCount}
      />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SeverityCard tipo="Leve" count={stats.porGravedad['Leve']} total={stats.total} />
          <SeverityCard tipo="Grave" count={stats.porGravedad['Grave']} total={stats.total} />
          <SeverityCard tipo="Muy Grave" count={stats.porGravedad['Muy Grave']} total={stats.total} />
          <SeverityCard tipo="Gravísima" count={stats.porGravedad['Gravísima']} total={stats.total} />
        </div>
      </div>

    </section>
  );
}





