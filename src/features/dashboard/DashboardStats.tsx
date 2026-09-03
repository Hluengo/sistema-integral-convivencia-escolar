/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  type Causa,
  type TipoInfraccion,
  type FaseProcedimental,
  EstadoCausa,
} from '../../shared/lib/types';
import { getStats } from '../../shared/lib/data';
import { getCausaOperationalPhase } from '../causas/causaOperationalSummary';
import {
  Activity,
  FileSearch,
  ShieldAlert,
  CheckCircle,
  BarChart3,
  AlertCircle,
  Inbox,
  ArrowRight,
  Clock3,
} from 'lucide-react';
import MetricCard from '../../shared/ui/MetricCard';
import SeverityBadge from '../../shared/SeverityBadge';
import AnotacionesDashboardStats from '../anotaciones/AnotacionesDashboardStats';
import EmptyState from '../../shared/EmptyState';
import DashboardTrendsPanel from './DashboardTrendsPanel';
import {
  fetchAnnualAnnotationTrends,
  fetchAnnotationStageCounts,
  fetchStudentAnnotationRanking,
  fetchTeacherAnnotationRanking,
} from '../../shared/api/services/annotations.service';
import { fetchCourseCartaRanking } from '../../shared/api/services/cartas.service';
import {
  fetchPublicDashboardKpis,
  type PublicDashboardKpis,
} from '../../shared/api/services/public-dashboard.service';
import { useAuthStore } from '../../shared/lib/stores/authStore';
import {
  createEmptyAnnotationStageCounts,
  type AnnotationStageCounts,
} from '../../shared/lib/domain/annotationStageCounts';
import OnboardingChecklist from '../onboarding/OnboardingChecklist';
import type { SidebarView } from '../../widgets/sidebar/Sidebar';
import { fetchOnboardingStatus } from '../../shared/api/services/institution.service';
import { getDashboardSchoolYear } from './dashboardTrends';
import { getDashboardActions, type DashboardAction } from './dashboardActions';

const DASHBOARD_STALE_TIME_MS = 300_000;

interface DashboardStatsProps {
  causas: Causa[];
  onFaseSelect: (fase: FaseProcedimental | 'Todas') => void;
  onboardingEnabled?: boolean;
  coursesCount?: number;
  onNavigate?: (view: SidebarView) => void;
  onSelectCausa?: (causaId: string) => void;
  privacyMode?: boolean;
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
    <div
      className="space-y-6"
      role="status"
      aria-label="Cargando indicadores del dashboard"
      aria-live="polite"
    >
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
      <span className="sr-only">Cargando indicadores del dashboard</span>
    </div>
  );
}

function DashboardActionQueue({
  actions,
  privacyMode,
  onOpen,
}: {
  actions: DashboardAction[];
  privacyMode: boolean;
  onOpen?: (causaId: string) => void;
}) {
  if (actions.length === 0) {
    return (
      <div className="card flex items-center gap-3 p-4 text-sm text-neutral-600">
        <Clock3 className="size-4 text-leve-600" aria-hidden="true" />
        No hay plazos operativos vencidos o próximos a vencer.
      </div>
    );
  }

  return (
    <section aria-labelledby="dashboard-action-queue-title" className="card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="dashboard-action-queue-title" className="font-semibold text-neutral-900">
            Acciones prioritarias
          </h2>
          <p className="mt-1 text-neutral-500 text-xs">
            Expedientes que requieren atención por plazo.
          </p>
        </div>
        <span className="rounded-full bg-gravisima-50 px-2.5 py-1 font-bold text-gravisima-700 text-xs">
          {actions.length}
        </span>
      </div>
      <div className="divide-y divide-neutral-100">
        {actions.slice(0, 5).map((action) => (
          <div
            key={action.causa.id}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-neutral-900 text-sm">
                {privacyMode ? action.causa.nnaProtectedName : action.causa.estudianteNombre}
              </p>
              <p className="truncate text-neutral-500 text-xs">
                {action.causa.id} · {action.causa.estudianteCurso} · {action.causa.responsable}
              </p>
            </div>
            {onOpen ? (
              <button
                type="button"
                onClick={() => onOpen(action.causa.id)}
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 font-semibold text-brand-700 text-xs hover:bg-brand-50"
                aria-label={`Abrir expediente ${action.causa.id}`}
              >
                <span
                  className={action.urgency === 'overdue' ? 'text-gravisima-700' : 'text-grave-700'}
                >
                  {action.label}
                </span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </button>
            ) : (
              <span className="shrink-0 font-semibold text-gravisima-700 text-xs">
                {action.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DashboardStats({
  causas,
  onFaseSelect,
  onboardingEnabled = false,
  coursesCount = 0,
  onNavigate,
  onSelectCausa,
  privacyMode = false,
}: DashboardStatsProps) {
  const authenticatedStats = getStats(causas);
  const dashboardActions = useMemo(() => getDashboardActions(causas), [causas]);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const tenantId = useAuthStore((state) => state.tenantId);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const dashboardSchoolYear = useMemo(() => getDashboardSchoolYear(), []);

  const authenticatedCauseCounts = useMemo(() => {
    const active = causas.filter(
      (c) =>
        c.estadoActual !== EstadoCausa.CAUSA_CERRADA &&
        c.estadoActual !== EstadoCausa.RESOLUCION_EJECUTORIADA,
    ).length;
    const investigating = causas.filter(
      (c) => getCausaOperationalPhase(c) === 'Investigación',
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
    staleTime: DASHBOARD_STALE_TIME_MS,
    refetchOnMount: true,
  });
  const courseCartaRankingQuery = useQuery({
    queryKey: ['course-carta-ranking', tenantId],
    queryFn: fetchCourseCartaRanking,
    enabled: isAuthenticated && Boolean(tenantId),
    staleTime: DASHBOARD_STALE_TIME_MS,
    refetchOnMount: true,
  });
  const teacherAnnotationRankingQuery = useQuery({
    queryKey: ['teacher-annotation-ranking', tenantId],
    queryFn: fetchTeacherAnnotationRanking,
    enabled: isAuthenticated && Boolean(tenantId),
    staleTime: DASHBOARD_STALE_TIME_MS,
    refetchOnMount: true,
  });
  const studentAnnotationRankingQuery = useQuery({
    queryKey: ['student-annotation-ranking', tenantId],
    queryFn: fetchStudentAnnotationRanking,
    enabled: isAuthenticated && Boolean(tenantId),
    staleTime: DASHBOARD_STALE_TIME_MS,
    refetchOnMount: true,
  });
  const annualAnnotationTrendsQuery = useQuery({
    queryKey: ['annual-annotation-trends', tenantId, dashboardSchoolYear],
    queryFn: () => {
      if (!tenantId) return Promise.resolve([]);
      return fetchAnnualAnnotationTrends(dashboardSchoolYear, tenantId);
    },
    enabled: isAuthenticated && Boolean(tenantId),
    staleTime: DASHBOARD_STALE_TIME_MS,
    refetchOnMount: true,
  });
  const onboardingStatusQuery = useQuery({
    queryKey: ['onboarding-status', tenantId],
    queryFn: fetchOnboardingStatus,
    enabled: isAuthenticated && Boolean(tenantId),
    staleTime: DASHBOARD_STALE_TIME_MS,
  });
  const publicKpis = publicKpisQuery.data as PublicDashboardKpis | undefined;
  const loading = isAuthenticated
    ? !tenantId || annotationKpisQuery.isLoading
    : publicKpisQuery.isLoading;
  const kpiError = isAuthenticated ? annotationKpisQuery.isError : publicKpisQuery.isError;
  const cartaRankingError = isAuthenticated ? courseCartaRankingQuery.error : null;
  const teacherRankingError = isAuthenticated ? teacherAnnotationRankingQuery.error : null;
  const studentRankingError = isAuthenticated ? studentAnnotationRankingQuery.error : null;

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
    ? dashboardActions.filter((action) => action.urgency !== 'warning').length
    : (publicKpis?.criticalAlerts ?? 0);
  const severity = isAuthenticated
    ? authenticatedStats.porGravedad
    : {
        Leve: publicKpis?.leveCount ?? 0,
        Grave: publicKpis?.graveCount ?? 0,
        'Muy Grave': publicKpis?.muyGraveCount ?? 0,
        Gravísima: publicKpis?.gravisimaCount ?? 0,
      };
  const asPendingBreakdown = (value: number) => ({
    total: value,
    pending: value,
    processed: 0,
    archived: 0,
  });
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
      {onboardingEnabled && tenantId && userId && onNavigate ? (
        <OnboardingChecklist
          tenantId={tenantId}
          userId={userId}
          coursesCount={coursesCount}
          readiness={onboardingStatusQuery.data}
          onNavigate={onNavigate}
        />
      ) : null}
      <div className="stagger-children grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Causas Activas"
          value={active}
          sublabel={`de ${total} totales`}
          icon={Activity}
          iconBg="bg-brand-50"
          iconColor="text-brand-600"
          accentColor="#475569"
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
          sublabel="Vencidas o ≤ 2 días"
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
      ) : null}

      {isAuthenticated ? (
        <DashboardActionQueue
          actions={dashboardActions}
          privacyMode={privacyMode}
          onOpen={
            onSelectCausa
              ? (causaId) => {
                  onSelectCausa(causaId);
                  onNavigate?.('causas');
                }
              : undefined
          }
        />
      ) : null}

      {isAuthenticated ? (
        <DashboardTrendsPanel
          causas={causas}
          annotationTrends={annualAnnotationTrendsQuery.data ?? []}
          annotationTrendLoading={annualAnnotationTrendsQuery.isLoading}
          annotationTrendError={annualAnnotationTrendsQuery.error}
        />
      ) : null}

      <AnotacionesDashboardStats
        counts={annotations}
        courseCartaRanking={courseCartaRankingQuery.data ?? []}
        courseCartaRankingLoading={courseCartaRankingQuery.isLoading}
        courseCartaRankingError={cartaRankingError}
        teacherAnnotationRanking={teacherAnnotationRankingQuery.data ?? []}
        teacherAnnotationRankingLoading={teacherAnnotationRankingQuery.isLoading}
        teacherAnnotationRankingError={teacherRankingError}
        studentAnnotationRanking={studentAnnotationRankingQuery.data ?? []}
        studentAnnotationRankingLoading={studentAnnotationRankingQuery.isLoading}
        studentAnnotationRankingError={studentRankingError}
        privacyMode={privacyMode}
      />
    </section>
  );
}
