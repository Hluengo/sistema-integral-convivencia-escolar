/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useEffect, useState } from 'react';
import { type Causa, type TipoInfraccion, type FaseProcedimental, EstadoCausa } from '../types';
import { getStats, getFaseForEstado } from '../data';
import { Activity, FileSearch, ShieldAlert, CheckCircle, BarChart3 } from 'lucide-react';
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
  Leve: { label: 'Leves', dot: 'bg-leve-500' },
  Grave: { label: 'Graves', dot: 'bg-grave-500' },
  'Muy Grave': { label: 'Muy Graves', dot: 'bg-muygrave-500' },
  Gravísima: { label: 'Gravísimas', dot: 'bg-gravisima-500' },
};

function SeverityCard({
  tipo,
  count,
  total,
}: {
  tipo: TipoInfraccion;
  count: number;
  total: number;
}) {
  const cfg = SEVERITY_CONFIG[tipo];
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="card group relative overflow-hidden p-5">
      <div className={`absolute top-0 right-3 left-3 h-[3px] rounded-full ${cfg.dot}`} />

      <div className="mb-3 flex items-center justify-between">
        <SeverityBadge level={tipo} size="sm" />
        <span
          className={`font-bold text-xs tabular-nums ${
            tipo === 'Leve'
              ? 'text-leve-600'
              : tipo === 'Grave'
                ? 'text-grave-600'
                : tipo === 'Muy Grave'
                  ? 'text-muygrave-600'
                  : 'text-gravisima-600'
          }`}
        >
          {percentage}%
        </span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="font-bold text-3xl text-neutral-900 tabular-nums">
          {count < 10 ? `0${count}` : count}
        </span>
        <span className="font-medium text-neutral-400 text-xs">de {total}</span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${cfg.label}: ${percentage}%`}
          className={`h-full rounded-full transition-all duration-500 ${cfg.dot}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function DashboardStats({
  causas,
  onFaseSelect,
  selectedFase: _selectedFase,
}: DashboardStatsProps) {
  const stats = getStats(causas);

  const { totalActivas, enInvestigacion, resueltas } = useMemo(() => {
    const active = causas.filter(
      (c) =>
        c.estadoActual !== EstadoCausa.CAUSA_CERRADA &&
        c.estadoActual !== EstadoCausa.RESOLUCION_EJECUTORIADA
    ).length;

    const investigating = causas.filter(
      (c) => getFaseForEstado(c.estadoActual) === 'Investigación'
    ).length;

    const resolved = causas.filter(
      (c) =>
        c.estadoActual === EstadoCausa.CAUSA_CERRADA ||
        c.estadoActual === EstadoCausa.RESOLUCION_EJECUTORIADA
    ).length;

    return { totalActivas: active, enInvestigacion: investigating, resueltas: resolved };
  }, [causas]);

  const [anotacionesKpis, setAnotacionesKpis] = useState({
    amonestacionCount: 0,
    compromisoCount: 0,
    derivacionCount: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const students = await fetchStudentsWithAnnotationCounts();
        if (cancelled || !students) {
          return;
        }
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
        if (!cancelled) {
          setAnotacionesKpis({
            amonestacionCount: amonestacion,
            compromisoCount: compromiso,
            derivacionCount: derivacion,
          });
        }
      } catch (e) {
        console.error('Error fetching anotaciones KPIs:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-label="Panel de control" className="animate-fade-in space-y-6">
      {/* Key metrics */}
      <div className="stagger-children grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          trend={
            stats.conPlazoCritico > 0 ? { value: 'Requiere acción', positive: false } : undefined
          }
        />
      </div>

      {/* Severity distribution */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-lg bg-neutral-100 p-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
          </div>
          <h3 className="font-semibold text-neutral-500 text-xs uppercase tracking-[0.06em]">
            Distribución por Gravedad
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SeverityCard tipo="Leve" count={stats.porGravedad.Leve} total={stats.total} />
          <SeverityCard tipo="Grave" count={stats.porGravedad.Grave} total={stats.total} />
          <SeverityCard
            tipo="Muy Grave"
            count={stats.porGravedad['Muy Grave']}
            total={stats.total}
          />
          <SeverityCard tipo="Gravísima" count={stats.porGravedad.Gravísima} total={stats.total} />
        </div>
      </div>

      {/* Anotaciones */}
      <AnotacionesDashboardStats
        amonestacionCount={anotacionesKpis.amonestacionCount}
        compromisoCount={anotacionesKpis.compromisoCount}
        derivacionCount={anotacionesKpis.derivacionCount}
      />
    </section>
  );
}
