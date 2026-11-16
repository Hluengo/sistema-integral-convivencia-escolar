/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  type Causa,
  type FaseProcedimental,
  EstadoCausa,
} from "../../shared/lib/types";
import { getStats } from "../../shared/lib/data";
import { getCausaOperationalPhase } from "../causas/causaOperationalSummary";
import { getCausaDeadline } from "../causas/causaPresentation";
import {
  Activity,
  CalendarDays,
  AlertCircle,
  Inbox,
  Clock3,
  CheckCircle2,
  GitCompareArrows,
} from "lucide-react";
import MetricCard from "../../shared/ui/MetricCard";
import AnotacionesDashboardStats from "../anotaciones/AnotacionesDashboardStats";
import EmptyState from "../../shared/EmptyState";
import DashboardTrendsPanel from "./DashboardTrendsPanel";
import DashboardPhaseDistribution from "./DashboardPhaseDistribution";
import DashboardSeverityPanel from "./DashboardSeverityPanel";
import DashboardMeasuresPanel from "./DashboardMeasuresPanel";
import DashboardActionQueue from "./DashboardActionQueue";
import {
  fetchAnnualAnnotationTrends,
  fetchAnnotationStageCounts,
  fetchStudentAnnotationRanking,
  fetchTeacherAnnotationRanking,
} from "../../shared/api/services/annotations.service";
import { fetchCourseCartaRanking } from "../../shared/api/services/cartas.service";
import {
  fetchPublicDashboardKpis,
  type PublicDashboardKpis,
} from "../../shared/api/services/public-dashboard.service";
import { useAuthStore } from "../../shared/lib/stores/authStore";
import {
  createEmptyAnnotationStageCounts,
  type AnnotationStageCounts,
} from "../../shared/lib/domain/annotationStageCounts";
import OnboardingChecklist from "../onboarding/OnboardingChecklist";
import type { SidebarView } from "../../widgets/sidebar/Sidebar";
import { fetchOnboardingStatus } from "../../shared/api/services/institution.service";
import {
  buildDashboardTrendSummary,
  getDashboardSchoolYear,
} from "./dashboardTrends";
import { getDashboardActions } from "./dashboardActions";

const DASHBOARD_STALE_TIME_MS = 300_000;

type PhaseFilter = "all" | "onTime" | "toResolve";

function isOpenCausa(causa: Causa) {
  return (
    causa.estadoActual !== EstadoCausa.CAUSA_CERRADA &&
    causa.estadoActual !== EstadoCausa.RESOLUCION_EJECUTORIADA
  );
}

function asPendingBreakdown(value: number) {
  return {
    total: value,
    pending: value,
    processed: 0,
    archived: 0,
  };
}

interface DashboardStatsProps {
  causas: Causa[];
  onFaseSelect: (fase: FaseProcedimental | "Todas") => void;
  onboardingEnabled?: boolean;
  coursesCount?: number;
  onNavigate?: (view: SidebarView) => void;
  onSelectCausa?: (causaId: string) => void;
  privacyMode?: boolean;
}

function DashboardSkeleton() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-label="Cargando indicadores del dashboard"
      aria-live="polite"
    >
      <div
        className="card h-24 animate-pulse bg-neutral-100"
        aria-hidden="true"
      />
      <div
        className="card h-24 animate-pulse bg-neutral-100"
        aria-hidden="true"
      />
      <div
        className="card h-40 animate-pulse bg-neutral-100"
        aria-hidden="true"
      />
      <div className="hidden" aria-hidden="true">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} />
        ))}
      </div>
      <span className="sr-only">Cargando indicadores del dashboard</span>
    </div>
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
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("all");
  const activePhases = useMemo(
    () =>
      causas
        .filter(isOpenCausa)
        .map((causa) => ({ causa, phase: getCausaOperationalPhase(causa) })),
    [causas],
  );
  const onTimeCount = useMemo(
    () =>
      activePhases.filter(
        ({ causa, phase }) =>
          (phase === "Recepción" || phase === "Investigación") &&
          getCausaDeadline(causa).remainingDays >= 0,
      ).length,
    [activePhases],
  );
  const toResolveCount = activePhases.filter(
    ({ phase }) => phase === "Resolución" || phase === "Apelación",
  ).length;
  const visiblePhases = activePhases.filter(({ causa, phase }) => {
    if (phaseFilter === "toResolve")
      return phase === "Resolución" || phase === "Apelación";
    if (phaseFilter === "onTime") {
      return (
        (phase === "Recepción" || phase === "Investigación") &&
        getCausaDeadline(causa).remainingDays >= 0
      );
    }
    return true;
  });
  const criticalPhaseDeadlines = useMemo(
    () =>
      activePhases
        .filter(
          ({ phase }) =>
            phase === "Investigación" ||
            phase === "Resolución" ||
            phase === "Apelación",
        )
        .map(({ causa }) => getCausaDeadline(causa)),
    [activePhases],
  );
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const tenantId = useAuthStore((state) => state.tenantId);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const dashboardSchoolYear = useMemo(() => getDashboardSchoolYear(), []);

  const authenticatedCauseCounts = useMemo(() => {
    const active = causas.filter(isOpenCausa).length;
    const investigating = causas.filter(
      (c) => getCausaOperationalPhase(c) === "Investigación",
    ).length;
    const resolved = causas.filter(
      (c) =>
        c.estadoActual === EstadoCausa.CAUSA_CERRADA ||
        c.estadoActual === EstadoCausa.RESOLUCION_EJECUTORIADA,
    ).length;
    return { active, investigating, resolved };
  }, [causas]);

  const publicKpisQuery = useQuery({
    queryKey: ["public-dashboard-kpis"],
    queryFn: fetchPublicDashboardKpis,
    enabled: !isAuthenticated,
  });
  const annotationKpisQuery = useQuery({
    queryKey: ["annotation-stage-kpis", tenantId],
    queryFn: fetchAnnotationStageCounts,
    enabled: isAuthenticated && Boolean(tenantId),
    staleTime: DASHBOARD_STALE_TIME_MS,
    refetchOnMount: true,
  });
  const courseCartaRankingQuery = useQuery({
    queryKey: ["course-carta-ranking", tenantId],
    queryFn: fetchCourseCartaRanking,
    enabled: isAuthenticated && Boolean(tenantId),
    staleTime: DASHBOARD_STALE_TIME_MS,
    refetchOnMount: true,
  });
  const teacherAnnotationRankingQuery = useQuery({
    queryKey: ["teacher-annotation-ranking", tenantId],
    queryFn: fetchTeacherAnnotationRanking,
    enabled: isAuthenticated && Boolean(tenantId),
    staleTime: DASHBOARD_STALE_TIME_MS,
    refetchOnMount: true,
  });
  const studentAnnotationRankingQuery = useQuery({
    queryKey: ["student-annotation-ranking", tenantId],
    queryFn: fetchStudentAnnotationRanking,
    enabled: isAuthenticated && Boolean(tenantId),
    staleTime: DASHBOARD_STALE_TIME_MS,
    refetchOnMount: true,
  });
  const annualAnnotationTrendsQuery = useQuery({
    queryKey: ["annual-annotation-trends", tenantId, dashboardSchoolYear],
    queryFn: () => {
      if (!tenantId) return Promise.resolve([]);
      return fetchAnnualAnnotationTrends(dashboardSchoolYear, tenantId);
    },
    enabled: isAuthenticated && Boolean(tenantId),
    staleTime: DASHBOARD_STALE_TIME_MS,
    refetchOnMount: true,
  });
  const onboardingStatusQuery = useQuery({
    queryKey: ["onboarding-status", tenantId],
    queryFn: fetchOnboardingStatus,
    enabled: isAuthenticated && Boolean(tenantId),
    staleTime: DASHBOARD_STALE_TIME_MS,
  });
  const publicKpis = publicKpisQuery.data as PublicDashboardKpis | undefined;
  const trendSummary = useMemo(
    () =>
      buildDashboardTrendSummary(
        causas,
        annualAnnotationTrendsQuery.data ?? [],
        undefined,
        6,
      ),
    [causas, annualAnnotationTrendsQuery.data],
  );
  const loading = isAuthenticated
    ? !tenantId || annotationKpisQuery.isLoading
    : publicKpisQuery.isLoading;
  const kpiError = isAuthenticated
    ? annotationKpisQuery.isError
    : publicKpisQuery.isError;
  const cartaRankingError = isAuthenticated
    ? courseCartaRankingQuery.error
    : null;
  const teacherRankingError = isAuthenticated
    ? teacherAnnotationRankingQuery.error
    : null;
  const studentRankingError = isAuthenticated
    ? studentAnnotationRankingQuery.error
    : null;

  if (loading) return <DashboardSkeleton />;

  const total = isAuthenticated
    ? authenticatedStats.total
    : (publicKpis?.totalCauses ?? 0);
  const active = isAuthenticated
    ? authenticatedCauseCounts.active
    : (publicKpis?.activeCauses ?? 0);
  const newThisMonth = isAuthenticated
    ? causas.filter((causa) => {
        const openedAt = new Date(causa.fechaApertura);
        const now = new Date();
        return (
          openedAt.getFullYear() === now.getFullYear() &&
          openedAt.getMonth() === now.getMonth()
        );
      }).length
    : 0;
  const severity = isAuthenticated
    ? authenticatedStats.porGravedad
    : {
        Leve: publicKpis?.leveCount ?? 0,
        Grave: publicKpis?.graveCount ?? 0,
        "Muy Grave": publicKpis?.muyGraveCount ?? 0,
        Gravísima: publicKpis?.gravisimaCount ?? 0,
      };
  const annotations: AnnotationStageCounts = isAuthenticated
    ? (annotationKpisQuery.data ?? createEmptyAnnotationStageCounts())
    : {
        sinCarta: asPendingBreakdown(0),
        amonestacion: asPendingBreakdown(publicKpis?.amonestacionCount ?? 0),
        compromiso: asPendingBreakdown(publicKpis?.compromisoCount ?? 0),
        derivacion: asPendingBreakdown(publicKpis?.derivacionCount ?? 0),
      };
  const closed = isAuthenticated
    ? authenticatedCauseCounts.resolved
    : Math.max(total - active, 0);
  const closureRate = total > 0 ? Math.round((closed / total) * 100) : 0;
  const overdueDeadlines = isAuthenticated
    ? criticalPhaseDeadlines.filter((deadline) => deadline.remainingDays < 0)
        .length
    : 0;
  const dueWithin48Hours = isAuthenticated
    ? criticalPhaseDeadlines.filter(
        (deadline) =>
          deadline.remainingDays >= 0 && deadline.remainingDays <= 2,
      ).length
    : 0;
  const withoutDelay = isAuthenticated
    ? criticalPhaseDeadlines.filter((deadline) => deadline.remainingDays >= 0)
        .length
    : 0;
  const investigatingCount = isAuthenticated
    ? authenticatedCauseCounts.investigating
    : (publicKpis?.investigationCauses ?? 0);
  const resolvingCount = isAuthenticated
    ? toResolveCount
    : Math.max(active - investigatingCount, 0);
  const negativeAnnotations = trendSummary.negativeAnnotationTotal;
  const positiveAnnotations = trendSummary.positiveAnnotationTotal;

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
    <section
      aria-label="Panel de control"
      className="animate-fade-in space-y-6 pb-8"
    >
      {onboardingEnabled && tenantId && userId && onNavigate ? (
        <OnboardingChecklist
          tenantId={tenantId}
          userId={userId}
          coursesCount={coursesCount}
          readiness={onboardingStatusQuery.data}
          onNavigate={onNavigate}
        />
      ) : null}
      {isAuthenticated ? (
        <DashboardActionQueue
          actions={dashboardActions}
          privacyMode={privacyMode}
          onOpen={
            onSelectCausa
              ? (causaId) => {
                  onSelectCausa(causaId);
                  onNavigate?.("causas");
                }
              : undefined
          }
          onViewAll={onNavigate ? () => onNavigate("causas") : undefined}
        />
      ) : null}

      <section
        aria-label="Resumen ejecutivo"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          label="Casos ingresados"
          value={total}
          sublabel="Total de expedientes del ciclo"
          icon={GitCompareArrows}
          iconBg="bg-brand-50"
          iconColor="text-brand-600"
          accentColor="#006194"
          valueAside={
            <span className="rounded-full bg-brand-50 px-2 py-1 font-bold text-[11px] text-brand-700">
              +{newThisMonth} ingresados este mes
            </span>
          }
          footer={
            <div className="grid grid-cols-2 gap-2 text-neutral-600 text-[11px]">
              <span className="rounded-md bg-slate-50 px-2 py-1.5">
                <strong className="text-neutral-900">{closed}</strong>{" "}
                expedientes cerrados
              </span>
              <span className="rounded-md bg-slate-50 px-2 py-1.5">
                Tasa cierre:{" "}
                <strong className="text-neutral-900">{closureRate}%</strong>
              </span>
            </div>
          }
        />
        <MetricCard
          label="Casos abiertos"
          value={active}
          sublabel={`de ${total} expedientes ingresados`}
          icon={Activity}
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
          accentColor="#64748b"
          onClick={() => onFaseSelect("Todas")}
          footer={
            <div className="grid grid-cols-2 gap-2 text-neutral-600 text-[11px]">
              <span className="rounded-md bg-slate-50 px-2 py-1.5">
                <strong className="text-neutral-900">
                  {investigatingCount}
                </strong>{" "}
                en etapa de investigación
              </span>
              <span className="rounded-md bg-slate-50 px-2 py-1.5">
                <strong className="text-neutral-900">{resolvingCount}</strong>{" "}
                en resolución o apelación
              </span>
            </div>
          }
        />
        <MetricCard
          label="Anotaciones en seguimiento"
          value={trendSummary.annotationTotal}
          valueAside={
            <span className="font-medium text-neutral-600 text-[11px]">
              Estudiantes en seguimiento
            </span>
          }
          sublabel="Anotaciones de estudiantes ingresados al seguimiento"
          icon={CalendarDays}
          iconBg="bg-muygrave-50"
          iconColor="text-muygrave-600"
          accentColor="#4648d4"
          footer={
            <div className="grid grid-cols-2 gap-2 text-center font-semibold text-[11px]">
              <span className="rounded-md bg-gravisima-50 px-2 py-1.5 text-gravisima-700">
                {negativeAnnotations} negativas
              </span>
              <span className="rounded-md bg-leve-50 px-2 py-1.5 text-leve-700">
                {positiveAnnotations} positivas
              </span>
            </div>
          }
        />
        <MetricCard
          label="Plazos por etapa procesal"
          value={overdueDeadlines}
          valueAside={
            <span className="rounded-full bg-leve-50 px-2 py-1 font-bold text-[11px] text-leve-700">
              {overdueDeadlines > 0 ? "Vencidos" : "Sin vencidos"}
            </span>
          }
          sublabel="Investigación, resolución y apelación"
          icon={overdueDeadlines > 0 ? Clock3 : CheckCircle2}
          iconBg={overdueDeadlines > 0 ? "bg-gravisima-50" : "bg-leve-50"}
          iconColor={
            overdueDeadlines > 0 ? "text-gravisima-600" : "text-leve-600"
          }
          accentColor={overdueDeadlines > 0 ? "#ef4444" : "#16a34a"}
          isAlert={overdueDeadlines > 0}
          footer={
            <div className="grid grid-cols-2 gap-2 text-neutral-600 text-[11px]">
              <span className="rounded-md bg-slate-50 px-2 py-1.5">
                <strong className="text-neutral-900">{dueWithin48Hours}</strong>{" "}
                vencen en 48 h
              </span>
              <span className="rounded-md bg-slate-50 px-2 py-1.5">
                <strong className="text-neutral-900">{withoutDelay}</strong>{" "}
                dentro de plazo
              </span>
            </div>
          }
        />
      </section>

      {isAuthenticated ? (
        <DashboardPhaseDistribution
          activePhases={activePhases}
          visiblePhases={visiblePhases}
          onTimeCount={onTimeCount}
          toResolveCount={toResolveCount}
          phaseFilter={phaseFilter}
          setPhaseFilter={setPhaseFilter}
          onFaseSelect={onFaseSelect}
          onNavigate={onNavigate}
        />
      ) : null}

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <DashboardSeverityPanel severity={severity} total={total} />

        <DashboardMeasuresPanel counts={annotations} />
      </section>

      {kpiError ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-gravisima-200 bg-gravisima-50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-gravisima-600" />
            <div>
              <p className="font-semibold text-neutral-800 text-sm">
                Error al cargar los indicadores
              </p>
              <p className="text-neutral-600 text-xs">
                No se pudieron obtener las métricas del dashboard.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isAuthenticated) void annotationKpisQuery.refetch();
              else void publicKpisQuery.refetch();
            }}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-white px-4 font-semibold text-neutral-800 text-xs ring-1 ring-neutral-200 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Reintentar
          </button>
        </div>
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
        showStage={false}
        courseCartaRanking={courseCartaRankingQuery.data ?? []}
        courseCartaRankingLoading={courseCartaRankingQuery.isLoading}
        courseCartaRankingError={cartaRankingError}
        teacherAnnotationRanking={teacherAnnotationRankingQuery.data ?? []}
        teacherAnnotationRankingLoading={
          teacherAnnotationRankingQuery.isLoading
        }
        teacherAnnotationRankingError={teacherRankingError}
        studentAnnotationRanking={studentAnnotationRankingQuery.data ?? []}
        studentAnnotationRankingLoading={
          studentAnnotationRankingQuery.isLoading
        }
        studentAnnotationRankingError={studentRankingError}
        privacyMode={privacyMode}
      />
    </section>
  );
}
