/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useEffect, useState } from 'react';
import { type Causa, type TipoInfraccion, type FaseProcedimental, EstadoCausa } from '../types';
import { getStats, getFaseForEstado } from '../data';
import { Activity, FileSearch, ShieldAlert, CheckCircle, BarChart3, AlertCircle, Inbox } from 'lucide-react';
import MetricCard from './MetricCard';
import SeverityBadge from './SeverityBadge';
import AnotacionesDashboardStats from './Anotaciones/AnotacionesDashboardStats';
import { countByStage } from '../domain/disciplinaryStatus';
import EmptyState from './EmptyState';
import { fetchAnnotationStageCounts } from '../lib/supabase';

interface DashboardStatsProps {
  causas: Causa[];
  onFaseSelect: (fase: FaseProcedimental | 'Todas') => void;
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
        <progress
          value={percentage}
          max={100}
          aria-label={`${cfg.label}: ${percentage}%`}
          className="h-full w-full appearance-none rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-current"
          style={{ color: tipo === 'Leve' ? '#22c55e' : tipo === 'Grave' ? '#f59e0b' : tipo === 'Muy Grave' ? '#f97316' : '#ef4444' }}
        />
      </div>
    </div>
  );
}

export default function DashboardStats({
  causas,
  onFaseSelect,
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
  const [kpiError, setKpiError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setKpiError(false);
    (async () => {
      try {
        const counts = await fetchAnnotationStageCounts();
        if (!cancelled) {
          setAnotacionesKpis(counts);
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Error fetching anotaciones KPIs:', e);
          setKpiError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (causas.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No hay causas registradas"
        description="Aún no se han registrado expedientes disciplinarios. Las métricas del dashboard aparecerán cuando existan causas activas."
      />
    );
  }

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
      {kpiError ? (
        <div className="flex items-center gap-3 rounded-xl border border-gravisima-200 bg-gravisima-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-gravisima-600" />
          <div>
            <p className="font-semibold text-gravisima-700 text-sm">Error al cargar KPIs de anotaciones</p>
            <p className="text-gravisima-600 text-xs">No se pudieron obtener las métricas de anotaciones de estudiantes. Verifica la conexión con la base de datos.</p>
          </div>
        </div>
      ) : (
        <AnotacionesDashboardStats
          amonestacionCount={anotacionesKpis.amonestacionCount}
          compromisoCount={anotacionesKpis.compromisoCount}
          derivacionCount={anotacionesKpis.derivacionCount}
        />
      )}
    </section>
  );
}
