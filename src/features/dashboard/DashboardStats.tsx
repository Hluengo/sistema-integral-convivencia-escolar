/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type Causa, type TipoInfraccion, type FaseProcedimental, EstadoCausa } from '../../types';
import { getStats, getFaseForEstado } from '../../data';
import {
  Activity,
  FileSearch,
  ShieldAlert,
  CheckCircle,
  BarChart3,
  AlertCircle,
  Inbox,
} from 'lucide-react';
import MetricCard from '../../components/MetricCard';
import SeverityBadge from '../../components/SeverityBadge';
import AnotacionesDashboardStats from '../anotaciones/AnotacionesDashboardStats';
import EmptyState from '../../components/EmptyState';
import { fetchAnnotationStageCounts } from '../../services/annotations.service';
import {
  fetchPublicDashboardKpis,
  type PublicDashboardKpis,
} from '../../shared/api/services/public-dashboard.service';
import { useAuthStore } from '../../stores/authStore';
import {
  createEmptyAnnotationStageCounts,
  type AnnotationStageCounts,
} from '../../shared/lib/domain/annotationStageCounts';

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
          className={`font-bold text-xs tabular-nums ${tipo === 'Leve' ? 'text-leve-600' : tipo === 'Grave' ? 'text-grave-600' : tipo === 'Muy Grave' ? 'text-muygrave-600' : 'text-gravisima-600'}`}
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
          style={{
            color:
              tipo === 'Leve'
                ? '#22c55e'
                : tipo === 'Grave'
                  ? '#f59e0b'
                  : tipo === 'Muy Grave'
                    ? '#f97316'
                    : '#ef4444',
          }}
        />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Cargando indicadores del dashboard">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="card h-28 animate-pulse bg-neutral-100" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="card h-28 animate-pulse bg-neutral-100" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="card h-28 animate-pulse bg-neutral-100" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardStats({ causas, onFaseSelect }: DashboardStatsProps) {
  const authenticatedStats = getStats(causas);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const tenantId = useAuthStore((state) => state.tenantId);

  const authenticatedCauseCounts = useMemo(() => {
    const active = causas.filter(
      (c) =>
        c.estadoActual !== EstadoCausa.CAUSA_CERRADA &&
        c.estadoActual !== EstadoCausa.RESOLUCION_EJECUTORIADA,
    ).length;
    const investigating = causas.filter(
      (c) => getFaseForEstado(c.estadoActual) === 'Investigación',
    ).length;
    const resolved = causas.filter(
      (c) =>
        c.estadoActual === EstadoCausa.CAUSA_CERRADA ||
        c.estadoActual === EstadoCausa.RESOLUCION_EJECUTORIADA,
    ).length;
    return { active, investigating, resolved };
  }, [causas]);

  const publicKpisQuery = useQuery({
    queryKey: ['public-dashboard-kpis'],
    queryFn: fetchPublicDashboardKpis,
    enabled: !isAuthenticated,
  });
  const annotationKpisQuery = useQuery({
    queryKey: ['annotation-stage-kpis', tenantId],
    queryFn: fetchAnnotationStageCounts,
    enabled: isAuthenticated && Boolean(tenantId),
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const publicKpis = publicKpisQuery.data as PublicDashboardKpis | undefined;
  const loading = isAuthenticated
    ? !tenantId || annotationKpisQuery.isLoading
    : publicKpisQuery.isLoading;
  const kpiError = isAuthenticated ? annotationKpisQuery.isError : publicKpisQuery.isError;

  if (loading) return <DashboardSkeleton />;

  const total = isAuthenticated ? authenticatedStats.total : (publicKpis?.totalCauses ?? 0);
  const active = isAuthenticated
    ? authenticatedCauseCounts.active
    : (publicKpis?.activeCauses ?? 0);
  const investigating = isAuthenticated
    ? authenticatedCauseCounts.investigating
    : (publicKpis?.investigationCauses ?? 0);
  const resolved = isAuthenticated
    ? authenticatedCauseCounts.resolved
    : (publicKpis?.resolvedCauses ?? 0);
  const critical = isAuthenticated
    ? authenticatedStats.conPlazoCritico
    : (publicKpis?.criticalAlerts ?? 0);
  const severity = isAuthenticated
    ? authenticatedStats.porGravedad
    : {
        Leve: publicKpis?.leveCount ?? 0,
        Grave: publicKpis?.graveCount ?? 0,
        'Muy Grave': publicKpis?.muyGraveCount ?? 0,
        Gravísima: publicKpis?.gravisimaCount ?? 0,
      };
  const asPendingBreakdown = (value: number) => ({ total: value, pending: value, processed: 0 });
  const annotations: AnnotationStageCounts = isAuthenticated
    ? (annotationKpisQuery.data ?? createEmptyAnnotationStageCounts())
    : {
        sinCarta: asPendingBreakdown(0),
        amonestacion: asPendingBreakdown(publicKpis?.amonestacionCount ?? 0),
        compromiso: asPendingBreakdown(publicKpis?.compromisoCount ?? 0),
        derivacion: asPendingBreakdown(publicKpis?.derivacionCount ?? 0),
      };

  if (!isAuthenticated && total === 0 && !kpiError) {
    return (
      <EmptyState
        icon={Inbox}
        title="No hay causas registradas"
        description="Aún no se han registrado expedientes disciplinarios. Las métricas aparecerán cuando existan causas activas."
      />
    );
  }

  return (
    <section aria-label="Panel de control" className="animate-fade-in space-y-6">
      <div className="stagger-children grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Causas Activas"
          value={active}
          sublabel={`de ${total} totales`}
          icon={Activity}
          iconBg="bg-brand-50"
          iconColor="text-brand-600"
          accentColor="#1d4ed8"
          onClick={() => onFaseSelect('Todas')}
        />
        <MetricCard
          label="En Investigación"
          value={investigating}
          sublabel="Fase de indagación"
          icon={FileSearch}
          iconBg="bg-grave-50"
          iconColor="text-grave-600"
          accentColor="#f59e0b"
          onClick={() => onFaseSelect('Investigación')}
        />
        <MetricCard
          label="Causas Resueltas"
          value={resolved}
          sublabel="Casos cerrados"
          icon={CheckCircle}
          iconBg="bg-leve-50"
          iconColor="text-leve-600"
          accentColor="#22c55e"
        />
        <MetricCard
          label="Alertas Críticas"
          value={critical}
          sublabel="Plazo fatal próximo"
          icon={ShieldAlert}
          iconBg="bg-gravisima-50"
          iconColor="text-gravisima-600"
          accentColor="#ef4444"
          isAlert={critical > 0}
        />
      </div>

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
          <SeverityCard tipo="Leve" count={severity.Leve} total={total} />
          <SeverityCard tipo="Grave" count={severity.Grave} total={total} />
          <SeverityCard tipo="Muy Grave" count={severity['Muy Grave']} total={total} />
          <SeverityCard tipo="Gravísima" count={severity.Gravísima} total={total} />
        </div>
      </div>

      {kpiError ? (
        <div className="flex items-center gap-3 rounded-xl border border-gravisima-200 bg-gravisima-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-gravisima-600" />
          <div>
            <p className="font-semibold text-gravisima-700 text-sm">
              Error al cargar los indicadores
            </p>
            <p className="text-gravisima-600 text-xs">
              No se pudieron obtener las métricas del dashboard.
            </p>
          </div>
        </div>
      ) : (
        <AnotacionesDashboardStats counts={annotations} />
      )}
    </section>
  );
}
